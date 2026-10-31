import { AdvancedHub, AdvancedFinal } from "../v4/Hub";
import AdvancedProjects from "../v4/AdvancedProjects";
import LiveApiLab from "../v4/LiveApiLab";
import BrowserProjects from "../browser/BrowserProjects";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { newTopics, languageUnits } from "./language.mjs";
import { browserExamples, formExamples } from "./examples.mjs";
import { applicationProjects, projectStarter } from "./projects.mjs";
import { mergeAcademy, readAcademy, V3_KEY } from "./progress.mjs";
import BrowserLab from "./BrowserLab";
import Workspace from "./Workspace";
import { AlgorithmBuilder, Prediction, TestBench, XRay } from "./Tools";
import Playground from "../components/Playground";
import { download } from "./files.mjs";
import type { Progress } from "../hooks/useProgress";
type Props = {
  section: string;
  teacher: boolean;
  legacy: Progress;
  onImport: (p: Progress) => void;
  onAnswer: (id: string, correct: boolean) => void;
};
export default function Academy({
  section,
  teacher,
  legacy,
  onImport,
  onAnswer,
}: Props) {
  const [progress, setProgress] = useState(() => {
      try {
        return readAcademy(localStorage.getItem(V3_KEY));
      } catch {
        return readAcademy(null);
      }
    }),
    [error, setError] = useState("");
  const topic = newTopics.find((t) => t[0] === section);
  useEffect(() => {
    try {
      localStorage.setItem(
        V3_KEY,
        JSON.stringify({ ...progress, current: section || progress.current }),
      );
      setError("");
    } catch {
      setError(
        "Could not save V3 activity. Export a learning record before leaving.",
      );
    }
  }, [progress, section]);
  function done(id: string) {
    setProgress((p) => ({
      ...p,
      completed: [...new Set([...p.completed, id])],
    }));
  }
  function attempt(id: string) {
    setProgress((p) => ({
      ...p,
      attempts: { ...p.attempts, [id]: (p.attempts[id] || 0) + 1 },
    }));
  }
  return (
    <div className="v3-academy">
      <div className="page-intro">
        <span className="eyebrow">
          {["advanced", "advanced-projects", "live-api", "v4-final"].includes(
            section,
          )
            ? "JS LAB V4 · ADVANCED DEVELOPMENT"
            : "JS LAB V3 · THE NEXT LAYER"}
        </span>
        <h1>
          {topic?.[1] || "From first steps to applications"}
          <span className="title-dot">.</span>
        </h1>
        <p>
          {topic?.[2] ||
            "Your nine original chapters stay where they are. Choose one useful next skill; every path remains open."}
        </p>
      </div>
      {error && (
        <p className="error-message" role="status">
          {error}
        </p>
      )}
      <details className="v3-paths" open={!topic}>
        <summary>Explore the development paths</summary>
        <div className="v3-path-grid">
          {newTopics.map(([key, title, desc]) => (
            <a
              href={"#academy/" + key}
              key={key}
              className={"v3-card " + (section === key ? "selected" : "")}
            >
              <BookOpen size={16} />
              <h3>{title}</h3>
              <p>{desc}</p>
              <ArrowRight size={14} />
            </a>
          ))}
        </div>
      </details>
      {!topic && (
        <a className="button primary" href={"#academy/" + progress.current}>
          Resume last V3 activity <ArrowRight size={14} />
        </a>
      )}
      {section === "advanced" ? (
        <AdvancedHub
          teacher={teacher}
          legacy={legacy}
          completed={progress.completed}
          done={done}
        />
      ) : section === "advanced-projects" ? (
        <AdvancedProjects
          teacher={teacher}
          onAnswer={onAnswer}
          onComplete={done}
        />
      ) : section === "live-api" ? (
        <LiveApiLab />
      ) : section === "v4-final" ? (
        <AdvancedFinal onAnswer={onAnswer} done={done} teacher={teacher} />
      ) : section === "zero" ? (
        <>
          <section className="v3-card">
            <span className="eyebrow">
              START FROM ZERO — NO PROGRAMMING EXPERIENCE REQUIRED
            </span>
            <h2>Choose your own starting point</h2>
            <div className="v3-path-grid">
              {[
                [
                  "Absolute beginner",
                  "#academy/zero",
                  "Start with instructions, inputs and algorithms.",
                ],
                [
                  "Familiar with HTML/CSS",
                  "#academy/dom",
                  "Use code to change a page.",
                ],
                [
                  "Know programming basics",
                  "#academy/language",
                  "Extend your core language skills.",
                ],
                [
                  "Continue existing learning",
                  "#lesson/" + (legacy.current || 1),
                  "Return to the original nine chapters.",
                ],
              ].map(([title, url, text]) => (
                <a className="v3-card" href={url} key={title}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </a>
              ))}
            </div>
            <details>
              <summary>Optional starting-point check</summary>
              <Prediction
                question="What is the difference between showing HTML and running a program?"
                options={[
                  "HTML describes content; JavaScript can execute logic and react to actions",
                  "Every website is a complete backend application",
                ]}
                answer={0}
                explain="If this is familiar, try DOM or language essentials. If not, begin with the algorithm exercise. No answer restricts access."
              />
            </details>
            <p>
              HTML structures content; CSS controls presentation; JavaScript
              supplies behavior and logic. A website may use all three, but
              programs also run outside browsers. A browser client and a server
              have different APIs and responsibilities.
            </p>
          </section>
          <AlgorithmBuilder />
        </>
      ) : section === "language" ? (
        <Language done={done} teacher={teacher} />
      ) : section === "dom" ? (
        <BrowserSchool />
      ) : section === "forms" ? (
        <Forms />
      ) : section === "xray" ? (
        <XRay />
      ) : section === "async" ? (
        <AsyncSchool />
      ) : section === "storage" ? (
        <Persistence />
      ) : section === "workspace" ? (
        <Workspace completed={done} />
      ) : section === "gym" ? (
        <TestBench onPass={done} onAttempt={attempt} />
      ) : section === "debug" ? (
        <>
          <TestBench debug onPass={done} onAttempt={attempt} />
          <section className="v3-card">
            <h2>Browser and asynchronous debugging</h2>
            <p>
              Wrong selector: compare id/class spelling, and check when the DOM
              exists. Incorrect listener: pass the function instead of calling
              it during attachment. Missing UI update: confirm the handler runs,
              state changes, and rendering reads the new state. Broken requests:
              inspect status and parse only the expected format.
            </p>
            <BrowserLab
              example={{
                ...browserExamples.find((e) => e.id === "api")!,
                id: "broken-api",
                title: "Repair missing error handling",
                code: 'document.querySelector("#load").addEventListener("click", async () => {\n const response = await fetch("/api/students");\n const data = await response.json();\n document.querySelector("#status").textContent = data.length + " records";\n});',
                task: "Run the error and network scenarios. Add response.ok handling and try/catch; report an accessible error message.",
              }}
            />
          </section>
        </>
      ) : section === "browser-projects" ? (
        <BrowserProjects
          teacher={teacher}
          onAnswer={onAnswer}
          onComplete={done}
        />
      ) : section === "projects" ? (
        <ApplicationAcademy done={done} />
      ) : section === "workflow" ? (
        <Workflow />
      ) : section === "quality" ? (
        <Quality />
      ) : section === "reference" ? (
        <Reference />
      ) : section === "roadmap" ? (
        <Journey
          progress={progress}
          legacy={legacy}
          onImport={onImport}
          merge={(p) => setProgress((v) => mergeAcademy(v, p))}
        />
      ) : null}
      {section === "roadmap" && (
        <AdvancedHub
          teacher={teacher}
          legacy={legacy}
          completed={progress.completed}
          done={done}
        />
      )}
      {teacher && <Classroom section={section} />}
      <div className="v3-next">
        <p>Predict → code → run → debug → apply → revise.</p>
        <a
          className="button secondary small"
          href={
            "#academy/" +
            newTopics[
              (newTopics.findIndex((t) => t[0] === section) + 1) %
                newTopics.length
            ][0]
          }
        >
          Next development path <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
}
function Language({
  done,
  teacher,
}: {
  done: (id: string) => void;
  teacher: boolean;
}) {
  return (
    <>
      <section className="v3-card">
        <h2>Build on what you already learned</h2>
        <p>
          Chapters 1–9 already cover variables, types, operators, conditions,
          loops, functions, arrays, objects, scope, TDZ, callbacks, closures,
          this, references and copying. Use those existing lessons rather than
          repeating a second course here. These additional units introduce the
          remaining practical language tools.
        </p>
        <a href="#lesson/7">Revise functions →</a>
      </section>
      {languageUnits.map((u) => (
        <details className="v3-card" key={u.id}>
          <summary>{u.title}</summary>
          <h3>Why this exists</h3>
          <p>{u.why}</p>
          <p>{u.what}</p>
          <div className="hint">Picture it: {u.analogy}</div>
          <Prediction
            question={"What should you remember about " + u.title + "?"}
            options={u.predict}
            answer={u.answer}
            explain={u.explain}
          />
          <Playground initial={u.code} title={u.title} />
          <h3>Debug & apply</h3>
          <Playground
            initial={u.debug}
            solution={u.solution}
            title={"Repair: " + u.title}
            hint={u.explain}
          />
          <p>Independent task: {u.task}</p>
          <p>Revise: {u.takeaway}</p>
          {teacher && (
            <details className="v3-teacher">
              <summary>Instructor notes for this unit</summary>
              <p>Explain: {u.what}</p>
              <p>Analogy: {u.analogy}</p>
              <p>
                Show: run the first example, pause before its final log, and ask
                learners to choose the prediction. Expected response:{" "}
                {u.explain}
              </p>
              <p>Misconception / debugging focus: {u.takeaway}</p>
              <p>Independent exercise and homework: {u.task}</p>
              <p>
                Transition: connect the returned or validated data to a DOM
                event handler in the next development path. Allow 15–25 minutes
                and split the unit if needed.
              </p>
            </details>
          )}
          <button
            className="button secondary small"
            onClick={() => done("language-" + u.id)}
          >
            Record this unit explored
          </button>
        </details>
      ))}
    </>
  );
}
function BrowserSchool() {
  const [id, setId] = useState("heading");
  const e = browserExamples.find((x) => x.id === id)!;
  return (
    <>
      <section className="v3-card">
        <h2>Make the webpage respond to your code</h2>
        <p>
          The DOM is a tree representing a document. Select an element, read or
          change it, and render the new state. getElementById selects an id;
          querySelector returns the first CSS-selector match; querySelectorAll
          returns a static collection of matches. A missing match is null.
          textContent represents text; innerText depends on rendered
          visibility/layout in a real browser, so use native DevTools to study
          that difference.
        </p>
        <p>
          createElement creates a node; append/appendChild insert nodes; remove
          detaches them. classList changes classes, setAttribute changes
          attributes, and style changes inline CSS. innerHTML parses markup:
          never insert untrusted strings without an appropriate proven
          sanitization approach. This lab’s isolation is not a reusable
          production HTML sanitizer.
        </p>
        <div className="tabs wrap">
          {browserExamples
            .filter((e) =>
              [
                "heading",
                "style",
                "list",
                "counter",
                "input",
                "profile",
                "password",
                "keyboard",
              ].includes(e.id),
            )
            .map((e) => (
              <button
                className={e.id === id ? "active" : ""}
                key={e.id}
                onClick={() => setId(e.id)}
              >
                {e.title}
              </button>
            ))}
        </div>
      </section>
      <BrowserLab key={id} example={e} />
      <section className="v3-card">
        <h2>Events connect actions with logic</h2>
        <p>
          Use addEventListener rather than inline attributes so behavior can be
          organized and removed. Keep a function reference to
          removeEventListener. The event object describes an action;
          event.target identifies its origin, while currentTarget is the
          listener’s node during native event dispatch. preventDefault cancels a
          cancelable default action; it does not stop propagation.
        </p>
        <p>
          Practice: add a password-visibility toggle using fictional text, a
          search filter, a calculator, and a keyboard-controlled marker. Use key
          events on an appropriate focusable control, and provide non-keyboard
          alternatives. Never collect a real password here. The form, project,
          and event-flow paths supply related exercises.
        </p>
        <a href="#academy/xray">
          Explore capture, target, bubbling and delegation →
        </a>
      </section>
    </>
  );
}
function Forms() {
  const [type, setType] = useState("Student registration");
  return (
    <>
      <section className="v3-card">
        <h2>Forms that explain what happened</h2>
        <p>
          Read field value strings, validate nonempty text before Number
          conversion, use required guidance, and display errors near the
          relevant controls. Email patterns are plausibility checks, not proof
          that an address exists. Checkboxes expose checked; radio groups
          represent one choice; select controls expose a selected value. Submit
          events can be canceled with preventDefault to perform local UI logic.
        </p>
        <label>
          Practice brief
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {[
              "Student registration",
              "Contact form",
              "Job application",
              "Product order",
              "Multi-step form",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <p>
          {type === "Student registration"
            ? "Collect fictional email, marks and demo consent."
            : type === "Contact form"
              ? "Add a labeled message, validate length, and show a local success state without claiming delivery."
              : type === "Job application"
                ? "Add a role select and a required skills description, keeping all data fictional."
                : type === "Product order"
                  ? "Add a product radio group and positive integer quantity; derive a total before confirmation."
                  : "Create two visible sections with Next/Back, validate before advancing, and review values on the final step. Manage focus in the exported native-browser app."}
        </p>
        <p>
          For a password-rule exercise, use a fictional string and a
          confirmation field. Explain the rules; do not log or persist secrets.
          Client-side validation does not replace server validation,
          authentication or actual submission.
        </p>
      </section>
      <BrowserLab
        key={type}
        example={
          formExamples[
            [
              "Student registration",
              "Contact form",
              "Job application",
              "Product order",
              "Multi-step form",
            ].indexOf(type)
          ]!
        }
      />
      <section className="v3-card">
        <h3>Review by hand</h3>
        <p>
          Use only the keyboard. Check labels, error association
          (aria-describedby where useful), visible focus, required guidance, and
          a status message that makes sense without color. Test empty, invalid
          and valid inputs; clear old errors after a repair. Native validation
          and focus management must also be tested in the real exported browser
          application.
        </p>
      </section>
    </>
  );
}
function AsyncSchool() {
  const [id, setId] = useState("async");
  return (
    <>
      <section className="v3-card">
        <h2>Work that completes later</h2>
        <p>
          Synchronous code runs to completion on its stack. Timers schedule
          later tasks; a zero delay does not mean “now.” Promise reactions use
          microtasks, drained at a checkpoint before the next task. A Promise is
          pending until it fulfills or rejects; then/catch return new Promises
          and finally usually performs cleanup. async functions return Promises;
          await suspends that function, not the whole environment.
        </p>
        <div className="tabs wrap">
          {browserExamples
            .filter((e) =>
              ["async", "promises", "interval", "api"].includes(e.id),
            )
            .map((e) => (
              <button
                className={id === e.id ? "active" : ""}
                key={e.id}
                onClick={() => setId(e.id)}
              >
                {e.title}
              </button>
            ))}
        </div>
        <Prediction
          question="What is the order in the Start / timer / Promise / End example?"
          options={[
            "Start, End, Promise, Timer",
            "Start, Timer, Promise, End",
            "Timer always runs immediately",
          ]}
          answer={0}
          explain="The synchronous code finishes, then the Promise reaction runs at a microtask checkpoint, then the ready timer callback runs as a task."
        />
      </section>
      <BrowserLab
        key={id}
        example={browserExamples.find((e) => e.id === id)!}
      />
      <section className="v3-card">
        <h2>API Explorer — a contract for data</h2>
        <p>
          An API defines how software interacts. A REST-style HTTP API commonly
          identifies resources through endpoints and uses methods such as GET
          (read), POST (create), PUT (replace), PATCH (partial update) and
          DELETE (remove). Status, headers and body have distinct meanings. JSON
          is a text format, not a JavaScript object until parsed.
        </p>
        <p>
          Try /api/students, products, courses, weather, posts, tasks, countries
          or users. These are bundled fictional fixtures; no third-party request
          is sent. GET supports q, page and limit. POST/PUT/PATCH/DELETE update
          only the current worker’s mock database. Headers support content-type
          and x-source. AbortController can cancel a pending mock request. A 429
          scenario models a rate-limit response; a real API may document
          Retry-After and its own usage rules.
        </p>
        <Playground
          initial={
            'const text = JSON.stringify({ name: "Asha", marks: [80,90] });\nconst data = JSON.parse(text);\nconsole.log(data.name, data.marks.length);'
          }
          title="JSON text and JavaScript data"
        />
        <p>
          HTTP 4xx/5xx generally do not make fetch reject; check response.ok.
          Network failure can reject without a status. CORS is enforced by
          browsers and controlled by server policy; adding a client header
          cannot grant permission. Mode no-cors is not a general workaround for
          reading JSON. Render external text with textContent, and handle
          loading, empty, error, cancellation and stale-result states.
        </p>
        <p>
          Live public API mode is intentionally unavailable in this release: no
          external endpoint’s availability, CORS and permitted usage are
          promised. Export a project and follow a provider’s official API
          documentation for an optional real integration; never expose secret
          keys in frontend source.
        </p>
      </section>
    </>
  );
}
function Persistence() {
  const [value, setValue] = useState("Workshop note"),
    [memory, setMemory] = useState(""),
    [session, setSession] = useState(""),
    [local, setLocal] = useState("");
  return (
    <>
      <section className="v3-card">
        <h2>Why did my value disappear?</h2>
        <p>
          In-memory state belongs to the running page. Native sessionStorage
          normally survives a refresh within the same tab session; native
          localStorage persists across sessions until cleared or evicted,
          subject to browser settings and origin. New/duplicated tabs and
          privacy modes have additional details. Neither is a secure database or
          secret store. IndexedDB supports larger structured local records.
        </p>
        <label>
          Model value
          <input value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <div className="controls wrap">
          <button
            className="button secondary small"
            onClick={() => setMemory(value)}
          >
            Set variable
          </button>
          <button
            className="button secondary small"
            onClick={() => setSession(value)}
          >
            Set session model
          </button>
          <button
            className="button secondary small"
            onClick={() => setLocal(value)}
          >
            Set local model
          </button>
          <button className="icon-label" onClick={() => setMemory("")}>
            Model refresh
          </button>
          <button
            className="icon-label"
            onClick={() => {
              setMemory("");
              setSession("");
            }}
          >
            Model end tab session
          </button>
          <button className="icon-label" onClick={() => setLocal("")}>
            Remove local model
          </button>
        </div>
        <div className="v3-trace" aria-live="polite">
          <p>Variable: {memory || "empty"}</p>
          <p>Session model: {session || "empty"}</p>
          <p>Local model: {local || "empty"}</p>
        </div>
        <p>
          This is a teaching model in memory; clicking its buttons does not
          actually close a tab or modify native session/local storage. Use the
          application workspace to save project-scoped learning storage on this
          device.
        </p>
      </section>
      <BrowserLab example={browserExamples.find((e) => e.id === "storage")!} />
      <section className="v3-card">
        <h3>Practice projects</h3>
        <p>
          Extend the notes exercise into a bookmark manager or saved theme. Use
          JSON.stringify and JSON.parse with shape validation, catch quota/parse
          failures, and offer explicit removal/export. Try the persistent to-do
          and fictional expense projects in Application academy. Never store
          passwords, tokens or sensitive records in browser storage.
        </p>
      </section>
    </>
  );
}
function ApplicationAcademy({ done }: { done: (id: string) => void }) {
  const [id, setId] = useState("calculator"),
    [mode, setMode] = useState("guided"),
    [reference, setReference] = useState(false);
  const p = applicationProjects.find((p) => p.id === id)!;
  return (
    <>
      <section className="v3-card">
        <span className="eyebrow">APPLICATION ACADEMY</span>
        <h2>Combine the skills into something useful.</h2>
        <label>
          Project
          <select
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setReference(false);
            }}
          >
            {applicationProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} · {p.level}
              </option>
            ))}
          </select>
        </label>
        <label>
          Learning mode
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="guided">Guided</option>
            <option value="practice">Practice</option>
            <option value="independent">Independent</option>
          </select>
        </label>
        <h3>{p.title}</h3>
        <p>
          Problem: build a small interface that lets a fictional user complete
          the task described below. The supplied HTML is an initial wireframe;
          adapt its wording, structure and layout to your intended user. All
          data is local/fictional and no reference supplies authentication or a
          server database.
        </p>
        <ul>
          {p.requirements.map((r: string) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        {mode === "guided" && (
          <ol>
            <li>Write the user’s goal and identify input/output.</li>
            <li>Inspect the HTML and label each control.</li>
            <li>
              Create a state model and reusable calculation/validation helpers.
            </li>
            <li>Attach listeners, update state, render, and handle errors.</li>
            <li>
              Run the manual test cases below; repair one issue at a time.
            </li>
            <li>
              Save/export, test in a native browser, then publish explicitly.
            </li>
          </ol>
        )}
        <h3>Test and debugging tasks</h3>
        <ul>
          {p.tests.map((t: string) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p>
          Deliberately break one selector, remove one return, and test an empty
          input. Explain the resulting symptom and your verified repair. Review
          keyboard access, visible focus, labels, error/status announcements,
          narrow widths, zoom, and appropriate button/link behavior. In native
          browser code, manage focus when removing an active control or opening
          a dialog; ARIA alone does not provide keyboard behavior.
        </p>
        <p>
          Independent extension:{" "}
          {id === "capstone"
            ? "Choose another domain (tasks, student management, appointments, applications, portfolio or quiz), write your own requirements, tests and limitations, and build without the reference."
            : "Add a meaningful user feature, separate one helper into a module, and write automated tests for its logic."}
        </p>
        <div className="controls wrap">
          <button
            className="button secondary small"
            onClick={() => setReference(!reference)}
          >
            {reference
              ? "Use starter"
              : "Load complete reference as a separate view"}
          </button>
          <button
            className="icon-label"
            onClick={() => done("project-reviewed-" + id)}
          >
            Record manual review completed
          </button>
          <a href="#academy/workflow">Deployment instructions →</a>
        </div>
        <p>
          Switching starter/reference replaces this view; save or export your
          workspace edits first. Marking review records your own assessment, not
          an automatic project grade.
        </p>
      </section>
      <Workspace
        key={id + reference}
        seed={{
          id,
          title: p.title + (reference ? " — reference" : " — starter"),
          files: reference ? p.files : projectStarter(p),
        }}
        completed={done}
      />
    </>
  );
}

const workflowLinks = [
  [
    "VS Code",
    "https://code.visualstudio.com/docs/editing/getting-started/userinterface",
  ],
  [
    "Node.js",
    "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs",
  ],
  ["npm", "https://docs.npmjs.com/about-npm"],
  ["Vite", "https://vite.dev/guide/"],
  [
    "ES modules",
    "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules",
  ],
  [
    "GitHub upload",
    "https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository",
  ],
  [
    "GitHub Pages",
    "https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site",
  ],
  ["Netlify", "https://docs.netlify.com/deploy/create-deploys/"],
  ["Vercel", "https://vercel.com/docs/getting-started-with-vercel"],
  [
    "Cloudflare Pages",
    "https://developers.cloudflare.com/pages/get-started/direct-upload/",
  ],
];
function Workflow() {
  const [stage, setStage] = useState(0),
    [failure, setFailure] = useState("none");
  const stages = [
    "Project folder",
    "Source files",
    "Development server",
    "Browser",
    "Production build",
    "Hosting",
  ];
  const failures: Record<string, string> = {
    none: "Review the project at each stage; this model runs no installation or deployment commands.",
    index:
      "Missing index.html: check the actual publish directory and exact filename.",
    base: "Wrong asset base: /assets/... starts at the domain root; repository sites may need relative or configured base paths.",
    build:
      "Failed build: read the first useful build error, verify dependencies and the supported Node version, then rebuild.",
    modules:
      "Module path error: check extension, case and relative location. Native modules normally need a local server; file:// may be blocked.",
    cache:
      "Old page: confirm the new deployment succeeded, visit the correct public URL and inspect caching.",
  };
  return (
    <>
      <section className="v3-card">
        <h2>From a small script to organized development</h2>
        <p>
          JavaScript was created by Brendan Eich at Netscape in 1995 for browser
          scripting. ECMAScript specifies the core language; browsers add APIs
          such as the DOM. JavaScript engines implement the language and may
          parse, interpret and compile code. Node.js adds a runtime outside the
          browser; it does not supply a browser document.
        </p>
        <p>
          Java is a different language despite the similar name. Python and PHP
          have different syntax and ecosystems; both can run server-side, while
          JavaScript can run in browsers and in other runtimes. Choose a tool
          for its environment and problem, rather than assuming one language
          supplies every service.
        </p>
        <h3>Editor and local setup</h3>
        <ol>
          <li>
            Install VS Code from its official site for Windows, macOS or your
            Linux distribution. Open a project folder and create index.html,
            css/style.css and js/app.js. Show full filename extensions.
          </li>
          <li>
            Use syntax highlighting, autocomplete and Format Document to improve
            editing. They do not prove correctness. Save with Ctrl S
            (Windows/Linux) or ⌘ S (macOS), find with Ctrl/⌘ F, and use the
            Command Palette (Ctrl Shift P or ⌘ Shift P).
          </li>
          <li>
            A terminal is a text interface for commands in a working directory.
            Install a supported Node.js release using official instructions only
            when you need tooling. node --version and npm --version check
            installation.
          </li>
          <li>
            Create app.js containing console.log("Hello"); then run node app.js
            in its folder. document.querySelector will not work in ordinary Node
            because document is a browser API.
          </li>
          <li>
            npm manages packages. package.json records metadata and scripts.
            Dependencies support the application; development dependencies
            support development/build/test work. npm install uses that project’s
            dependency declarations; npm run lists/runs scripts. Review packages
            and avoid copying unknown installation commands.
          </li>
        </ol>
        <pre className="code">
          {
            "# Optional new Vite project (separate from this course)\nnpm create vite@latest my-app -- --template vanilla\ncd my-app\nnpm install\nnpm run dev\n# After reviewing the application:\nnpm run build\nnpm run preview"
          }
        </pre>
        <p>
          These commands run on your own computer, not inside this simulation.
          Check the current Vite guide for Node requirements and prompts. Use
          the printed local URL. A development server serves source for
          development; the production build prepares distributable assets,
          commonly in dist. Do not publish node_modules or secrets.
        </p>
        <h3>Modules connect responsibilities</h3>
        <pre className="code">
          {
            '// js/math.js\nexport function add(a,b) { return a+b; }\nexport default add;\n// js/app.js\nimport add, { add as namedAdd } from "./math.js";\nconsole.log(add(2,3), namedAdd(4,5));\n// index.html\n<script type="module" src="js/app.js"></script>'
          }
        </pre>
        <p>
          Modules have their own scope and strict semantics. Native browser
          imports need correct URLs/extensions and appropriate server responses.
          Separate data/API access, validation/logic, state, event wiring and
          rendering. For example: Add Task → validate text → update tasks array
          → save → render list. Refactor a large handler into named helpers,
          rather than duplicating logic.
        </p>
        <div className="v3-flow">
          {stages.map((s, i) => (
            <button
              className={i === stage ? "selected" : ""}
              key={s}
              onClick={() => setStage(i)}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>
        <label>
          Investigate a failure
          <select value={failure} onChange={(e) => setFailure(e.target.value)}>
            {Object.keys(failures).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <p aria-live="polite">
          {stages[stage]}: {failures[failure]}
        </p>
        <button
          className="button secondary small"
          onClick={() => setStage((stage + 1) % stages.length)}
        >
          Next workflow stage
        </button>
      </section>
      <section className="v3-card">
        <h2>Version history, GitHub & explicit publication</h2>
        <p>
          Git records version history locally; GitHub can host a remote
          repository. A commit records staged changes. A branch is a line of
          development. Clone creates a local copy with history; push transfers
          local commits; pull integrates remote work. Read differences before
          merging or restoring, and coordinate with collaborators.
        </p>
        <ol>
          <li>
            Export and extract a project. Open it through a local server for ES
            modules; test the native browser app.
          </li>
          <li>
            Create a GitHub account/repository on GitHub itself. Choose the
            audience deliberately. Use Add file → Upload files to upload the
            website files, preserving folders; describe the change in a commit
            message.
          </li>
          <li>
            Add a README explaining purpose, setup, limits and credits.
            .gitignore prevents selected untracked files being added; it cannot
            erase already committed secrets. Never commit passwords or API keys.
          </li>
          <li>
            For plain static files on GitHub Pages, use Settings → Pages, the
            appropriate branch and directory. If an existing repository uses
            Actions, keep its workflow. For a Vite app, deploy the built output
            with the appropriate base path and workflow.
          </li>
          <li>
            Netlify, Vercel and Cloudflare Pages offer their own
            repository/import or prepared-file workflows. Follow the current
            official guide, inspect publish/build settings and check
            account/plan conditions. No fixed pricing or perpetual free service
            is promised.
          </li>
          <li>
            Wait for real provider success, then visit its public HTTPS URL.
            Test routes, imports, images, keyboard access and errors. Make a
            small update, republish, and verify the new version.
          </li>
        </ol>
        <details>
          <summary>Optional command-line Git workflow</summary>
          <pre className="code">
            {
              'git init\ngit status\ngit add index.html css/ js/ README.md\ngit commit -m "Add first application"\n# Create an empty remote repository, then use its own URL:\ngit remote add origin YOUR_REPOSITORY_URL\ngit branch -M main\ngit push -u origin main\n# To work with an existing repository instead:\ngit clone YOUR_REPOSITORY_URL\ngit pull'
            }
          </pre>
          <p>
            Replace the repository placeholder yourself. Authentication belongs
            to Git/GitHub’s supported tools. Use history and restore workflows
            carefully; do not overwrite collaborators’ work.
          </p>
        </details>
        <p>
          Frontend environment variables included in a build are public
          configuration, not secret storage. A static application does not gain
          a database, message service or secure login merely by being hosted.
          Real private data and authorization need appropriate trusted
          infrastructure. This course does not upload or publish learner
          projects automatically.
        </p>
        <h3>Maintained official instructions</h3>
        <div className="v3-link-grid">
          {workflowLinks.map(([name, url]) => (
            <a key={name} target="_blank" rel="noreferrer" href={url}>
              {name} ↗
            </a>
          ))}
        </div>
        <p>
          Platform guidance checked against official sources on 31 October 2026.
          Interfaces and requirements may change; consult the linked source
          before installing or publishing.
        </p>
      </section>
    </>
  );
}
function Quality() {
  return (
    <>
      <section className="v3-card">
        <h2>Make the safe path understandable</h2>
        <p>
          Frontend source is visible to visitors. A client-side access-code
          check can deter casual use but cannot enforce trusted authorization.
          Keep API secrets off public source. Client validation helps users;
          servers must enforce their own rules. CORS is an origin access policy,
          not authentication.
        </p>
        <Prediction
          question="An API returns a name containing HTML. Which is the safer way to display it as text?"
          options={[
            "element.textContent = data.name",
            "element.innerHTML = data.name",
          ]}
          answer={0}
          explain="textContent inserts text. innerHTML parses markup; untrusted markup requires an appropriate proven policy/sanitizer and careful context handling."
        />
        <Prediction
          question="Is a secret safe if it is placed in a frontend environment variable?"
          options={[
            "Yes",
            "No, values bundled into frontend output are public",
          ]}
          answer={1}
          explain="Build-time substitution does not make a secret private. Use a trusted service for secret-dependent operations."
        />
        <p>
          HTTPS protects the connection; it does not make a dishonest page
          trustworthy. Review dependencies and their permissions. Use fictional
          records, handle errors clearly, and avoid retaining unnecessary data.
          Browser storage is readable by scripts with that origin’s privileges
          and may be cleared or evicted.
        </p>
        <Playground
          initial={
            'const untrusted = "<img src=x onerror=bad()>";\nconsole.log("Treat as text:", untrusted);\nconst data = JSON.parse(\'{"name":"Asha"}\');\nconsole.log(typeof data.name === "string");'
          }
          title="Validate data before using it"
        />
      </section>
      <section className="v3-card">
        <h2>An interactive interface must remain usable</h2>
        <p>
          Use native buttons for actions and links for navigation. Labels should
          remain visible. Provide understandable errors, aria-describedby
          relationships where needed, status announcements, useful
          loading/disabled states, and alternatives to mouse-only gestures. ARIA
          does not supply missing keyboard behavior.
        </p>
        <ul>
          <li>
            Counter: buttons work with keyboard; announce a useful status
            without overwhelming the user.
          </li>
          <li>
            Search: show loading, result count, no-results and error states; do
            not silently move focus on every keystroke.
          </li>
          <li>
            Removal: in the native app, move focus to an appropriate remaining
            control if the active element is removed.
          </li>
          <li>
            Modal: use a suitable native dialog or tested accessible pattern,
            initial focus, keyboard containment where appropriate, Escape, and
            return focus. The bridge does not emulate native dialogs.
          </li>
          <li>
            Menu: use the correct semantic pattern; a simple navigation list
            need not pretend to be an application menu.
          </li>
          <li>
            Motion and layout: honor reduced-motion preferences, test narrow
            widths, zoom, contrast and visible focus.
          </li>
        </ul>
        <p>
          Exercise: extend the accessible counter and form examples. Review with
          keyboard and assistive technology in the native exported app. Test
          success, invalid input, loading, empty data and errors. Automated
          structure checks alone cannot guarantee accessibility.
        </p>
        <a href="#academy/dom">Practice a counter and dynamic status →</a>
      </section>
    </>
  );
}
const help = [
  [
    "undefined",
    "A binding or property may have no assigned value, or a function may return no explicit result. Inspect where the value comes from.",
    "A labeled shelf may exist before a useful item is placed on it.",
    "console.log((() => {})());",
    "lesson/3",
  ],
  [
    "return",
    "Return leaves the current function and supplies its result to the caller. console.log displays a value but does not return it.",
    "Hand a result back to the person who requested it.",
    "function double(n){return n*2;}\nconsole.log(double(4));",
    "lesson/7",
  ],
  [
    "map vs forEach",
    "map returns a new array of callback results. forEach returns undefined and is normally used for effects.",
    "Make a new set of labels versus visit each item to do a job.",
    "console.log([1,2].map(n=>n*2));\nconsole.log([1,2].forEach(n=>n*2));",
    "lesson/8",
  ],
  [
    "Variable and scope",
    "A binding associates a name with a value; scope controls where that name is accessible. const prevents reassignment, not object mutation.",
    "A labeled locker in a particular room.",
    'const user={name:"Asha"};\nuser.name="Mira";\nconsole.log(user.name);',
    "lesson/3",
  ],
  [
    "Loop never stops",
    "Check initialization, condition and update. A condition that stays true without break can run indefinitely.",
    "A repeated job needs a clear stopping signal.",
    "for(let i=0;i<3;i++)console.log(i);",
    "lesson/6",
  ],
  [
    "await",
    "await waits within an async function or module context; it does not block the entire environment. Handle rejected Promises.",
    "Wait for your order while the rest of the workshop continues.",
    "async function read(){return await Promise.resolve(3);}\n// Run async examples in the Async lab.",
    "academy/async",
  ],
  [
    "DOM null",
    "The selector matched no element, or ran before the element existed. Compare spelling and readiness before using a property.",
    "Directions to a room that is not in this building.",
    '// In Live DOM Lab:\nconst title=document.querySelector("h1");\nif(title)title.textContent="Ready";',
    "academy/dom",
  ],
  [
    "Event listener",
    "Pass a function to addEventListener; do not call it when attaching it. Remove it with the same function reference.",
    "Leave instructions to run when the bell rings.",
    '// In Live DOM Lab:\nbutton.addEventListener("click", handler);',
    "academy/dom",
  ],
  [
    "Promise",
    "Represents an eventual result. It settles once, fulfilled or rejected; reaction callbacks run asynchronously.",
    "A claim ticket for a result that is not ready yet.",
    "// Async lab:\nPromise.resolve(3).then(console.log);",
    "academy/async",
  ],
  [
    "fetch and JSON",
    "fetch yields a Response. Check status, then parse JSON and validate the resulting shape. Network and HTTP failures differ.",
    "Receive a parcel, inspect its label, then unpack its contents.",
    '// API lab:\nconst response=await fetch("/api/students");',
    "academy/async",
  ],
  [
    "Storage",
    "Serialize suitable data, validate on read, catch quota errors, and never store secrets. Local state is not a backend database.",
    "A notebook kept on this device, not a shared cloud archive.",
    'console.log(JSON.stringify({theme:"dark"}));',
    "academy/storage",
  ],
  [
    "Modules",
    "Named/default exports organize responsibilities; imports use module URLs and module scope.",
    "Separate tool drawers with explicitly shared tools.",
    "// Workspace:\nexport const add=(a,b)=>a+b;",
    "academy/workspace",
  ],
];
function Reference() {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState(0),
    [run, setRun] = useState(false);
  const entry = help[selected];
  return (
    <>
      <section className="v3-card">
        <span className="eyebrow">
          EXPLAIN IT SIMPLY · CURATED, NOT GENERATIVE AI
        </span>
        <h2>Find the idea behind the syntax.</h2>
        <label>
          Search concepts and common errors
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="v3-reference">
          <div>
            {help.map((h, i) =>
              h.join(" ").toLowerCase().includes(query.toLowerCase()) ? (
                <button
                  key={h[0]}
                  className={selected === i ? "selected" : ""}
                  onClick={() => {
                    setSelected(i);
                    setRun(false);
                  }}
                >
                  {h[0]}
                </button>
              ) : null,
            )}
          </div>
          <article>
            <h3>{entry[0]}</h3>
            <p>{entry[1]}</p>
            <p>Picture it: {entry[2]}</p>
            <pre className="code">{entry[3]}</pre>
            <p>
              Practical task: explain this example, change one input, predict
              its result, then verify in the related lesson. Review the
              prerequisite before moving on.
            </p>
            <a href={"#" + entry[4]}>
              Related lesson / correct execution mode →
            </a>
            {entry[4].startsWith("lesson") && (
              <button
                className="button secondary small"
                onClick={() => setRun(!run)}
              >
                Run this example
              </button>
            )}
          </article>
        </div>
        {run && <Playground initial={entry[3]} />}
        <p>
          For keywords, operators, primitive types, array/object methods and
          syntax tables, use the original cheat sheet and V2 concept sections;
          these links extend them rather than duplicating the course.
        </p>
        <a href="#cheatsheet">Open the original cheat sheet →</a>
        <p>
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/JavaScript"
            target="_blank"
            rel="noreferrer"
          >
            MDN JavaScript reference ↗
          </a>{" "}
          ·{" "}
          <a href="https://tc39.es/ecma262/" target="_blank" rel="noreferrer">
            ECMAScript specification ↗
          </a>
        </p>
      </section>
      <section className="v3-card">
        <h2>Interview & revision practice</h2>
        <Prediction
          question="A closure keeps access to what?"
          options={[
            "Its lexical environment, even after the outer function returns",
            "A copied screenshot of every global variable",
          ]}
          answer={0}
          explain="The inner function retains access to bindings in its lexical environment. Try two independent counters, then explain why their states differ."
        />
        <Prediction
          question="Which statement about const and objects is correct?"
          options={[
            "const makes all nested data immutable",
            "const prevents binding reassignment; object properties can still change",
          ]}
          answer={1}
          explain="Const restricts reassignment. Revisit references, shallow copies and structuredClone limitations in chapter 9."
        />
        <Prediction
          question="Can try/catch around a non-awaited Promise always catch a later rejection?"
          options={[
            "Yes",
            "No; handle or await the Promise in the relevant async path",
          ]}
          answer={1}
          explain="An asynchronous rejection needs its own catch or an awaited Promise inside try/catch. Try the rejected Promise example."
        />
        <p>
          Follow-up tasks: refactor a duplicated calculation into a function;
          debug a missing return; write a tested search helper; explain the
          event loop’s output without relying on a trick environment. Beginner
          competence and advanced expertise are different goals. The Logic Gym
          supplies written-function and debugging assessments with actual cases.
        </p>
      </section>
    </>
  );
}
function Journey({
  progress,
  legacy,
  onImport,
  merge,
}: {
  progress: ReturnType<typeof readAcademy>;
  legacy: Progress;
  onImport: (p: Progress) => void;
  merge: (p: ReturnType<typeof readAcademy>) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const stages = [
    ["Programming zero", "zero"],
    ["Core JavaScript", "language"],
    ["Reusable programming", "language"],
    ["Interactive web", "dom"],
    ["Application state", "storage"],
    ["Connected applications", "async"],
    ["Developer workflow", "workflow"],
    ["Software quality", "gym"],
    ["Real projects", "projects"],
    ["Publishing", "workflow"],
    ["Next steps", "reference"],
  ];
  return (
    <section className="v3-card">
      <h2>Your learning evidence stays with you.</h2>
      <p>
        Old nine-chapter completions and quiz records are retained under their
        existing storage key. V3 records supported exercises separately.{" "}
        {progress.completed.length} V3 activities have evidence; attempts are
        counted independently of completion.
      </p>
      <div className="v3-path-grid">
        {stages.map(([title, path], i) => (
          <a className="v3-card" key={title} href={"#academy/" + path}>
            <small>STAGE {i}</small>
            <h3>{title}</h3>
          </a>
        ))}
      </div>
      <h3>Recommended revision</h3>
      {Object.entries(progress.attempts).filter(
        ([k, v]) => v > 0 && !progress.completed.includes(k),
      ).length ? (
        <ul>
          {Object.entries(progress.attempts)
            .filter(([k, v]) => v > 0 && !progress.completed.includes(k))
            .map(([k, v]) => (
              <li key={k}>
                {k}: {v} attempts; revisit the contract and first failing edge
                case.
              </li>
            ))}
        </ul>
      ) : (
        <p>
          Start with a Logic Gym checkpoint, or revise scope, return values and
          data transformations in the existing chapters.
        </p>
      )}
      <button
        className="button secondary small"
        onClick={() =>
          download(
            JSON.stringify(
              { format: "js-lab-backup-v3", legacy, academy: progress },
              null,
              2,
            ),
            "js-lab-progress.json",
            "application/json",
          )
        }
      >
        Export my progress
      </button>
      <button className="icon-label" onClick={() => input.current?.click()}>
        Import and merge progress
      </button>
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept=".json"
        aria-label="Import learning progress"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            if (file.size > 500000)
              throw Error("Progress backup must be under 500 KB.");
            const p = JSON.parse(await file.text());
            if (p.format !== "js-lab-backup-v3")
              throw Error("This is not a JS LAB V3 progress backup.");
            if (
              !confirm(
                "Merge this backup with progress on this device? Current completions will be retained.",
              )
            )
              return;
            merge(readAcademy(JSON.stringify(p.academy)));
            onImport(p.legacy);
            setMessage(
              "Valid progress records merged. Project files remain separate; import their ZIPs in the workspace.",
            );
          } catch (error) {
            setMessage((error as Error).message);
          }
          e.target.value = "";
        }}
      />
      <p role="status">{message}</p>
      <details>
        <summary>Recorded V3 activities</summary>
        <ul>
          {progress.completed.map((k) => (
            <li key={k}>✓ {k}</li>
          ))}
        </ul>
      </details>
      <p>
        Clearing browser data or moving devices separates progress and projects.
        Back up both. This learning record is not a credential, attendance
        service or verified deployment receipt. Use the existing Reset progress
        control for original lessons; V3 can be reset separately with
        confirmation.
      </p>
      <button
        className="icon-label"
        onClick={() => {
          if (
            confirm(
              "Clear V3 activity on this device? Export first. Original lesson progress and saved project files will remain.",
            )
          ) {
            localStorage.removeItem(V3_KEY);
            location.reload();
          }
        }}
      >
        Reset V3 activity only
      </button>
      <h3>Continue beyond this course</h3>
      <p>
        Consider TypeScript for static type checking, React for larger
        interfaces, backend development for trusted services, databases for
        shared persistent data, and deeper testing and deployment workflows.
        These are optional next studies, not prerequisites for your first
        application.
      </p>
    </section>
  );
}
const sessionTitles = [
  "Programming and JavaScript",
  "Variables and types",
  "Operators and expressions",
  "Conditions",
  "Loops",
  "Functions",
  "Arrays",
  "Objects",
  "DOM manipulation",
  "Events",
  "Form handling",
  "State and storage",
  "Asynchronous JavaScript",
  "APIs and JSON",
  "Debugging and testing",
  "Modules and tools",
  "Application development",
  "GitHub and deployment",
];
function Classroom({ section }: { section: string }) {
  const [session, setSession] = useState(0);
  const matching = languageUnits.find(
    (u) => section === "language" && u.id === "strict",
  );
  const sheet = `JS LAB V3 classroom sheet\nSession: ${sessionTitles[session]}\nExplain one idea in simple English; use a familiar analogy.\nShow the exact example in the current path: ${section}.\nAsk for an output prediction before running it.\nExpected answer: use the explanation beside the question, then verify with the actual runner.\nCommon mistake: confusing printed output, returned values, and visible UI changes.\nGuided task: change one input and explain the result.\nIndependent homework: add a meaningful feature and normal/boundary tests without copying the reference.\nTransition: explain how this skill contributes to the next application layer.\n\n60 minutes: 5 recall, 10 explanation, 10 demo, 15 guided code, 10 independent work, 5 debugging, 5 recap. Split as needed.\n\nProject rubric (0–4 each): correct logic; input/error handling; readable responsibilities; accessible interface; testing evidence.\nNo centralized grading, attendance, or classroom sync. Learners export their own records.\n`;
  return (
    <details className="v3-card v3-teacher">
      <summary>Instructor field guide · V3 classroom</summary>
      <label>
        Suggested session
        <select value={session} onChange={(e) => setSession(+e.target.value)}>
          {sessionTitles.map((t, i) => (
            <option key={t} value={i}>
              {i + 1}. {t}
            </option>
          ))}
        </select>
      </label>
      <h3>{sessionTitles[session]}</h3>
      <p>
        Explain:{" "}
        {matching?.what ||
          "Name the input, the transformation, the expected output, and the environment in which the code runs."}
      </p>
      <p>
        Analogy:{" "}
        {matching?.analogy ||
          "A workshop receives a request, follows a procedure, updates its record, and shows a result."}
      </p>
      <p>
        Show: run the current path’s exact example, then alter one input. Ask
        learners to predict before each run. Expected answer: use the authored
        explanation and compare the actual result. Do not treat simulations as
        arbitrary debuggers or real external deployments.
      </p>
      <p>
        Common mistake: confusing console output with return values or DOM
        changes. Ask: “Who receives this value?” Expected response: console.log
        prints, return supplies a caller, textContent changes the document.
      </p>
      <p>
        Exercise: pairs explain a failed test and change one thing;
        independently build a small extension and test normal, empty and
        boundary inputs. Homework: export the project and write a README
        explaining its limits. Transition: connect the current concept to event
        → logic → state → render.
      </p>
      <p>
        60-minute structure: 5 recall, 10 analogy, 10 demo, 15 guided code, 10
        independent task, 5 debugging, 5 recap. Adjust, subdivide, or repeat
        sessions. Teacher mode retains the existing timer, presentation controls
        and access code.
      </p>
      <button
        className="button secondary small"
        onClick={() => download(sheet, "js-lab-classroom-sheet.txt")}
      >
        Download practice sheet & project rubric
      </button>
      <p>
        Classroom information is device-local. No live synchronization,
        attendance or central gradebook is implied.
      </p>
    </details>
  );
}
