import { useState } from "react";
import { advancedProjects as browserProjects } from "./projects.mjs";
import LiveApiLab from "./LiveApiLab";
import BrowserLab from "../v3/BrowserLab";
import Quiz from "../components/Quiz";
import { useLearningStorage } from "../browser/BrowserChapter";
export default function BrowserProjects({
  teacher = false,
  onAnswer = () => {},
  onComplete = () => {},
}: {
  teacher?: boolean;
  onAnswer?: (id: string, correct: boolean) => void;
  onComplete?: (id: string) => void;
}) {
  const [id, setId] = useState("v4-counter");
  return (
    <div className="v4-learning">
      <div className="page-intro">
        <span className="eyebrow">
          V4 APPLICATION ACADEMY — REASON, REQUEST, BUILD
        </span>
        <h1>Advanced concepts. Working applications.</h1>
        <p>
          Eight working browser projects. Start with a guided reference,
          practice one feature at a time, then build your own version.
        </p>
      </div>
      <label>
        Project
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {browserProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      {id === "v4-weather" && <LiveApiLab />}
      <Project
        key={id}
        id={id}
        teacher={teacher}
        onAnswer={onAnswer}
        onComplete={onComplete}
      />
    </div>
  );
}
function Project({
  id,
  teacher,
  onAnswer,
  onComplete,
}: {
  id: string;
  teacher: boolean;
  onAnswer: (id: string, correct: boolean) => void;
  onComplete: (id: string) => void;
}) {
  const p = browserProjects.find((p) => p.id === id)!;
  const [reference, setReference] = useState(true),
    [mode, setMode] = useState("guided");
  const store = useLearningStorage("project-" + id);
  return (
    <div className="v4-learning">
      <section className="v3-card">
        <h2>{p.title}</h2>
        <p>
          Problem: give a fictional user a clear way to complete the actions
          below. Expected outcome: a working interface that remains usable with
          keyboard input, handles invalid/empty data and has an honest
          storage/backend boundary.
        </p>
        <p>
          Prerequisites: chapters 15–19 for advanced reasoning and chapters
          10–14 for native DOM, events, forms, timers and non-sensitive
          persistence.
        </p>
        <label>
          Learning mode
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="guided">Guided</option>
            <option value="practice">Practice</option>
            <option value="independent">Independent</option>
          </select>
        </label>
        <h3>Requirements</h3>
        <ul>
          {p.requirements.map((r: string) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        {mode === "guided" && (
          <ol>
            <li>State the user’s goal and draw the controls/results.</li>
            <li>Read the HTML and identify stable container nodes.</li>
            <li>Write the state and pure helpers first.</li>
            <li>Register handlers or delegate from a stable ancestor.</li>
            <li>
              Render with safe text, associated errors and meaningful state
              indicators.
            </li>
            <li>Track storage/timer/listener cleanup explicitly.</li>
            <li>
              Use the test cases, introduce one bug, repair it, then export.
            </li>
          </ol>
        )}
        <Quiz question={p.question} onAnswer={onAnswer} />
        <h3>Test cases & debugging checkpoints</h3>
        <details>
          <summary>Accessibility review before exporting</summary>
          <ul>
            <li>
              Reach every action using only a keyboard; keep focus useful after
              rerendering.
            </li>
            <li>
              Associate meaningful labels with controls and explain errors in
              text.
            </li>
            <li>
              Announce loading, failure, cancellation and results through status
              messages.
            </li>
            <li>
              Keep contrast readable; provide alt text or named text poster
              placeholders.
            </li>
            <li>
              Render external strings as text and test absent/invalid fields.
            </li>
          </ul>
        </details>
        <ul>
          {p.tests.map((t: string) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p>
          Checkpoints: wrong selector, missing return, invalid stored JSON,
          duplicate listener/timer, stale expanded/selected state, lost focus
          after DOM replacement. Observe, reproduce, form one hypothesis, change
          one thing and verify.
        </p>
        <p>
          Independent challenge: add a useful feature, separate one helper, and
          write normal/boundary tests without copying the reference. Optional
          improvements: schema validation, storage recovery/export, tested
          keyboard behavior, responsive layouts and reduced motion.
        </p>
        <div className="controls wrap">
          <button
            className="button secondary small"
            onClick={() => setReference(!reference)}
          >
            {reference
              ? "Start from the editable starter"
              : "Compare the complete working reference"}
          </button>
          <button
            className="icon-label"
            onClick={() => onComplete("browser-project-" + id)}
          >
            Record project reviewed
          </button>
          <a href="#academy/workflow">Export and real deployment guidance →</a>
        </div>
        <p>
          Save any source edits before switching starter/reference. Download
          source includes real files and a labeled fictional offline API adapter
          for static hosting; isolated preview storage is separate. No real
          authentication, shared database or submission service is supplied.
        </p>
        {teacher && (
          <details>
            <summary>Instructor notes & rubric</summary>
            <p>
              15–30 minutes per project stage; split the application across
              sessions. Explain the user goal, demonstrate one requirement, ask
              the prediction, then assign a different input/feature. Expected
              answer: {p.question.explanation}
            </p>
            <p>
              Guided task: implement one requirement and one test. Homework: add
              an independent feature and document its limitations. Common
              mistakes: duplicated listeners, state/DOM disagreement and
              assuming frontend persistence is a backend.
            </p>
            <p>
              Review 0–4 each: logic, validation/failure handling,
              state/lifecycle cleanup, readable organization, accessibility and
              testing evidence. Transition: modularize and publish the exported
              project after native-browser review.
            </p>
          </details>
        )}
      </section>
      {store.error && <p role="status">{store.error}</p>}
      <BrowserLab
        key={id + reference}
        engine="native"
        apiVersion="v4"
        storageSeed={store.saved}
        onStorage={store.save}
        example={{
          ...p,
          code: reference ? p.code : p.starter,
          solution: p.code,
        }}
      />
    </div>
  );
}
