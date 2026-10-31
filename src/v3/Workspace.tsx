import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import {
  compileProject,
  download,
  pathName,
  projectDB,
  unzipProject,
  validateProject,
  zipProject,
} from "./files.mjs";
import { defaultFiles } from "./examples.mjs";
import BrowserLab from "./BrowserLab";
type Project = {
  id: string;
  name: string;
  files: Record<string, string>;
  storage: Record<string, string>;
};
export default function Workspace({
  seed,
  completed,
}: {
  seed?: { id: string; title: string; files: Record<string, string> };
  completed?: (id: string) => void;
}) {
  const initial = seed?.files || defaultFiles;
  const [project, setProject] = useState<Project>({
      id: crypto.randomUUID(),
      name: seed?.title || "My application",
      files: { ...initial },
      storage: {},
    }),
    [active, setActive] = useState("js/app.js"),
    [tabs, setTabs] = useState(["index.html", "css/style.css", "js/app.js"]),
    [newPath, setNewPath] = useState("js/helper.js"),
    [rename, setRename] = useState(""),
    [saved, setSaved] = useState<Project[]>([]),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [entry, setEntry] = useState("index.html"),
    [compiled, setCompiled] = useState<
      { html: string; css: string; code: string } | undefined
    >(),
    [previewKey, setPreviewKey] = useState(0),
    [pending, setPending] = useState("");
  const upload = useRef<HTMLInputElement>(null),
    storage = useRef<Record<string, string>>({});
  useEffect(() => {
    projectDB("list")
      .then((r) => setSaved(r as Project[]))
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function files(next: Record<string, string>) {
    try {
      validateProject(next);
      setProject((p) => ({ ...p, files: next }));
      setDirty(true);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function open(p: Project) {
    if (
      dirty &&
      !confirm(
        "Replace the unsaved workspace view? Save or export first to keep it.",
      )
    )
      return;
    try {
      validateProject(p.files);
      setProject(p);
      storage.current = p.storage || {};
      const first = p.files["index.html"]
        ? "index.html"
        : Object.keys(p.files)[0];
      setActive(first);
      setTabs([first]);
      setEntry(first);
      setCompiled(undefined);
      setDirty(false);
      setNotice("Opened device-local project.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save() {
    try {
      const value = { ...project, storage: storage.current };
      await projectDB("save", value);
      setSaved((s) => [value, ...s.filter((p) => p.id !== value.id)]);
      setDirty(false);
      setNotice("Files and bounded learning storage saved on this device.");
      completed?.("workspace-saved");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function preview() {
    try {
      setCompiled(compileProject(project.files, entry));
      setPreviewKey((k) => k + 1);
      setNotice(
        "Project prepared. Press Run application below to execute your own code.",
      );
      completed?.("workspace-compiled");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const example = useMemo(
    () => ({
      id: project.id,
      title: project.name,
      html: compiled?.html || "<h1>Compile your project first</h1>",
      code: compiled?.code || "",
      css: compiled?.css || "",
    }),
    [compiled],
  );
  return (
    <section className="v3-workspace">
      <div className="v3-card">
        <h2>Multi-file application workspace</h2>
        <p>
          A separate advanced tool. The original synchronous playground stays
          available. Save keeps files in IndexedDB on this browser; export a ZIP
          for a portable source backup. Nothing is uploaded.
        </p>
        <div className="controls wrap">
          <label>
            Project name
            <input
              value={project.name}
              maxLength={80}
              onChange={(e) => {
                setProject((p) => ({ ...p, name: e.target.value }));
                setDirty(true);
              }}
            />
          </label>
          <label>
            Open saved project
            <select
              value=""
              onChange={(e) => {
                const p = saved.find((p) => p.id === e.target.value);
                if (p) open(p);
              }}
            >
              <option value="">Choose a project</option>
              {saved.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button primary small" onClick={save}>
            Save project
          </button>
          <button
            className="button secondary small"
            onClick={() =>
              open({
                id: crypto.randomUUID(),
                name: "New application",
                files: { ...defaultFiles },
                storage: {},
              })
            }
          >
            New project
          </button>
          <button
            className="icon-label"
            onClick={() => {
              if (
                confirm(
                  "Restore the starter in the current project? Export or save your work first.",
                )
              ) {
                files({ ...initial });
                storage.current = {};
              }
            }}
          >
            Restore starter
          </button>
        </div>
        <p role="status">
          {dirty ? "Unsaved file edits. " : ""}
          {notice}
        </p>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="v3-files-grid">
          <aside>
            <span className="eyebrow">FILE EXPLORER</span>
            {Object.keys(project.files)
              .sort()
              .map((n) => (
                <button
                  className={n === active ? "selected" : ""}
                  key={n}
                  onClick={() => {
                    setActive(n);
                    setTabs((t) => (t.includes(n) ? t : [...t, n]));
                  }}
                  style={{ paddingLeft: 12 + (n.split("/").length - 1) * 12 }}
                >
                  {n}
                </button>
              ))}
            <label>
              New file path
              <input
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
              />
            </label>
            <button
              className="button secondary small"
              onClick={() => {
                try {
                  const n = pathName(newPath);
                  if (Object.hasOwn(project.files, n))
                    throw Error("That file already exists.");
                  validateProject({ ...project.files, [n]: "" });
                  files({ ...project.files, [n]: "" });
                  setActive(n);
                  setTabs((t) => [...t, n]);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Create file
            </button>
            <p>Use slashes to create folders, such as js/utils/format.js.</p>
          </aside>
          <div>
            <div className="tabs wrap">
              {tabs
                .filter((n) => n in project.files)
                .map((n) => (
                  <button
                    className={active === n ? "active" : ""}
                    key={n}
                    onClick={() => setActive(n)}
                  >
                    {n}
                  </button>
                ))}
            </div>
            <label className="sr-only" htmlFor="workspace-code">
              Workspace source
            </label>
            <div className="v3-editor">
              <Editor
                textareaId="workspace-code"
                value={project.files[active] || ""}
                onValueChange={(v) => files({ ...project.files, [active]: v })}
                highlight={(v) =>
                  Prism.highlight(
                    v,
                    Prism.languages[
                      active.endsWith(".css")
                        ? "css"
                        : active.endsWith(".html")
                          ? "markup"
                          : "javascript"
                    ],
                    active.endsWith(".css")
                      ? "css"
                      : active.endsWith(".html")
                        ? "markup"
                        : "javascript",
                  )
                }
                padding={20}
                tabSize={2}
                insertSpaces
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  minHeight: 340,
                  lineHeight: "22px",
                }}
              />
            </div>
            <div className="controls wrap">
              <label>
                Rename selected file
                <input
                  value={rename}
                  onChange={(e) => setRename(e.target.value)}
                  placeholder="New full relative path"
                />
              </label>
              <button
                className="icon-label"
                onClick={() => {
                  try {
                    const n = pathName(rename);
                    if (Object.hasOwn(project.files, n))
                      throw Error("Target path exists.");
                    const next = {
                      ...project.files,
                      [n]: project.files[active],
                    };
                    delete next[active];
                    validateProject(next);
                    files(next);
                    setActive(n);
                    setTabs((t) => t.map((x) => (x === active ? n : x)));
                    setNotice(
                      "Renamed. Update imports and links that refer to the old filename.",
                    );
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Rename
              </button>
              <button className="icon-label" onClick={() => setPending(active)}>
                Delete selected file
              </button>
            </div>
          </div>
        </div>
        <div className="controls wrap">
          <label>
            HTML entry
            <select value={entry} onChange={(e) => setEntry(e.target.value)}>
              {Object.keys(project.files)
                .filter((n) => /\.html?$/.test(n))
                .map((n) => (
                  <option key={n}>{n}</option>
                ))}
            </select>
          </label>
          <button className="button primary small" onClick={preview}>
            Prepare preview
          </button>
          <button
            className="button secondary small"
            onClick={() => {
              try {
                download(
                  zipProject(project.files),
                  project.name.replace(/[^a-z0-9-]/gi, "-") + ".zip",
                  "application/zip",
                );
                completed?.("project-exported");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Export source ZIP
          </button>
          <button
            className="icon-label"
            onClick={() => upload.current?.click()}
          >
            Import ZIP
          </button>
          <input
            className="sr-only"
            ref={upload}
            type="file"
            accept=".zip"
            aria-label="Import project ZIP"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                if (f.size > 1000000) throw Error("ZIP must be under 1 MB.");
                const imported = unzipProject(
                  new Uint8Array(await f.arrayBuffer()),
                );
                open({
                  id: crypto.randomUUID(),
                  name: f.name.replace(/\.zip$/i, ""),
                  files: imported,
                  storage: {},
                });
              } catch (e) {
                setError((e as Error).message);
              }
              e.target.value = "";
            }}
          />
        </div>
        {pending && (
          <div
            className="hint"
            role="alertdialog"
            aria-label="Confirm file deletion"
          >
            <p>
              Delete {pending} from this unsaved project? Save or export a
              backup first.
            </p>
            <button
              className="button secondary small"
              autoFocus
              onClick={() => setPending("")}
            >
              Cancel
            </button>
            <button
              className="button primary small"
              onClick={() => {
                const next = { ...project.files };
                delete next[pending];
                files(next);
                setActive(Object.keys(next)[0] || "");
                setPending("");
              }}
            >
              Delete file
            </button>
          </div>
        )}
        <details>
          <summary>Project support & storage controls</summary>
          <p>
            40 text files, 80 KB per file, 800 KB total; imported ZIP at most 1
            MB. Supported: .html, .css, .js, .json, .txt, .md. Static relative
            native module imports, named/default/re-exports and top-level await
            work in acyclic graphs. Package imports, dynamic imports in source,
            import maps, cyclic graphs, binary assets, remote resources and page
            navigation are unsupported. Use inline data images if needed, and
            choose an HTML entry to preview another page. Scripts load after the
            document is parsed; defer timing is not emulated. Native module
            imports use generated data URLs inside the isolated worker, not a
            custom JavaScript transpiler.
          </p>
          <p>
            Learning localStorage is project-scoped and saved only with Save
            project; sessionStorage lasts for one run. ZIP export contains
            source only, never stored learner data. Browser storage may be
            unavailable or evicted. Export backups. No project has backend
            accounts, secret storage, or server persistence.
          </p>
          {saved.map((p) => (
            <div className="controls" key={p.id}>
              <span>{p.name}</span>
              <button
                className="icon-label"
                onClick={async () => {
                  if (
                    confirm(
                      "Delete this saved project from this browser? Export it first if needed.",
                    )
                  )
                    try {
                      await projectDB("delete", p.id);
                      setSaved((s) => s.filter((x) => x.id !== p.id));
                    } catch (e) {
                      setError((e as Error).message);
                    }
                }}
              >
                Delete saved copy
              </button>
            </div>
          ))}
        </details>
      </div>
      {compiled && (
        <BrowserLab
          projectMode
          key={previewKey}
          example={example}
          storageSeed={storage.current}
          onStorage={(s) => {
            storage.current = s;
          }}
        />
      )}
    </section>
  );
}
