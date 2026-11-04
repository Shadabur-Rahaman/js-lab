import {privateAccess} from '../access/session';
import {useMember} from '../access/PrivateGate';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { UploadCloud, ShieldCheck, FolderOpen } from "lucide-react";
import { accept, MiB } from "../../supabase/functions/_shared/validation.mjs";
import {
  api,
  blank,
  catalogs,
  cloud,
  editData,
  extension,
  managed,
  size,
  uploadJob,
  type Category,
  type Metadata,
  type Profile,
  type Resource,
  type UploadJob,
} from "./client";
import { MetadataFields, Modal, Notice, ResourceCard } from "./components";
import "./resources.css";
const guide =
  "https://github.com/Shadabur-Rahaman/js-lab/blob/main/RESOURCE_LIBRARY_SETUP.md";
type QueueItem = UploadJob & {
  key: string;
  phase: string;
  percent: number;
  error: string;
  completed: boolean;
};
export default function TeacherResources() {
 if(privateAccess)return <PrivateResources/>;
 return <LegacyResources/>;
}
function PrivateResources(){const member=useMember();return member?.role==='admin'?<section className="resource-page"><h1>Manage Resources</h1><Dashboard profile={{...member,role:"admin"}}/></section>:<p role="alert">Only the administrator can manage resources.</p>;}
function LegacyResources() {
  const [profile, setProfile] = useState<Profile | null>(null),
    [checking, setChecking] = useState(!!cloud),
    [error, setError] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [recovery, setRecovery] = useState(
      new URLSearchParams(location.search).has("resource-recovery"),
    );
  const validate = useCallback(async () => {
    if (!cloud) return;
    try {
      const {
        data: { session },
      } = await cloud!.auth.getSession();
      setProfile(session ? await api<Profile>("profile") : null);
    } catch (e) {
      setProfile(null);
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }, []);
  useEffect(() => {
    void validate();
    const subscription = cloud?.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setPassword("");
      } else if (
        ["SIGNED_IN", "TOKEN_REFRESHED", "INITIAL_SESSION"].includes(event)
      ) {
        setTimeout(() => void validate(), 0);
      }
    });
    return () => subscription?.data.subscription.unsubscribe();
  }, [validate]);
  async function signIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await cloud!.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      setPassword("");
      await validate();
    } catch {
      setError("Sign-in failed. Check your email and password, then retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="resource-page">
      <div className="page-intro">
        <span className="eyebrow">
          <ShieldCheck size={16} /> TEACHER WORKSPACE
        </span>
        <h1>Manage Resources</h1>
        <p>Upload, organize and share your classroom materials.</p>
      </div>
      {!cloud ? (
        <div className="resource-empty">
          <FolderOpen size={32} />
          <h2>Connect your cloud library</h2>
          <p>
            Create your Supabase project, run the included migration and
            authorize your teacher account. Then add the two public connection
            settings to GitHub Pages.
          </p>
          <a
            className="button primary"
            href={guide}
            target="_blank"
            rel="noreferrer"
          >
            Open setup instructions
          </a>
          <p>
            Uploads and sign-in are disabled until setup is complete. The
            classroom access code continues to control presentation tools.
          </p>
        </div>
      ) : (
        <>
          <Notice error={error} />
          {checking ? (
            <p role="status">Checking teacher access…</p>
          ) : recovery ? (
            <form
              className="resource-auth"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const { error: failure } = await cloud!.auth.updateUser({
                    password,
                  });
                  if (failure) throw failure;
                  await cloud!.auth.signOut();
                  history.replaceState(
                    null,
                    "",
                    location.pathname + "#teacher/resources",
                  );
                  setRecovery(false);
                  setPassword("");
                  setError("Password updated. Sign in with your new password.");
                } catch {
                  setError(
                    "Recovery failed or expired. Request a fresh recovery email.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>Choose a new password</h2>
              <label>
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button className="button primary" disabled={busy}>
                Update password
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setRecovery(false);
                  history.replaceState(
                    null,
                    "",
                    location.pathname + "#teacher/resources",
                  );
                }}
              >
                Back to sign-in
              </button>
            </form>
          ) : profile ? (
            <>
              <div className="resource-toolbar">
                <span>
                  {profile.email} · {profile.role}
                </span>
                <button
                  className="button secondary"
                  onClick={async () => {
                    const result = await cloud!.auth.signOut();
                    if (result.error)
                      setError(
                        "Could not sign out. Retry when your connection returns.",
                      );
                  }}
                >
                  Sign out
                </button>
              </div>
              <Dashboard key={profile.id} profile={profile} />
            </>
          ) : (
            <form className="resource-auth" onSubmit={signIn}>
              <h2>Teacher sign-in</h2>
              <p>
                This uses your authorized Supabase account. Your classroom code
                does not grant access to files.
              </p>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button className="button primary" disabled={busy}>
                Sign in securely
              </button>
              <button
                type="button"
                className="text-button"
                disabled={busy || !email}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const redirect = new URL(
                      location.pathname,
                      location.origin,
                    );
                    redirect.searchParams.set("resource-recovery", "1");
                    const result = await cloud!.auth.resetPasswordForEmail(
                      email,
                      { redirectTo: redirect.href },
                    );
                    if (result.error) throw result.error;
                    setError(
                      "If this address has an account, a recovery email is on its way. Open it in this browser.",
                    );
                  } catch {
                    setError(
                      "Could not send the recovery email. Check your connection and try again.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Send password recovery email
              </button>
              <a href={guide} target="_blank" rel="noreferrer">
                Account setup help
              </a>
            </form>
          )}
        </>
      )}
    </section>
  );
}
function Dashboard({ profile }: { profile: Profile }) {
  const [rows, setRows] = useState<Resource[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [max, setMax] = useState(25 * MiB),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(false),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState(""),
    [kind, setKind] = useState(""),
    [sort, setSort] = useState("newest"),
    [page, setPage] = useState(0),
    [editor, setEditor] = useState<Resource | null>(null),
    [edit, setEdit] = useState<Metadata>(blank()),
    [trash, setTrash] = useState<Resource | null>(null),
    [replacement, setReplacement] = useState<Resource | null>(null),
    [queue, setQueue] = useState<QueueItem[]>([]),
    [uploading, setUploading] = useState(false),
    [categoryName, setCategoryName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null),
    active = useRef<ReturnType<typeof uploadJob> | null>(null),
    activeKey = useRef<string | null>(null),
    alive = useRef(true),
    stop = useRef(false),
    queueRef = useRef(queue);
  queueRef.current = queue;
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, settings] = await Promise.all([managed(), catalogs()]);
      setRows(data);
      setCategories(settings.categories);
      setMax(settings.max);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      stop.current = true;
      void active.current?.cancel().catch(() => {});
    };
  }, [load]);
  useEffect(() => setPage(0), [query, category, status, kind, sort]);
  const patch = (key: string, part: Partial<QueueItem>) => {
    if (alive.current)
      setQueue((current) =>
        current.map((item) => (item.key === key ? { ...item, ...part } : item)),
      );
  };
  function add(files: FileList | File[] | null) {
    if (!files) return;
    const selected = Array.from(files);
    if (replacement && selected.length !== 1) {
      setError("Choose one replacement file.");
      return;
    }
    setQueue((current) => {
      const next = [...current];
      for (const file of selected) {
        const key = [
          file.name,
          file.size,
          file.lastModified,
          replacement?.id || "new",
        ].join(":");
        if (next.some((j) => j.key === key)) continue;
        next.push({
          key,
          file,
          requestId: crypto.randomUUID(),
          resource: replacement || undefined,
          metadata: replacement
            ? editData(replacement)
            : { ...blank(), title: file.name.replace(/\.[^.]+$/, "") },
          phase: "Ready",
          percent: 0,
          error: "",
          completed: false,
        });
      }
      return next;
    });
    setReplacement(null);
  }
  async function start() {
    if (uploading) return;
    setUploading(true);
    stop.current = false;
    for (const job of queueRef.current) {
      if (stop.current || !alive.current) break;
      if (job.completed || job.phase === "Cancelled") continue;
      patch(job.key, { error: "" });
      try {
        const operation = uploadJob(job, max, (phase, percent) =>
          patch(job.key, { phase, percent, uploadId: job.uploadId }),
        );
        active.current = operation;
        activeKey.current = job.key;
        await operation.done;
        patch(job.key, { completed: true, phase: "Saved to cloud", error: "" });
        await load();
      } catch (e) {
        patch(job.key, {
          phase: "Needs attention",
          error: (e as Error).message,
        });
      } finally {
        active.current = null;
        activeKey.current = null;
      }
    }
    if (alive.current) setUploading(false);
  }
  async function change(resource: Resource, data: Metadata) {
    setError("");
    setNotice("");
    try {
      await api("edit", {
        id: resource.id,
        version: resource.version,
        metadata: data,
      });
      setEditor(null);
      setTrash(null);
      setNotice("Changes saved to the cloud.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const filtered = rows
    .filter(
      (r) =>
        (!category || r.category_id === category) &&
        (!status || r.status === status) &&
        (!kind || extension(r) === kind) &&
        `${r.title} ${r.original_filename} ${r.lesson_id || ""} ${r.tags.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.title.localeCompare(b.title)
        : sort === "size"
          ? b.file_size - a.file_size
          : b.created_at.localeCompare(a.created_at),
    );
  const summary = ["published", "draft", "archived", "deleted"].map((s) => ({
    label: s,
    count: rows.filter((r) => r.status === s).length,
  }));
  return (
    <>
      <Notice error={error} />
      {notice && (
        <p role="status" className="resource-success">
          {notice}
        </p>
      )}
      <div className="resource-stats">
        <div>
          <strong>{rows.length}</strong>
          <span>Total resources</span>
        </div>
        {summary.map((s) => (
          <div key={s.label}>
            <strong>{s.count}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <p className="muted">
        Current managed files: {size(rows.reduce((n, r) => n + r.file_size, 0))}
        . This excludes retained versions, incomplete uploads and provider
        overhead; check Supabase for total storage and quota.
      </p>
      <section className="resource-panel">
        <h2>
          <UploadCloud size={21} /> Upload materials
        </h2>
        <p>
          Up to {size(max)} per file. PDF, Office documents, text, images and
          ZIP. Files stay private until published.
        </p>
        <div
          className="resource-drop"
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (!uploading) add(e.dataTransfer.files);
          }}
        >
          <label className="button secondary">
            {replacement
              ? "Choose replacement for " + replacement.title
              : "Browse files or drop them here"}
            <input
              ref={fileInput}
              type="file"
              accept={accept}
              multiple={!replacement}
              disabled={uploading}
              onChange={(e) => {
                add(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {replacement && (
          <button className="text-button" onClick={() => setReplacement(null)}>
            Cancel replacement selection
          </button>
        )}
        {queue.map((job) => (
          <details
            className="resource-queue-item"
            key={job.key}
            open={!!job.error}
          >
            <summary>
              {job.file.name} · {size(job.file.size)} · {job.phase}
            </summary>
            <progress
              value={job.percent}
              max={100}
              aria-label={"Upload progress for " + job.file.name}
            />
            <p role="status">
              {job.phase} {job.percent}%
            </p>
            <Notice error={job.error} />
            {!job.completed && (
              <>
                <fieldset disabled={uploading || !!job.uploadId}>
                  <MetadataFields
                    value={job.metadata}
                    onChange={(metadata) => patch(job.key, { metadata })}
                    categories={categories}
                  />
                </fieldset>
                {job.uploadId && (
                  <small>
                    Reserved metadata is fixed for retries. Cancel and add the
                    file again to change it.
                  </small>
                )}
                <button
                  className="button secondary"
                  disabled={uploading && activeKey.current !== job.key}
                  onClick={async () => {
                    setError("");
                    try {
                      stop.current = true;
                      await active.current?.cancel();
                      if (job.uploadId)
                        await api("cancel", { upload_id: job.uploadId });
                      patch(job.key, { phase: "Cancelled", error: "" });
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Cancel upload
                </button>
              </>
            )}
          </details>
        ))}
        {queue.some((j) => !j.completed && j.phase !== "Cancelled") && (
          <button
            className="button primary"
            disabled={uploading}
            onClick={() => void start()}
          >
            {uploading ? "Uploading…" : "Upload / retry queued files"}
          </button>
        )}
        {queue.length > 0 && !uploading && (
          <button
            className="button secondary"
            onClick={() =>
              setQueue((current) =>
                current.filter((j) => !j.completed && j.phase !== "Cancelled"),
              )
            }
          >
            Clear finished items
          </button>
        )}
      </section>
      <div className="resource-toolbar">
        <h2>Resource library</h2>
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? "Refreshing…" : "Refresh library"}
        </button>
      </div>
      <div className="resource-filters">
        <label>
          Search
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, topic or filename"
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {summary.map((s) => (
              <option key={s.label}>{s.label}</option>
            ))}
          </select>
        </label>
        <label>
          Format
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">All formats</option>
            {[...new Set(rows.map(extension))].map((ext) => (
              <option key={ext}>{ext}</option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
            <option value="size">Largest first</option>
          </select>
        </label>
      </div>
      {!loading && !filtered.length && (
        <div className="resource-empty">
          No saved resources match. Upload a file, or change your filters.
        </div>
      )}
      <div className="resource-grid">
        {filtered.slice(page * 12, page * 12 + 12).map((r) => (
          <ResourceCard key={r.id} resource={r} categories={categories}>
            <p className="resource-status">
              {r.status} · revision {r.version}
            </p>
            <div className="resource-actions">
              {r.status === "deleted" ? (
                <button
                  className="button secondary"
                  onClick={() =>
                    void change(r, { ...editData(r), status: "draft" })
                  }
                >
                  Restore as draft
                </button>
              ) : (
                <>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setEditor(r);
                      setEdit(editData(r));
                    }}
                  >
                    Edit details
                  </button>
                  <button
                    className="button secondary"
                    disabled={uploading}
                    onClick={() => {
                      setReplacement(r);
                      fileInput.current?.scrollIntoView({
                        block: "center",
                        behavior: "smooth",
                      });
                    }}
                  >
                    Replace file
                  </button>
                  <button
                    className="button secondary"
                    onClick={() =>
                      void change(r, {
                        ...editData(r),
                        status:
                          r.status === "published" ? "draft" : "published",
                      })
                    }
                  >
                    {r.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => setTrash(r)}
                  >
                    Move to trash
                  </button>
                </>
              )}
            </div>
          </ResourceCard>
        ))}
      </div>
      <div className="resource-actions">
        <button
          className="button secondary"
          disabled={!page}
          onClick={() => setPage((n) => n - 1)}
        >
          Previous
        </button>
        <span>
          Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / 12))}
        </span>
        <button
          className="button secondary"
          disabled={(page + 1) * 12 >= filtered.length}
          onClick={() => setPage((n) => n + 1)}
        >
          Next
        </button>
      </div>
      <p className="muted">
        Trash can be restored for 30 days; replaced files are retained for 7
        days. Previously issued download links may work for up to one minute.
        Downloaded copies cannot be recalled.
      </p>
      {profile.role === "admin" && (
        <section className="resource-panel">
          <h2>Library administration</h2>
          <details>
            <summary>Manage categories</summary>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api("category", { name: categoryName });
                  setCategoryName("");
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <label>
                New category
                <input
                  required
                  maxLength={80}
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
              </label>
              <button className="button secondary">Add category</button>
            </form>
            {categories.map((c) => (
              <CategoryEditor
                key={c.id + ":" + c.name + ":" + c.archived}
                category={c}
                onSave={async (body) => {
                  try {
                    await api("category", body);
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
            ))}
          </details>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("settings", { max_file_size: max });
                await load();
                setNotice(
                  "Upload limit saved. It must also fit your provider’s project and bucket limits.",
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <label>
              Maximum file size in MB (1–50)
              <input
                type="number"
                min={1}
                max={50}
                required
                value={max / MiB}
                onChange={(e) => setMax(Number(e.target.value) * MiB)}
              />
            </label>
            <button className="button secondary">Save limit</button>
          </form>
          <div className="resource-actions">
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  const manifest = await api("manifest");
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(manifest, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "js-lab-resource-manifest.json";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 10000);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Export metadata manifest
            </button>
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  const result = await api<{ removed: number; failed: number }>(
                    "maintenance",
                  );
                  setNotice(
                    `Retention cleanup: ${result.removed} files removed; ${result.failed} waiting for retry.`,
                  );
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Run scheduled retention cleanup
            </button>
            <a href={guide} target="_blank" rel="noreferrer">
              Backup and setup guide
            </a>
          </div>
        </section>
      )}
      {editor && (
        <Modal title="Edit resource details" onClose={() => setEditor(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void change(editor, edit);
            }}
          >
            <MetadataFields
              value={edit}
              onChange={setEdit}
              categories={categories}
            />
            <Notice error={error} />
            <button className="button primary">Save changes</button>
          </form>
        </Modal>
      )}
      {trash && (
        <Modal title="Move resource to trash?" onClose={() => setTrash(null)}>
          <p>
            “{trash.title}” will disappear from the student library. You can
            restore it as a draft within 30 days.
          </p>
          <div className="resource-actions">
            <button className="button secondary" onClick={() => setTrash(null)}>
              Keep resource
            </button>
            <button
              className="button primary"
              onClick={() =>
                void change(trash, { ...editData(trash), status: "deleted" })
              }
            >
              Confirm move to trash
            </button>
          </div>
          <Notice error={error} />
        </Modal>
      )}
    </>
  );
}
function CategoryEditor({
  category,
  onSave,
}: {
  category: Category;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState(category.name),
    [order, setOrder] = useState(category.display_order);
  return (
    <form
      className="resource-category"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ ...category, name, display_order: order });
      }}
    >
      <label>
        Category name
        <input
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Order
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
        />
      </label>
      <button className="button secondary">Rename / reorder</button>
      <button
        type="button"
        className="text-button"
        onClick={() =>
          void onSave({ ...category, archived: !category.archived })
        }
      >
        {category.archived ? "Restore category" : "Archive category"}
      </button>
    </form>
  );
}
