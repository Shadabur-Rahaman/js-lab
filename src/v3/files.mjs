import { parse } from "acorn";
import { zipSync, Unzip, UnzipInflate, strToU8, strFromU8 } from "fflate";
export function pathName(name) {
  if (
    typeof name !== "string" ||
    !name ||
    name.length > 160 ||
    !/^[a-zA-Z0-9_. /-]+$/.test(name) ||
    name.startsWith("/") ||
    name
      .split("/")
      .some((x) => !x || x === "." || x === ".." || x.startsWith(".")) ||
    name.split("/").length > 7
  )
    throw Error(
      "Use a relative path like js/app.js. Hidden files, traversal and special characters are unsupported.",
    );
  return name;
}
export function resolveFile(from, to) {
  if (typeof to !== "string" || /^(?:[a-z][\w+.-]*:|\/)/i.test(to))
    throw Error("Use a local relative path. External resources are disabled.");
  const parts = from.split("/").slice(0, -1);
  for (const bit of to.split(/[?#]/)[0].split("/")) {
    if (bit === "." || !bit) continue;
    if (bit === "..") {
      if (!parts.length) throw Error("Path escapes the project.");
      parts.pop();
    } else parts.push(decodeURIComponent(bit));
  }
  return pathName(parts.join("/"));
}
export function validateProject(files) {
  if (!files || typeof files !== "object" || Array.isArray(files))
    throw Error("Invalid project files.");
  const entries = Object.entries(files);
  if (entries.length > 40) throw Error("Maximum 40 text files.");
  let total = 0;
  for (const [n, v] of entries) {
    pathName(n);
    if (!/\.(html?|css|js|json|txt|md)$/i.test(n))
      throw Error("Supported project files: HTML, CSS, JS, JSON, TXT and MD.");
    if (typeof v !== "string") throw Error("Files must contain text.");
    const size = strToU8(v).length;
    if (size > 80000) throw Error("Each file must be under 80 KB.");
    total += size;
  }
  if (total > 800000) throw Error("Project must be under 800 KB uncompressed.");
  return files;
}
export function zipProject(files) {
  validateProject(files);
  return zipSync(
    Object.fromEntries(Object.entries(files).map(([n, v]) => [n, strToU8(v)])),
  );
}
export function unzipProject(bytes) {
  if (bytes.length > 1000000) throw Error("ZIP must be under 1 MB.");
  let end = false;
  for (let i = Math.max(0, bytes.length - 65557); i < bytes.length - 3; i++)
    if (
      bytes[i] === 80 &&
      bytes[i + 1] === 75 &&
      bytes[i + 2] === 5 &&
      bytes[i + 3] === 6
    )
      end = true;
  if (!end) throw Error("ZIP appears incomplete.");
  const out = Object.create(null),
    seen = new Set();
  let total = 0,
    active = 0,
    count = 0;
  const unzip = new Unzip((file) => {
    if (++count > 60) throw Error("Too many ZIP entries.");
    if (file.name.endsWith("/")) {
      pathName(file.name.slice(0, -1));
      return;
    }
    const n = pathName(file.name);
    if (seen.has(n)) throw Error("Duplicate ZIP path.");
    seen.add(n);
    if (file.originalSize > 80000) throw Error("Oversized ZIP entry.");
    let size = 0;
    const chunks = [];
    active++;
    file.ondata = (err, chunk, final) => {
      if (err) throw err;
      size += chunk.length;
      total += chunk.length;
      if (size > 80000 || total > 800000) {
        file.terminate();
        throw Error("Expanded ZIP exceeds limits.");
      }
      chunks.push(chunk);
      if (final) {
        const bytes = new Uint8Array(size);
        let at = 0;
        for (const c of chunks) {
          bytes.set(c, at);
          at += c.length;
        }
        out[n] = strFromU8(bytes);
        active--;
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  for (let i = 0; i < bytes.length; i += 1024)
    unzip.push(bytes.subarray(i, i + 1024), i + 1024 >= bytes.length);
  if (active) throw Error("ZIP did not finish decompressing.");
  validateProject(out);
  if (!Object.keys(out).some((n) => /\.html?$/.test(n)))
    throw Error("Include an HTML entry page.");
  return out;
}
export function compileProject(files, entry = "index.html") {
  validateProject(files);
  if (!files[entry]) throw Error("Choose an existing HTML entry page.");
  const doc = new DOMParser().parseFromString(files[entry], "text/html"),
    cache = new Map(),
    visiting = new Set();
  const moduleURL = (name) => {
    if (cache.has(name)) return cache.get(name);
    if (visiting.has(name))
      throw Error(
        "Circular modules are unsupported in this learning workspace.",
      );
    if (!name.endsWith(".js") || typeof files[name] !== "string")
      throw Error("Missing JavaScript module: " + name);
    visiting.add(name);
    const source = files[name],
      ast = parse(source, { ecmaVersion: "latest", sourceType: "module" }),
      edits = [];
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "ImportExpression")
        throw Error(
          "Dynamic import is unsupported in project source; use static relative imports.",
        );
      if (
        node.source &&
        [
          "ImportDeclaration",
          "ExportNamedDeclaration",
          "ExportAllDeclaration",
        ].includes(node.type)
      ) {
        if (!node.source.value.startsWith("."))
          throw Error("Only relative JavaScript module imports are supported.");
        edits.push([
          node.source.start,
          node.source.end,
          JSON.stringify(moduleURL(resolveFile(name, node.source.value))),
        ]);
      }
      for (const [k, v] of Object.entries(node))
        if (k !== "source") {
          if (Array.isArray(v)) v.forEach(walk);
          else if (v && typeof v === "object") walk(v);
        }
    };
    walk(ast);
    let code = source;
    for (const [a, b, v] of edits.sort((a, b) => b[0] - a[0]))
      code = code.slice(0, a) + v + code.slice(b);
    if (code.length > 160000)
      throw Error(
        "Expanded module graph exceeds learning-workspace limits. Reduce nesting or split the exercise.",
      );
    const url =
      "data:text/javascript;charset=utf-8," +
      encodeURIComponent(code + "\n//# sourceURL=project/" + name);
    cache.set(name, url);
    visiting.delete(name);
    return url;
  };
  let css = "";
  for (const link of doc.querySelectorAll('link[rel="stylesheet"]')) {
    const name = resolveFile(entry, link.getAttribute("href"));
    if (!files[name]) throw Error("Missing stylesheet: " + name);
    css += "\n" + files[name];
    link.remove();
  }
  for (const style of doc.querySelectorAll("style")) {
    css += "\n" + style.textContent;
    style.remove();
  }
  let code = "";
  for (const script of doc.querySelectorAll("script")) {
    const src = script.getAttribute("src");
    if (script.type === "module") {
      if (!src) throw Error("Use a separate JS file for module scripts.");
      code +=
        "await import(" +
        JSON.stringify(moduleURL(resolveFile(entry, src))) +
        ");\n";
    } else if (src) {
      const name = resolveFile(entry, src);
      if (!files[name]) throw Error("Missing script: " + name);
      code += "\n" + files[name];
    } else code += "\n" + script.textContent;
    script.remove();
  }
  return {
    html: "<!doctype html>" + doc.documentElement.outerHTML,
    css,
    code: code.includes("await import(")
      ? "return (async()=>{" + code + "\n})();"
      : code,
  };
}
export function download(data, name, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function projectDB(action, value) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("js-lab-projects-v3", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("projects", { keyPath: "id" });
    req.onerror = () =>
      reject(Error("Storage is blocked. Export a ZIP before leaving."));
    req.onsuccess = () => {
      const db = req.result,
        tx = db.transaction(
          "projects",
          action === "list" ? "readonly" : "readwrite",
        ),
        s = tx.objectStore("projects");
      const q =
        action === "list"
          ? s.getAll()
          : action === "save"
            ? s.put(value)
            : s.delete(value);
      let result;
      q.onsuccess = () => (result = q.result);
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onerror = () => {
        db.close();
        reject(Error("Storage could not save; it may be full. Export a ZIP."));
      };
    };
  });
}
