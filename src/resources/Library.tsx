import {privateAccess} from '../access/session';
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, BookOpen } from "lucide-react";
import { lessons } from "../data/lessons";
import {
  catalogs,
  cloud,
  extension,
  published,
  type Category,
  type Resource,
} from "./client";
import { Notice, ResourceCard } from "./components";
import "./resources.css";
export default function Library({ chapter }: { chapter?: number }) {
  const [rows, setRows] = useState<Resource[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [selectedChapter, setChapter] = useState(chapter ? String(chapter) : ""),
    [kind, setKind] = useState(""),
    [sort, setSort] = useState("order"),
    [page, setPage] = useState(0);
  const load = useCallback(async () => {
    if (!cloud && !privateAccess) return;
    setLoading(true);
    setError("");
    try {
      const [data, meta] = await Promise.all([published(), catalogs()]);
      setRows(data);
      setCategories(meta.categories);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    let last = Date.now();
    const focus = () => {
      if (Date.now() - last > 30000) {
        last = Date.now();
        void load();
      }
    };
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [load]);
  useEffect(() => setPage(0), [query, category, selectedChapter, kind, sort]);
  const filtered = rows
    .filter(
      (r) =>
        (!selectedChapter || String(r.chapter_id) === selectedChapter) &&
        (!category || r.category_id === category) &&
        (!kind || extension(r) === kind) &&
        `${r.title} ${r.original_filename} ${r.description} ${r.lesson_id || ""} ${r.tags.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.title.localeCompare(b.title)
        : sort === "size"
          ? b.file_size - a.file_size
          : sort === "newest"
            ? b.created_at.localeCompare(a.created_at)
            : a.display_order - b.display_order ||
              b.created_at.localeCompare(a.created_at),
    );
  return (
    <section
      className="resource-page"
      aria-label={chapter ? "Additional Study Materials" : "Study Materials"}
    >
      <div className="page-intro">
        <span className="eyebrow">
          <BookOpen size={16} /> YOUR CLASSROOM LIBRARY
        </span>
        <h1>{chapter ? "Additional Study Materials" : "Study Materials"}</h1>
        <p>
          {chapter
            ? "Notes, assignments and references for this chapter."
            : "Everything you need for your JavaScript journey."}
        </p>
      </div>
      {!cloud && !privateAccess ? (
        <div className="resource-empty">
          <BookOpen size={32} />
          <h2>Study materials aren’t available yet.</h2>
          <p>
            Your lessons and exercises are ready to use. The teacher’s cloud
            library will appear here once it is connected.
          </p>
          <a href="#teacher/resources" className="text-button">
            Teacher setup
          </a>
        </div>
      ) : (
        <>
          <div className="resource-toolbar">
            <label>
              Search materials
              <input
                type="search"
                placeholder="Title, topic, filename or tag"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button
              className="button secondary"
              disabled={loading}
              onClick={() => void load()}
            >
              <RefreshCw size={15} />
              {loading ? "Refreshing…" : "Refresh materials"}
            </button>
          </div>
          <div className="resource-filters">
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
            {!chapter && (
              <label>
                Chapter
                <select
                  value={selectedChapter}
                  onChange={(e) => setChapter(e.target.value)}
                >
                  <option value="">All chapters</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.id}. {l.short}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              File type
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="">All formats</option>
                {[...new Set(rows.map(extension))].sort().map((ext) => (
                  <option key={ext}>{ext}</option>
                ))}
              </select>
            </label>
            <label>
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="order">Teacher’s order</option>
                <option value="newest">Recently added</option>
                <option value="name">Name</option>
                <option value="size">Largest first</option>
              </select>
            </label>
          </div>
          <Notice error={error} />
          <p role="status">
            {loading
              ? "Loading materials…"
              : `${filtered.length} published material${filtered.length === 1 ? "" : "s"}`}
          </p>
          {!loading && !error && !filtered.length && (
            <div className="resource-empty">
              <h2>No materials found</h2>
              <p>
                Try another search, or check back after your teacher publishes a
                resource.
              </p>
            </div>
          )}
          <div className="resource-grid">
            {filtered.slice(page * 12, page * 12 + 12).map((r) => (
              <ResourceCard key={r.id} resource={r} categories={categories} />
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
        </>
      )}
    </section>
  );
}
