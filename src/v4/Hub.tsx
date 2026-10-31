import { useState } from "react";
import { advancedChapters, finalQuestions } from "./curriculum";
import { advancedStages } from "./models.mjs";
import Quiz from "../components/Quiz";
import type { Progress } from "../hooks/useProgress";
const sessions = [
  "Global, function and block scope",
  "Execution context and scope chain",
  "Closures and private state",
  "Practical closure projects",
  "Regular and arrow receivers",
  "bind, call, apply and events",
  "Callbacks and asynchronous boundaries",
  "Promise lifecycle and chaining",
  "async/await and recovery",
  "Concurrency and event loop",
  "HTTP and Fetch",
  "GET, POST, JSON and statuses",
  "Provider contracts and safe rendering",
  "Dependent requests and recovery",
  "Weather application",
  "Movie fixture / TV data cards",
  "Independent API capstone",
  "Debugging, testing and deployment",
];
export function AdvancedHub({
  teacher,
  legacy,
  completed,
  done,
}: {
  teacher: boolean;
  legacy: Progress;
  completed: string[];
  done: (id: string) => void;
}) {
  const [session, setSession] = useState(0);
  return (
    <section className="v3-card">
      <span className="eyebrow">
        V4 — ADVANCED UNDERSTANDING THROUGH PRACTICE
      </span>
      <h2>Follow the values. Own the asynchronous work.</h2>
      <p>
        Continue after chapters 1–14. Earlier progress remains credited. These
        chapters deepen the existing scope, binding and async foundations rather
        than replacing them.
      </p>
      <div className="v3-path-grid">
        {advancedChapters.map((chapter) => (
          <a
            className="v3-card"
            href={"#lesson/" + chapter.id}
            key={chapter.id}
          >
            <h3>
              {chapter.id}. {chapter.short}
              {legacy.completed.includes(chapter.id) ? " ✓" : ""}
            </h3>
            <p>{chapter.subtitle}</p>
          </a>
        ))}
      </div>
      <h3>Advanced learning stages</h3>
      <ol>
        {advancedStages.map((stage, i) => (
          <li key={stage}>
            <b>{stage}</b>{" "}
            {completed.includes("v4-stage-" + i) ? "Reviewed ✓" : ""}
            <p>
              Evidence: explain the idea, predict a new case, repair a bug and
              demonstrate an independently changed feature.
            </p>
            <button
              className="icon-label"
              onClick={() => done("v4-stage-" + i)}
            >
              Record stage {i + 1} evidence reviewed
            </button>
          </li>
        ))}
      </ol>
      <div className="controls wrap">
        <a className="button primary small" href="#academy/advanced-projects">
          Build advanced projects
        </a>
        <a className="button secondary small" href="#academy/live-api">
          Optional Live API Lab
        </a>
        <a className="button secondary small" href="#academy/v4-final">
          V4 final challenge
        </a>
        <a href="#academy/roadmap">Existing progress backup & export →</a>
      </div>
      <p>
        Stage review is self-reported, not a certification. Use tested project
        behavior and your own explanations as evidence. All lessons remain open
        for revision.
      </p>
      {teacher && (
        <details className="v3-teacher">
          <summary>V4 instructor session planner</summary>
          <label>
            Suggested advanced session
            <select
              value={session}
              onChange={(e) => setSession(+e.target.value)}
            >
              {sessions.map((s, i) => (
                <option key={s} value={i}>
                  {i + 1}. {s}
                </option>
              ))}
            </select>
          </label>
          <h3>{sessions[session]}</h3>
          <p>
            Allow 45–75 minutes, subdividing as needed. Start with five minutes
            of recall, explain one mental model, ask a prediction before running
            the exact unit source, then guide one repair and assign a different
            input or feature. Use each unit’s authored field notes for the
            speaking script, analogy, expected response, misconception and
            transition.
          </p>
          <p>
            Homework: build an independent extension and record normal,
            boundary, error and cleanup behavior. Review 0–4 each: reasoning,
            correctness, readable source, validation/failure ownership,
            accessibility and testing evidence. Keep existing timer and
            presenter controls.
          </p>
        </details>
      )}
      <details>
        <summary>Documentation & provider boundaries</summary>
        <p>
          <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures">
            MDN closures
          </a>{" "}
          ·{" "}
          <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this">
            this
          </a>{" "}
          ·{" "}
          <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises">
            Promises
          </a>{" "}
          ·{" "}
          <a href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch">
            Fetch
          </a>{" "}
          · <a href="https://tc39.es/ecma262/">ECMAScript</a>
        </p>
        <p>
          Live providers are optional and can be unavailable. Editable native
          code uses fictional offline endpoints. The separate controlled
          integration only permits approved keyless GET operations.
          TMDB/OpenWeather private credentials and an authenticated backend are
          deliberately not included.
        </p>
      </details>
    </section>
  );
}
export function AdvancedFinal({
  onAnswer,
  done,
  teacher,
}: {
  onAnswer: (id: string, correct: boolean) => void;
  done: (id: string) => void;
  teacher: boolean;
}) {
  return (
    <section>
      <div className="page-intro">
        <span className="eyebrow">ALL FIVE ADVANCED AREAS</span>
        <h1>V4 final challenge.</h1>
        <p>
          Reason about scope, receivers, Promise ownership and response
          handling. Explain each answer, then build and test one independently
          changed capstone feature.
        </p>
      </div>
      {finalQuestions.map((q) => (
        <Quiz question={q} key={q.id} onAnswer={onAnswer} />
      ))}
      <div className="v3-card">
        <h2>Practical final challenge</h2>
        <p>
          Build an API explorer with a private state helper, a clearly chosen
          function receiver, safe DOM rendering, validated input, owned async
          requests, cancellation, HTTP/parse/schema handling, an empty state and
          an accessible result announcement. Add at least one feature that is
          absent from the reference. Test normal input, a boundary, HTTP
          failure, malformed data and stale/cancelled work. Export source, serve
          it on your own origin and explain how its real API/backend differs
          from the offline preview.
        </p>
        <a href="#academy/advanced-projects">Open the capstone starter →</a>
        <button
          className="button secondary small"
          onClick={() => done("v4-final-practical")}
        >
          Record practical evidence reviewed
        </button>
        {teacher && (
          <p>
            Instructor review: ask the learner to trace one captured binding,
            one receiver, one Promise rejection path and one request dependency.
            Assess both test evidence and explanation; a copied reference alone
            is insufficient.
          </p>
        )}
      </div>
    </section>
  );
}
