import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
const PdfPreview = lazy(() => import("./PdfPreview"));
import { FileText, Download, Eye, X } from "lucide-react";
import { lessons } from "../data/lessons";
import {
  download,
  extension,
  link,
  previewable,
  size,
  type Category,
  type Metadata,
  type Resource,
} from "./client";
export function Notice({ error }: { error: string }) {
  return error ? (
    <p className="resource-notice" role="alert">
      {error}
    </p>
  ) : null;
}
export function Modal({
  title,
  onClose,
  children,
  className = "",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      before?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={"resource-dialog " + className}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="resource-toolbar">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function MetadataFields({
  value,
  onChange,
  categories,
}: {
  value: Metadata;
  onChange: (value: Metadata) => void;
  categories: Category[];
}) {
  const set = (part: Partial<Metadata>) => onChange({ ...value, ...part });
  return (
    <div className="resource-fields">
      <label>
        Resource title
        <input
          required
          maxLength={160}
          value={value.title}
          onChange={(e) => set({ title: e.target.value })}
        />
      </label>
      <label>
        Description
        <textarea
          maxLength={4000}
          value={value.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </label>
      <label>
        Category
        <select
          value={value.category_id || ""}
          onChange={(e) => set({ category_id: e.target.value || null })}
        >
          <option value="">General materials</option>
          {categories
            .filter((c) => !c.archived || c.id === value.category_id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.archived ? " (archived)" : ""}
              </option>
            ))}
        </select>
      </label>
      <label>
        Chapter
        <select
          value={value.chapter_id || ""}
          onChange={(e) =>
            set({ chapter_id: Number(e.target.value) || null, lesson_id: null })
          }
        >
          <option value="">General library</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.id}. {l.short}
            </option>
          ))}
        </select>
      </label>
      <label>
        Specific lesson or topic (optional)
        <input
          maxLength={120}
          placeholder="For example: let and const"
          value={value.lesson_id || ""}
          onChange={(e) => set({ lesson_id: e.target.value || null })}
        />
      </label>
      <label>
        Tags, separated by commas
        <input
          value={value.tags.join(", ")}
          onChange={(e) =>
            set({ tags: e.target.value.split(",").slice(0, 12) })
          }
        />
      </label>
      <label>
        Visibility
        <select
          value={value.status === "deleted" ? "draft" : value.status}
          onChange={(e) =>
            set({ status: e.target.value as Metadata["status"] })
          }
        >
          <option value="draft">Draft — teacher only</option>
          <option value="published">Published — students can download</option>
          <option value="archived">Archived — teacher only</option>
        </select>
      </label>
      <label>
        Display order
        <input
          type="number"
          min={-100000}
          max={100000}
          value={value.display_order}
          onChange={(e) => set({ display_order: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}
export function FileActions({ resource }: { resource: Resource }) {
  const [preview, setPreview] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <div className="resource-actions">
        {previewable(resource) && (
          <button className="button secondary" onClick={() => setPreview(true)}>
            <Eye size={15} />
            Preview
          </button>
        )}
        <button
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await download(resource);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Download size={15} />
          {busy ? "Preparing…" : "Download"}
        </button>
      </div>
      <Notice error={error} />
      {preview && (
        <Preview resource={resource} onClose={() => setPreview(false)} />
      )}
    </>
  );
}
export function Preview({
  resource,
  onClose,
}: {
  resource: Resource;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(""),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [zoom, setZoom] = useState(1),
    [attempt, setAttempt] = useState(0);
  const viewer = useRef<HTMLDivElement>(null),
    ext = extension(resource),
    isText = ["txt", "md", "csv"].includes(ext);
  useEffect(() => {
    if (ext === "pdf") return;
    let active = true;
    const control = new AbortController();
    setUrl("");
    setText("");
    setError("");
    void (async () => {
      try {
        const signed = await link(resource, true);
        if (isText) {
          if (resource.file_size > 1024 * 1024)
            throw Error(
              "Text preview is limited to 1 MB. Download the original file.",
            );
          const result = await fetch(signed, { signal: control.signal });
          if (!result.ok)
            throw Error(
              "Preview link expired or file unavailable. Retry for a fresh link.",
            );
          const value = await result.text();
          if (active) setText(value);
        }
        if (active) setUrl(signed);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
      control.abort();
    };
  }, [resource.id, resource.version, attempt, ext]);
  return (
    <Modal
      title={resource.title}
      onClose={onClose}
      className={ext === "pdf" ? "resource-dialog-pdf" : ""}
    >
      <p>
        {resource.original_filename} · {size(resource.file_size)}
      </p>
      <p className="muted">
        {ext === "pdf"
          ? "Scroll down to read the whole PDF."
          : "Preview links last one minute. Retry to open a fresh link."}
      </p>
      <div className="resource-actions">
        {ext !== "pdf" && (
          <button
            className="button secondary"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Retry preview
          </button>
        )}
        {ext === "pdf" && (
          <>
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  if (!viewer.current?.requestFullscreen) throw Error();
                  await viewer.current.requestFullscreen();
                } catch {
                  setError("Fullscreen is unavailable.");
                }
              }}
            >
              Fullscreen
            </button>
            <FileDownload resource={resource} />
          </>
        )}
        {!isText && ext !== "pdf" && (
          <>
            <button
              className="button secondary"
              onClick={() => setZoom((n) => (n === 1 ? 1.5 : 1))}
            >
              Toggle zoom
            </button>
            <button
              className="button secondary"
              onClick={() =>
                void viewer.current
                  ?.requestFullscreen()
                  .catch(() => setError("Fullscreen is unavailable."))
              }
            >
              Fullscreen
            </button>
          </>
        )}
      </div>
      <Notice error={error} />
      <div
        className={
          "resource-preview " + (ext === "pdf" ? "resource-preview-pdf" : "")
        }
        ref={viewer}
      >
        {ext === "pdf" ? (
          <Suspense fallback={<p role="status">Opening PDF viewer…</p>}>
            <PdfPreview
              key={resource.id + ":" + resource.version + ":" + attempt}
              resource={resource}
              attempt={attempt}
            />
          </Suspense>
        ) : null}
        {ext !== "pdf" && !url && !error && (
          <p role="status">Opening preview…</p>
        )}
        {ext !== "pdf" &&
          url &&
          (isText ? (
            <pre>{text}</pre>
          ) : (
            <img
              src={url}
              alt={resource.title}
              style={{ width: zoom * 100 + "%" }}
              onError={() =>
                setError(
                  "Preview expired or unavailable. Retry, or download the original file.",
                )
              }
            />
          ))}
      </div>
      {ext !== "pdf" && <FileDownload resource={resource} />}
    </Modal>
  );
}
function FileDownload({ resource }: { resource: Resource }) {
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="button primary"
        onClick={() =>
          void download(resource).catch((e) => setError(e.message))
        }
      >
        Download original
      </button>
      <Notice error={error} />
    </>
  );
}
export function ResourceCard({
  resource,
  categories,
  children,
}: {
  resource: Resource;
  categories: Category[];
  children?: ReactNode;
}) {
  return (
    <article className="resource-card">
      <div className="resource-filemark">
        <FileText size={22} />
        <span>{extension(resource).toUpperCase()}</span>
      </div>
      <div className="resource-card-body">
        <h3>{resource.title}</h3>
        <p>
          {resource.description ||
            "Learning material for your JavaScript journey."}
        </p>
        <small>
          {categories.find((c) => c.id === resource.category_id)?.name ||
            "General materials"}
          {resource.chapter_id ? ` · Chapter ${resource.chapter_id}` : ""}
          {resource.lesson_id ? ` · ${resource.lesson_id}` : ""}
        </small>
        <p className="resource-details">
          {size(resource.file_size)} ·{" "}
          {new Date(resource.created_at).toLocaleDateString()} ·{" "}
          {resource.original_filename}
        </p>
        {resource.tags.length > 0 && (
          <p className="resource-tags">
            {resource.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </p>
        )}
        <FileActions resource={resource} />
        {children}
      </div>
    </article>
  );
}
