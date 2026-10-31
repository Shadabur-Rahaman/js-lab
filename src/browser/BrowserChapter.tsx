import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { browserUnits, chapterInfo, type BrowserUnit } from "./curriculum";
import BrowserLab from "../v3/BrowserLab";
import Quiz from "../components/Quiz";
import StorageExplorer from "./StorageExplorer";
import { lessons } from "../data/lessons";
import { LESSON_COUNT } from "../data/catalog.mjs";

export function useLearningStorage(scope: string) {
  const key = "js-lab-native-exercise:" + scope;
  const [saved, setSaved] = useState<Record<string, string>>(() => {
    try {
      const data = JSON.parse(localStorage.getItem(key) || "{}");
      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        Object.entries(data).length <= 100 &&
        Object.values(data).every((v) => typeof v === "string")
      )
        return data;
    } catch {}
    return {};
  });
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(saved));
        setError("");
      } catch {
        setError(
          "Learning storage could not be saved on this device. Export source and keep a copy of any fictional practice data.",
        );
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [saved, key]);
  return {
    saved,
    error,
    save: (data: Record<string, string>) =>
      setSaved((previous) =>
        JSON.stringify(previous) === JSON.stringify(data) ? previous : data,
      ),
  };
}
export function NativeExercise({
  unit,
  debug = false,
  apiVersion = "v3",
}: {
  unit: BrowserUnit;
  debug?: boolean;
  apiVersion?: "v3" | "v4";
}) {
  const store = useLearningStorage(unit.id);
  return (
    <>
      {store.error && (
        <p role="status" className="hint">
          {store.error}
        </p>
      )}
      <BrowserLab
        key={unit.id + debug}
        engine="native"
        apiVersion={apiVersion}
        storageSeed={store.saved}
        onStorage={store.save}
        example={{
          id: unit.id,
          title: (debug ? "Repair: " : "") + unit.title,
          html: unit.html,
          css: unit.css,
          code: debug ? unit.broken : unit.code,
          solution: unit.code,
          hint: unit.hint,
          task: unit.task,
        }}
      />
      <p className="muted">
        Native document APIs; isolated learning localStorage is retained for
        this exercise on this device. Run restarts the document and session
        facade. Use the Storage Explorer for native-storage lifecycle
        comparisons. No app progress or teacher data is passed into the preview.
      </p>
    </>
  );
}
export default function BrowserChapter({
  id,
  teacher,
  completed,
  concepts,
  onConcept,
  onAnswer,
  onComplete,
  extension,
}: {
  id: number;
  teacher: boolean;
  completed: boolean;
  concepts: string[];
  onConcept: (id: string) => void;
  onAnswer: (id: string, correct: boolean) => void;
  onComplete: () => void;
  extension?: {
    units: BrowserUnit[];
    chapters: typeof chapterInfo;
    renderTool: (u: BrowserUnit) => ReactNode;
  };
}) {
  const meta = (extension?.chapters || chapterInfo).find((c) => c.id === id)!;
  const units = (extension?.units || browserUnits).filter(
    (u) => u.chapter === id,
  );
  const [tab, setTab] = useState("Discover"),
    [selected, setSelected] = useState(units[0].id);
  const unit = units.find((u) => u.id === selected)!;
  const l = lessons.find((l) => l.id === id)!;
  return (
    <>
      <div className="lesson-breadcrumb">
        <a className="text-button" href="#home">
          <ArrowLeft size={14} />
          The learning path
        </a>
        <span>
          CHAPTER {id} OF {LESSON_COUNT}
        </span>
      </div>
      <div className="page-intro lesson-intro">
        <span className="eyebrow">
          {extension
            ? "V4 · ADVANCED JAVASCRIPT & API DEVELOPMENT"
            : "BROWSER DEVELOPMENT · YOUR NEXT LAYER"}
        </span>
        <h1>
          {meta.title}
          <span className="title-dot">.</span>
        </h1>
        <p>{meta.subtitle}</p>
        <div className="lesson-meta">
          <span>{meta.minutes} minutes suggested · split across classes</span>
          {completed && (
            <span>
              <CheckCircle2 size={14} />
              Completed
            </span>
          )}
        </div>
      </div>
      <div className="lesson-tabs tabs">
        {["Discover", "Experiment", "Practice", "Quick check"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Discover" ? (
        <>
          <div className="objective">
            <div>
              <span className="eyebrow">YOUR MISSION</span>
              <p>{l.objective}</p>
            </div>
          </div>
          <p>
            Work through one concept, predict what will happen, run your code,
            repair a bug, then build a small feature.
          </p>
          {units.map((u) => (
            <details className="v3-card" key={u.id}>
              <summary>
                {u.title}
                {concepts.includes(u.id) ? " · explored ✓" : ""}
              </summary>
              <h3>Why does this exist?</h3>
              <p>{u.why}</p>
              <h3>What the browser does</h3>
              <p>{u.what}</p>
              <div className="hint">Picture it: {u.analogy}</div>
              <h3>Read the syntax one step at a time</h3>
              <ol>
                {u.how.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <Quiz question={u.questions[0]} onAnswer={onAnswer} />
              <p>
                <b>Common confusion:</b> {u.misconception}
              </p>
              <p>
                <b>Independent task:</b> {u.task}
              </p>
              <p>
                <b>Remember:</b> {u.recap}
              </p>
              {"related" in u && (
                <p>
                  <b>Connect the ideas:</b> {String(u.related)}
                </p>
              )}
              <div className="controls wrap">
                <button
                  className="button primary small"
                  onClick={() => {
                    setSelected(u.id);
                    setTab("Experiment");
                  }}
                >
                  Visualize and run this concept <ArrowRight size={14} />
                </button>
                <button className="icon-label" onClick={() => onConcept(u.id)}>
                  Record concept explored
                </button>
              </div>
              {teacher && <UnitTeacher unit={u} />}
            </details>
          ))}
        </>
      ) : (
        <>
          <label className="browser-unit-select">
            Current concept
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.title}
                </option>
              ))}
            </select>
          </label>
          {tab === "Experiment" ? (
            <>
              {extension?.renderTool(unit)}
              <NativeExercise
                key={unit.id}
                unit={unit}
                apiVersion={extension ? "v4" : "v3"}
              />
              {id === 14 && <StorageExplorer />}
              <div className="v3-card">
                <h3>Build something useful</h3>
                <p>{unit.task}</p>
                <a
                  className="button secondary small"
                  href={
                    extension
                      ? "#academy/advanced-projects"
                      : "#academy/browser-projects"
                  }
                >
                  Browser applications — build real things{" "}
                  <ArrowRight size={14} />
                </a>
              </div>
            </>
          ) : tab === "Practice" ? (
            <>
              <Quiz question={unit.questions[0]} onAnswer={onAnswer} />
              <Quiz question={unit.questions[1]} onAnswer={onAnswer} />
              <h2>Observe, hypothesize, fix, verify.</h2>
              <p>{unit.hint}</p>
              <NativeExercise
                key={unit.id}
                unit={unit}
                debug
                apiVersion={extension ? "v4" : "v3"}
              />
              <div className="callout">
                <span className="eyebrow">APPLY & RECAP</span>
                <p>
                  {unit.task} {unit.recap}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="assessment-list">
                {l.quiz.map((q) => (
                  <Quiz key={q.id} question={q} onAnswer={onAnswer} />
                ))}
              </div>
              <div className="completion-panel">
                <div>
                  <h3>
                    {completed
                      ? "This chapter remains credited."
                      : "Record your browser chapter progress."}
                  </h3>
                  <p>
                    Completion is your assessment of readiness; answers and
                    explored concepts remain separate. Your earlier chapters
                    stay completed.
                  </p>
                </div>
                <button className="button primary" onClick={onComplete}>
                  Mark chapter complete
                </button>
              </div>
            </>
          )}
          {teacher && <UnitTeacher unit={unit} />}
        </>
      )}
      <details className="v3-card">
        <summary>Read the original documentation</summary>
        <ul>
          {extension && (
            <>
              <li>
                <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures">
                  MDN: closures and lexical scope
                </a>
              </li>
              <li>
                <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this">
                  MDN: this and invocation
                </a>
              </li>
              <li>
                <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises">
                  MDN: Promise coordination
                </a>
              </li>
              <li>
                <a href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch">
                  MDN: Fetch and response handling
                </a>
              </li>
            </>
          )}
          <li>
            <a href="https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model">
              MDN: the DOM
            </a>
          </li>
          <li>
            <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/innerText">
              MDN: rendered text and innerText
            </a>
          </li>
          <li>
            <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/requestSubmit">
              MDN: requestSubmit and validation
            </a>
          </li>
          <li>
            <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API">
              MDN: Web Storage
            </a>
          </li>
          <li>
            <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies">
              MDN: cookies
            </a>
          </li>
          <li>
            <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any">
              MDN: Promise.any
            </a>
          </li>
          <li>
            <a href="https://tc39.es/ecma262/">
              ECMAScript language specification
            </a>
          </li>
        </ul>
      </details>
      <div className="lesson-pagination">
        <a className="text-button" href={"#lesson/" + (id - 1)}>
          <ArrowLeft size={14} />
          Previous chapter
        </a>
        <a
          className="text-button"
          href={
            id === LESSON_COUNT
              ? "#academy/advanced-projects"
              : "#lesson/" + (id + 1)
          }
        >
          {id === LESSON_COUNT ? "Advanced applications" : "Next chapter"}
          <ArrowRight size={14} />
        </a>
      </div>
    </>
  );
}
function UnitTeacher({ unit: u }: { unit: BrowserUnit }) {
  return (
    <details className="teacher-notes v3-teacher">
      <summary>Instructor field notes · {u.title}</summary>
      <div className="notes-grid">
        <div>
          <span className="eyebrow">EXPLAIN · OBJECTIVE</span>
          <p>{u.what}</p>
          <p>Purpose: {u.why}</p>
          <p>
            Suggested duration: 15–25 minutes; use more than one class for a
            difficult API.
          </p>
          <p>Analogy: {u.analogy}</p>
        </div>
        <div>
          <span className="eyebrow">SHOW · ASK · EXPECT</span>
          <p>Show the native experiment: {u.how.join(" ")}</p>
          {u.id.startsWith("v4-") && <pre className="code">{u.code}</pre>}
          <p>Ask: {u.questions[0].prompt}</p>
          <p>Expected answer: {u.questions[0].explanation}</p>
          <p>Common mistake: {u.misconception}</p>
        </div>
        <div>
          <span className="eyebrow">GUIDE · DEBUG · HOMEWORK</span>
          <p>Guided task: change one input, predict the result, then run it.</p>
          <p>Debugging checkpoint: {u.hint}</p>
          <p>Independent practice/homework: {u.task}</p>
          <p>Recap: {u.recap}</p>
          <p>
            Transition:{" "}
            {"related" in u
              ? String(u.related)
              : "Connect the selected document data to an event, validation, timer or persistent state in the browser projects."}
          </p>
        </div>
      </div>
    </details>
  );
}
