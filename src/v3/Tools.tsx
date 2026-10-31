import { useEffect, useRef, useState } from "react";
import { runCode } from "../utils/sandbox";
import { challenges, bugPrograms } from "./challenges.mjs";
import Playground, { Code } from "../components/Playground";
export function Prediction({
  question,
  options,
  answer,
  explain,
}: {
  question: string;
  options: string[];
  answer: number;
  explain: string;
}) {
  const [choice, setChoice] = useState<number | null>(null);
  return (
    <div className="v3-predict">
      <h3>Predict before running</h3>
      <p>{question}</p>
      <div className="controls wrap">
        {options.map((text, i) => (
          <button
            className={
              "button small " + (choice === i ? "primary" : "secondary")
            }
            key={text}
            onClick={() => setChoice(i)}
          >
            {text}
          </button>
        ))}
      </div>
      {choice !== null && (
        <p role="status">
          {choice === answer ? "✓ Correct. " : "Reconsider. "}
          {explain}
        </p>
      )}
    </div>
  );
}
const steps = [
  "Read marks",
  "Validate marks",
  "Compare with pass threshold",
  "Display Pass or Fail",
];
export function AlgorithmBuilder() {
  const [order, setOrder] = useState([2, 0, 3, 1]),
    [marks, setMarks] = useState("62"),
    [result, setResult] = useState(""),
    [flow, setFlow] = useState("marks");
  const drag = useRef(0);
  const correct = order.every((n, i) => n === i);
  function move(i: number, j: number) {
    if (j < 0 || j >= 4) return;
    setOrder((o) => {
      const next = [...o];
      const [value] = next.splice(i, 1);
      next.splice(j, 0, value);
      return next;
    });
  }
  const number = Number(marks),
    valid =
      marks.trim() !== "" &&
      Number.isFinite(number) &&
      number >= 0 &&
      number <= 100;
  const source =
    'const raw = "' +
    marks.replace(/["\\\n\r]/g, "") +
    '";\nconst marks = Number(raw);\nif (!raw.trim() || !Number.isFinite(marks) || marks < 0 || marks > 100) {\n console.log("Invalid marks");\n} else {\n console.log(marks >= 40 ? "Pass" : "Fail");\n}';
  return (
    <section className="v3-card">
      <span className="eyebrow">FROM EVERYDAY INSTRUCTIONS TO CODE</span>
      <h2>Build a small algorithm</h2>
      <p>
        An algorithm is a sequence of precise steps. Preparing tea uses
        sequence; checking a traffic signal uses selection; comparing every exam
        mark uses iteration. Inputs are supplied facts, processing transforms
        them, and output is a result. Programming expresses such logic in a
        language a computer can execute.
      </p>
      <p>
        Hardware is physical equipment; software provides instructions. Source
        code is the text you write. Running code asks an engine to execute it.
        Syntax describes permitted forms; runtime behavior is what happens when
        it executes. A bug can be a syntax error, an exception, or simply the
        wrong result.
      </p>
      <p>
        Arrange the examination algorithm by dragging or using the
        keyboard-accessible Move controls.
      </p>
      <ol className="v3-blocks">
        {order.map((n, i) => (
          <li
            key={n}
            draggable
            onDragStart={() => {
              drag.current = i;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => move(drag.current, i)}
          >
            <b>{steps[n]}</b>
            <span>
              <button
                aria-label={`Move ${steps[n]} up`}
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
              >
                ↑
              </button>
              <button
                aria-label={`Move ${steps[n]} down`}
                disabled={i === 3}
                onClick={() => move(i, i + 1)}
              >
                ↓
              </button>
            </span>
          </li>
        ))}
      </ol>
      <label>
        Marks input
        <input value={marks} onChange={(e) => setMarks(e.target.value)} />
      </label>
      <button
        className="button primary small"
        onClick={() =>
          setResult(
            correct
              ? valid
                ? number >= 40
                  ? "Pass"
                  : "Fail"
                : "Invalid marks"
              : "Read and validate first, then compare, then display the result.",
          )
        }
      >
        Run blocks
      </button>
      <p role="status">{result}</p>
      <label>
        Supported flowchart
        <select value={flow} onChange={(e) => setFlow(e.target.value)}>
          <option value="marks">Pass/fail decision</option>
          <option value="sum">Sum 1 to 3 loop</option>
        </select>
      </label>
      <div className="v3-flow">
        {(flow === "marks"
          ? [
              "Start",
              "Input marks",
              "Process: convert and validate",
              "Decision: valid? → if not, display error",
              "Decision: marks ≥ 40?",
              "Output: Pass / Fail",
              "End",
            ]
          : [
              "Start",
              "Process: sum=0, i=1",
              "Decision: i ≤ 3?",
              "Yes → sum=sum+i → i=i+1 → repeat decision",
              "No → output sum=6",
              "End",
            ]
        ).map((text, i) => (
          <div
            key={text}
            className={text.startsWith("Decision") ? "decision" : ""}
          >
            <small>{i + 1}</small>
            {text}
          </div>
        ))}
      </div>
      <p>
        Pseudocode:{" "}
        {flow === "marks"
          ? "READ marks; IF invalid DISPLAY error; ELSE IF marks ≥ 40 DISPLAY Pass; ELSE DISPLAY Fail."
          : "SET sum=0; FOR i from 1 through 3 ADD i to sum; DISPLAY sum."}
      </p>
      <Code>
        {flow === "marks"
          ? source
          : "let sum = 0;\nfor (let i = 1; i <= 3; i++) sum += i;\nconsole.log(sum);"}
      </Code>
      <p>
        The diagram and code conversion support these two authored exercises
        only. Change the input, predict the path, then test the equivalent
        JavaScript below.
      </p>
      <Playground
        initial={
          flow === "marks"
            ? source
            : "let sum=0;\nfor(let i=1;i<=3;i++)sum+=i;\nconsole.log(sum);"
        }
        title="From blocks to JavaScript"
      />
      <Prediction
        question="Why validate marks before comparing them?"
        options={[
          "Invalid input can otherwise produce a misleading result",
          "Computers know the intended range automatically",
        ]}
        answer={0}
        explain="Programs follow the rules you write. Validate empty text, type and range before applying the pass threshold."
      />
    </section>
  );
}
export const traces = {
  function: {
    code: "function add(a,b) { return a+b; }\nconst result=add(10,20);\nconsole.log(result);",
    frames: [
      [
        "Prepare bindings",
        "Global",
        "add → function; result uninitialized",
        "",
      ],
      ["Call add(10,20)", "Global → add", "a=10; b=20", ""],
      ["Evaluate a+b", "Global → add", "return value=30", ""],
      ["Return to caller", "Global", "result=30", ""],
      ["Print result", "Global", "result=30", "30"],
    ],
  },
  closure: {
    code: "function counter(){ let n=0; return ()=>++n; }\nconst next=counter();\nconsole.log(next());\nconsole.log(next());",
    frames: [
      ["Call counter", "Global → counter", "n=0 in lexical environment", ""],
      [
        "Return inner function",
        "Global",
        "next retains access to that environment",
        "",
      ],
      ["Call next", "Global → inner", "n becomes 1", "1"],
      ["Call next again", "Global → inner", "same n becomes 2", "1, 2"],
    ],
  },
  reference: {
    code: "const a={nested:{score:1}};\nconst b={...a};\nb.nested.score=2;\nconsole.log(a.nested.score);",
    frames: [
      ["Create a", "Global", "a → record A → nested N {score:1}", ""],
      ["Shallow copy", "Global", "b → new record B → same nested N", ""],
      [
        "Mutate nested N through b",
        "Global",
        "N.score=2; both paths see it",
        "",
      ],
      ["Read through a", "Global", "a.nested.score=2", "2"],
    ],
  },
  error: {
    code: "function read(user){ return user.name; }\ntry { read(null); } catch(error){ console.log(error.name); }",
    frames: [
      ["Call read(null)", "Global → read", "user=null", ""],
      [
        "Access property",
        "Global → read",
        "TypeError: null has no name property",
        "",
      ],
      [
        "Unwind to catch",
        "Global → catch",
        "error is the thrown exception",
        "TypeError",
      ],
    ],
  },
  loop: {
    code: 'console.log("Start");\nsetTimeout(()=>console.log("Timer"),0);\nPromise.resolve().then(()=>console.log("Promise"));\nconsole.log("End");',
    frames: [
      [
        "Synchronous log",
        "Script running",
        "Timers: none · tasks: empty · microtasks: empty",
        "Start",
      ],
      [
        "Schedule timer",
        "Script running",
        "Timer environment: callback scheduled · earliest delay 0",
        "Start",
      ],
      [
        "Queue Promise reaction",
        "Script running",
        "Microtask queue: Promise reaction",
        "Start",
      ],
      [
        "Finish synchronous script",
        "Stack empty",
        "Ready timer task waits; promise reaction is queued",
        "Start, End",
      ],
      [
        "Microtask checkpoint",
        "Promise callback",
        "Drain queued promise reactions before next task",
        "Start, End, Promise",
      ],
      [
        "Next ready timer task",
        "Timer callback",
        "A zero delay is not immediate execution",
        "Start, End, Promise, Timer",
      ],
    ],
  },
};
export function XRay() {
  const [kind, setKind] = useState<keyof typeof traces>("function"),
    [step, setStep] = useState(0);
  const trace = traces[kind],
    f = trace.frames[step];
  return (
    <>
      <section className="v3-card">
        <span className="eyebrow">JS X-RAY · VERIFIED AUTHORED EXAMPLES</span>
        <h2>Follow a value through execution</h2>
        <p>
          A JavaScript engine parses source and executes its semantics, often
          using several implementation strategies. These traces explain
          observable bindings, calls and references; they do not display
          physical memory addresses or claim to step arbitrary code. Hoisting
          prepares bindings; it does not move source lines.
        </p>
        <div className="tabs wrap">
          {Object.keys(traces).map((k) => (
            <button
              key={k}
              className={kind === k ? "active" : ""}
              onClick={() => {
                setKind(k as keyof typeof traces);
                setStep(0);
              }}
            >
              {k === "loop" ? "Event loop" : k}
            </button>
          ))}
        </div>
        <Code>{trace.code}</Code>
        <div className="v3-trace" aria-live="polite">
          <h3>
            {step + 1}. {f[0]}
          </h3>
          <div>
            <b>Call stack</b>
            <p>{f[1]}</p>
          </div>
          <div>
            <b>Bindings / queues</b>
            <p>{f[2]}</p>
          </div>
          <div>
            <b>Console so far</b>
            <p>{f[3] || "No output yet"}</p>
          </div>
        </div>
        <div className="controls">
          <button
            className="button secondary small"
            disabled={!step}
            onClick={() => setStep(step - 1)}
          >
            Previous step
          </button>
          <button
            className="button primary small"
            disabled={step === trace.frames.length - 1}
            onClick={() => setStep(step + 1)}
          >
            Next step
          </button>
          <button className="icon-label" onClick={() => setStep(0)}>
            Reset trace
          </button>
        </div>
        <p>
          Predict the final output, then compare with an actual run. Use the
          Async path for the timer example; the original runner remains
          synchronous.
        </p>
        {kind !== "loop" && <Playground initial={trace.code} />}
      </section>
      <EventFlow />
    </>
  );
}
function EventFlow() {
  const [events, setEvents] = useState<string[]>([]),
    [stop, setStop] = useState(false);
  const add = (text: string) => setEvents((e) => [...e.slice(-14), text]);
  return (
    <section className="v3-card">
      <h2>Real event propagation explorer</h2>
      <p>
        Click the inner button. Trusted native React handlers here show the
        supported capture/target/bubble sequence. This is separate from the
        worker DOM bridge, whose event phases are limited. Some event types do
        not bubble; do not generalize this click sequence to every event.
      </p>
      <label>
        <input
          type="checkbox"
          checked={stop}
          onChange={(e) => setStop(e.target.checked)}
        />
        Stop propagation at inner bubble
      </label>
      <div
        className="v3-event-outer"
        onClickCapture={() => {
          setEvents(["Outer capture"]);
        }}
        onClick={() => add("Outer bubble")}
      >
        <span>Outer container</span>
        <div
          className="v3-event-inner"
          onClickCapture={() => add("Inner capture")}
          onClick={(e) => {
            add("Inner bubble");
            if (stop) e.stopPropagation();
          }}
        >
          <span>Inner container</span>
          <button
            className="button primary small"
            onClick={() => add("Button target")}
          >
            Click nested button
          </button>
        </div>
      </div>
      <ol aria-live="polite">
        {events.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ol>
      <p>
        Delegation puts a listener on an ancestor and inspects event.target,
        often using closest to identify a relevant descendant. Try the dynamic
        list in Live DOM Lab. A handler attached after parsing can find the DOM;
        on a real page, defer or module scripts and DOMContentLoaded help with
        readiness.
      </p>
    </section>
  );
}

function equal(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a),
    bk = Object.keys(b);
  return (
    ak.length === bk.length &&
    ak.every(
      (k) =>
        Object.hasOwn(b, k) &&
        equal(
          (a as Record<string, unknown>)[k],
          (b as Record<string, unknown>)[k],
        ),
    )
  );
}
export function TestBench({
  debug = false,
  onPass,
  onAttempt,
}: {
  debug?: boolean;
  onPass: (id: string) => void;
  onAttempt: (id: string) => void;
}) {
  const items = debug
    ? bugPrograms.map((b, i) => ({
        id: "bug-" + i,
        title: b[0] as string,
        brief: "Repair the program and explain the cause. " + b[2],
        starter: b[1] as string,
        solution: b[3] as string,
        cases: b[4] as unknown[][],
        hint: b[2] as string,
      }))
    : challenges;
  const [index, setIndex] = useState(0),
    [code, setCode] = useState(items[0].starter),
    [busy, setBusy] = useState(false),
    [results, setResults] = useState<
      {
        input: unknown;
        expected: unknown;
        actual: unknown;
        pass: boolean;
        error?: string;
      }[]
    >([]),
    [hint, setHint] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const item = items[index];
  useEffect(() => () => controller.current?.abort(), []);
  async function test() {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setBusy(true);
    setResults([]);
    onAttempt(item.id);
    const rows = [];
    for (const test of item.cases) {
      const [input, expected, error] = test;
      const source =
        code +
        "\n;try { const input = " +
        JSON.stringify(input) +
        '; const before=JSON.stringify(input); const actual=solve(input); console.log("__TEST__"+JSON.stringify({actual,defined:actual!==undefined,mutated:JSON.stringify(input)!==before})); } catch(error) { console.log("__TEST__"+JSON.stringify({error:error.name,message:error.message})); }';
      const result = await runCode(source, "", c.signal);
      if (c.signal.aborted) return;
      let actual: unknown = result.error || "No result",
        caught: string | undefined,
        mutated = false,
        defined = false;
      try {
        const raw = [...result.logs]
          .reverse()
          .find((l) => l.text.startsWith("__TEST__"))
          ?.text.slice(8);
        if (raw) {
          const parsed = JSON.parse(raw);
          actual = parsed.actual;
          caught = parsed.error;
          mutated = parsed.mutated;
          defined = parsed.defined;
          if (caught) actual = caught;
        }
      } catch {}
      const pass = error
        ? caught === error
        : !caught &&
          defined &&
          equal(actual, expected) &&
          (!(item.id === "sort" || item.id === "state") || !mutated);
      rows.push({
        input,
        expected: error || expected,
        actual,
        pass,
        error: result.error,
      });
      setResults([...rows]);
    }
    setBusy(false);
    if (rows.every((r) => r.pass)) onPass(item.id);
  }
  return (
    <section className="v3-card">
      <span className="eyebrow">
        {debug ? "BUG HUNTER PRO" : "LOGIC GYM · ISOLATED FUNCTION TESTS"}
      </span>
      <h2>
        {debug
          ? "A bug is evidence. Investigate it."
          : "Make a function meet its contract."}
      </h2>
      <p>
        {debug
          ? "Observe → reproduce → inspect → hypothesize → fix → verify. Use staged hints, and test one change at a time."
          : "Understand the problem, name input/output, write examples and pseudocode, code, test normal and boundary cases, debug, then improve readability."}
      </p>
      <label>
        Choose a challenge
        <select
          value={index}
          onChange={(e) => {
            controller.current?.abort();
            setBusy(false);
            const n = +e.target.value;
            setIndex(n);
            setCode(items[n].starter);
            setResults([]);
            setHint(0);
          }}
        >
          {items.map((x, i) => (
            <option key={x.id} value={i}>
              {i + 1}. {x.title}
            </option>
          ))}
        </select>
      </label>
      <h3>{item.title}</h3>
      <p>{item.brief}</p>
      <label>
        Your function
        <textarea
          aria-label="Challenge function"
          className="v3-code-input"
          spellCheck={false}
          value={code}
          maxLength={40000}
          rows={12}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      <div className="controls wrap">
        <button className="button primary small" disabled={busy} onClick={test}>
          {busy ? "Testing…" : "Run test cases"}
        </button>
        <button
          className="icon-label"
          onClick={() => setHint(Math.min(hint + 1, 3))}
        >
          Hint {hint}/3
        </button>
        <button className="icon-label" onClick={() => setCode(item.solution)}>
          Reveal reference
        </button>
        <button
          className="icon-label"
          onClick={() => {
            controller.current?.abort();
            setBusy(false);
          }}
        >
          Cancel tests
        </button>
      </div>
      {hint > 0 && (
        <p className="hint">
          {hint === 1
            ? "Write down one normal input and one boundary case."
            : hint === 2
              ? item.hint
              : "Compare your returned type and edge cases with the contract. Run one case manually before changing the whole function."}
        </p>
      )}
      {results.length > 0 && (
        <div className="v3-test-results" role="status">
          {results.map((r, i) => (
            <div className={r.pass ? "pass" : "fail"} key={i}>
              <b>
                {r.pass ? "✓ PASS" : "○ REVISE"} case {i + 1}
              </b>
              <pre>
                {"Input: " +
                  JSON.stringify(r.input) +
                  "\nExpected: " +
                  JSON.stringify(r.expected) +
                  "\nActual: " +
                  String(JSON.stringify(r.actual))}
              </pre>
              {!r.pass && (
                <p>
                  {r.error ||
                    "Compare value, output type, the stated input contract, and any required nonmutation."}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      <p>
        Each case executes in a fresh disposable synchronous worker. Trusted
        parent code compares returned JSON-compatible results with the published
        test cases. Passing these checks is practice evidence, not proof against
        every input or a secure grading credential. Alternative correct
        implementations are accepted; efficiency is a discussion rather than a
        hidden universal ranking.
      </p>
      <details>
        <summary>Testing & debugging in real developer tools</summary>
        <p>
          SyntaxError means parsing failed; ReferenceError often means an
          inaccessible name; TypeError can mean a null DOM selection or invalid
          operation; RangeError can indicate an invalid range or excessive
          recursion. Logic errors may throw nothing. Read the first useful stack
          frame and reproduce the smallest failing input.
        </p>
        <p>
          In browser DevTools Sources/Debugger, set a breakpoint, trigger the
          action, inspect Scope and Call Stack, and add a Watch expression. Step
          over runs the next statement; step into enters a call; step out
          returns to the caller. Inspect Network for failed requests and Console
          for warnings. A selector can return null before DOM readiness or when
          a name is wrong. Calling a handler while attaching it differs from
          passing the function.
        </p>
        <p>
          A unit test checks a small function. An integration test checks
          cooperating parts, such as form → validation → render. A regression
          test preserves a fixed behavior. Write expected results before
          implementing; test empty input, boundaries, invalid types, and errors.
          Formatting makes code consistent; linting detects selected patterns;
          neither proves correctness. Review naming, duplication,
          responsibilities and accessibility. Vitest is an optional next tool
          after you understand assertions.
        </p>
        <a href="https://vitest.dev/guide/" target="_blank" rel="noreferrer">
          Official Vitest guide ↗
        </a>
      </details>
    </section>
  );
}
