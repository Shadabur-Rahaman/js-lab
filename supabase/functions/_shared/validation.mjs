export const MiB = 1024 * 1024;
export const HARD_LIMIT = 50 * MiB;
export const formats = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  csv: "text/csv",
  md: "text/markdown",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  zip: "application/zip",
};
export const accept = Object.keys(formats)
  .map((x) => "." + x)
  .join(",");
export function fileInfo(name, size, declared = "", limit = 25 * MiB) {
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 180 ||
    /[\x00-\x1f\x7f/\\]/.test(name)
  )
    throw Error(
      "Use a filename of 1–180 characters without folders or control characters.",
    );
  const ext = name.toLowerCase().split(".").at(-1);
  const mime = formats[ext];
  if (!mime)
    throw Error(
      "Unsupported file format. Choose a classroom document, image, text file or ZIP.",
    );
  if (
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > Math.min(limit, HARD_LIMIT)
  )
    throw Error(
      `File must contain data and be at most ${Math.min(limit, HARD_LIMIT) / MiB} MB.`,
    );
  const generic = ["", "application/octet-stream"];
  const aliases = {
    md: ["text/plain"],
    csv: ["text/plain", "application/vnd.ms-excel"],
    zip: ["application/x-zip-compressed"],
  };
  if (
    declared &&
    declared !== mime &&
    !generic.includes(declared) &&
    !(aliases[ext] || []).includes(declared)
  )
    throw Error("The file format and reported content type do not match.");
  return { ext, mime, name: name.trim(), size };
}
export function validateBytes(bytes, ext) {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 16));
  const starts = (...values) => values.every((n, i) => bytes[i] === n);
  let valid = false;
  if (ext === "pdf") valid = head.startsWith("%PDF-");
  else if (ext === "png") valid = starts(137, 80, 78, 71, 13, 10, 26, 10);
  else if (["jpg", "jpeg"].includes(ext)) valid = starts(255, 216, 255);
  else if (ext === "gif") valid = /^GIF8[79]a/.test(head);
  else if (ext === "webp")
    valid = head.startsWith("RIFF") && head.slice(8, 12) === "WEBP";
  else if (["doc", "ppt", "xls"].includes(ext))
    valid = starts(208, 207, 17, 224, 161, 177, 26, 225);
  else if (["zip", "docx", "pptx", "xlsx"].includes(ext)) {
    valid = starts(80, 75, 3, 4) || (ext === "zip" && starts(80, 75, 5, 6));
    if (valid && ext !== "zip") {
      // Read central directory names only; never decompress or execute uploaded data.
      const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
      );
      const names = [];
      for (let i = 0; i + 46 <= bytes.length; i++)
        if (view.getUint32(i, true) === 0x02014b50) {
          const length = view.getUint16(i + 28, true);
          if (i + 46 + length > bytes.length)
            throw Error("Invalid Office package.");
          names.push(
            new TextDecoder().decode(bytes.subarray(i + 46, i + 46 + length)),
          );
          i +=
            45 +
            length +
            view.getUint16(i + 30, true) +
            view.getUint16(i + 32, true);
        }
      const folder = { docx: "word/", pptx: "ppt/", xlsx: "xl/" }[ext];
      valid =
        names.includes("[Content_Types].xml") &&
        names.some((n) => n.startsWith(folder)) &&
        !names.some((n) => /vbaProject|macros?/i.test(n));
    }
  } else if (["txt", "csv", "md"].includes(ext)) {
    try {
      const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      valid = !value.includes("\0");
    } catch {
      valid = false;
    }
  }
  if (!valid)
    throw Error("The actual file contents do not match the supported format.");
}
export async function sha256(bytes) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function metadata(input) {
  if (
    typeof input?.title !== "string" ||
    !input.title.trim() ||
    input.title.length > 160
  )
    throw Error("A title of 1–160 characters is required.");
  const description = String(input.description || "");
  const tags = Array.isArray(input.tags)
    ? input.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];
  if (
    description.length > 4000 ||
    tags.length > 12 ||
    tags.some((t) => t.length > 40)
  )
    throw Error("Description or tags are too long.");
  const chapter =
    input.chapter_id == null || input.chapter_id === ""
      ? null
      : Number(input.chapter_id);
  if (
    chapter != null &&
    (!Number.isInteger(chapter) || chapter < 1 || chapter > 10000)
  )
    throw Error("Invalid chapter.");
  const order = Number(input.display_order || 0);
  if (!Number.isSafeInteger(order) || Math.abs(order) > 100000)
    throw Error("Invalid display order.");
  if (
    !["draft", "published", "archived", "deleted"].includes(
      input.status || "draft",
    )
  )
    throw Error("Invalid resource status.");
  return {
    title: input.title.trim(),
    description,
    tags: [...new Set(tags)],
    chapter_id: chapter,
    lesson_id: String(input.lesson_id || "").slice(0, 120) || null,
    category_id: input.category_id || null,
    display_order: order,
    status: input.status || "draft",
  };
}
