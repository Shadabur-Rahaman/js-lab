import { useEffect, useRef, useState } from "react";
import {
  asyncSource,
  asyncTrace,
  bindingCases,
  contextSource,
  contextTrace,
  createCounter,
  lookupCase,
  parameterSource,
  parameterTrace,
} from "./models.mjs";
import BrowserLab from "../v3/BrowserLab";
import { advancedResponse, advancedFixtures, validateRows } from "./api.mjs";
import LiveApiLab from "./LiveApiLab";
import type { AdvancedUnit } from "./curriculum";
import {
  CallbackRefactor,
  CombinatorStudio,
  DelaySimulator,
} from "./AsyncPractice";
export function AdvancedTools({ unit }: { unit: AdvancedUnit }) {
  if (unit.id === "v4-callback-flow")
    return (
      <>
        <CallbackRefactor />
        <TracePlayer async />
      </>
    );
  if (unit.id === "v4-combinators")
    return (
      <>
        <CombinatorStudio />
        <TracePlayer async />
      </>
    );
  if (unit.id === "v4-await")
    return (
      <>
        <DelaySimulator />
        <TracePlayer async />
      </>
    );
  return unit.tool === "scope" ? (
    <ScopeExplorer />
  ) : unit.tool === "context" ? (
    <TracePlayer />
  ) : unit.tool === "closure" ? (
    <ClosureExplorer />
  ) : unit.tool === "binding" ? (
    <BindingDetective />
  ) : unit.tool === "promise" ? (
    <>
      <PromiseLifecycle />
      <TracePlayer async />
    </>
  ) : unit.tool === "async" ? (
    <TracePlayer async />
  ) : unit.tool === "http" ? (
    <HttpInspector />
  ) : unit.tool === "dependency" ? (
    <DependencyExplorer />
  ) : unit.tool === "json" ? (
    <JsonExplorer />
  ) : (
    <LiveApiLab />
  );
}
function ScopeExplorer() {
  const [selected, setSelected] = useState("shadow");
  const item = lookupCase(selected);
  return (
    <section className="v3-card">
      <h2>Scope Explorer</h2>
      <p>
        Authored lexical model. Select a reference to follow its declaration;
        compare the separate active call stack. The editable source below
        verifies the JavaScript outcome.
      </p>
      <label>
        Variable reference
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="shadow">inner label (shadowed)</option>
          <option value="outer">outer factor</option>
          <option value="global">global shared</option>
          <option value="missing">missing identifier</option>
          <option value="tdz">label before initialization</option>
        </select>
      </label>
      <div className="v3-path-grid">
        <div>
          <h3>Lookup path</h3>
          {item.path.map((scope: any) => (
            <div
              className={"v3-card " + (scope.hit ? "v4-current" : "")}
              key={scope.id}
            >
              <b>{scope.id}</b>
              <pre>{JSON.stringify(scope.bindings, null, 2)}</pre>
              {scope.hit && (
                <p>
                  Declaration found here
                  {item.result === "ReferenceError" ? " — not initialized" : ""}
                  .
                </p>
              )}
            </div>
          ))}
        </div>
        <div>
          <h3>Active call stack</h3>
          <ol>
            <li>script</li>
            {selected !== "tdz" && (
              <>
                <li>outer()</li>
                <li>inner() / selected reference</li>
              </>
            )}
          </ol>
          <p>
            This case uses the lexical nesting shown below. Use Execution
            Context X-Ray to compare a separate caller with a separately defined
            read function: its caller-local bindings do not become lexical
            parents.
          </p>
          <p>
            Selected name: <b>{item.name}</b>
          </p>
          <p role="status">Model result: {String(item.result)}</p>
          <p>
            Shadowed declarations:{" "}
            {item.shadowed.join(", ") || "none in this case"}
          </p>
          <p>
            A TDZ hit stops lookup; it does not fall through. var is
            function-scoped, let/const block-scoped; compare their native source
            below.
          </p>
        </div>
      </div>
      <BrowserLab
        key={selected}
        engine="native"
        apiVersion="v4"
        example={{
          id: "v4-scope-" + selected,
          title: "Verify this exact lookup case",
          html: "<p>Compare native console output with the selected lookup path.</p>",
          code: item.code,
        }}
      />
    </section>
  );
}
export function TracePlayer({ async = false }: { async?: boolean }) {
  const [program, setProgram] = useState("lexical");
  const frames = async
      ? asyncTrace
      : program === "parameters"
        ? parameterTrace
        : contextTrace,
    source = async
      ? asyncSource
      : program === "parameters"
        ? parameterSource
        : contextSource;
  const [step, setStep] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(900);
  useEffect(() => {
    if (!playing) return;
    if (step >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setStep((s) => s + 1), speed);
    return () => clearTimeout(timer);
  }, [playing, step, speed, frames.length]);
  const f = frames[step];
  return (
    <section className="v3-card">
      <span className="eyebrow">
        VERIFIED AUTHORED TRACE · NOT AN ARBITRARY ENGINE DEBUGGER
      </span>
      <h2>{async ? "Async Execution Studio" : "Execution Context X-Ray"}</h2>
      {!async && (
        <label>
          Context trace example
          <select
            value={program}
            onChange={(e) => {
              setProgram(e.target.value);
              setStep(0);
              setPlaying(false);
            }}
          >
            <option value="lexical">Scope chain versus call stack</option>
            <option value="parameters">
              Parameters, locals and return values
            </option>
          </select>
        </label>
      )}
      <p>
        These frames model this exact source. Creation/initialization is a
        teaching abstraction; no actual engine memory addresses are inspected.
        Change code in the native editor to execute it, but the authored frames
        remain tied to this source.
      </p>
      <div className="controls wrap">
        <button
          className="button secondary small"
          onClick={() => {
            setStep(0);
            setPlaying(true);
          }}
        >
          Start trace
        </button>
        <button
          className="icon-label"
          disabled={step === 0}
          onClick={() => {
            setPlaying(false);
            setStep((s) => s - 1);
          }}
        >
          Previous step
        </button>
        <button
          className="icon-label"
          disabled={step === frames.length - 1}
          onClick={() => {
            setPlaying(false);
            setStep((s) => s + 1);
          }}
        >
          Next step
        </button>
        <button className="icon-label" onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause visualization" : "Play trace"}
        </button>
        <button
          className="icon-label"
          onClick={() => {
            setPlaying(false);
            setStep(0);
          }}
        >
          Reset trace
        </button>
        <label>
          Playback speed
          <select value={speed} onChange={(e) => setSpeed(+e.target.value)}>
            <option value="1600">Slow</option>
            <option value="900">Normal</option>
            <option value="350">Fast</option>
          </select>
        </label>
      </div>
      <p role="status">
        Step {step + 1}/{frames.length}: {f.note}
      </p>
      <div className="v3-path-grid">
        <pre className="code v4-source">
          {source.split("\n").map((line, i) => (
            <span className={f.line === i + 1 ? "v4-line" : ""} key={i}>
              {i + 1} {line}
              {"\n"}
            </span>
          ))}
        </pre>
        <div>
          <h3>Call stack</h3>
          <pre className="code">{JSON.stringify(f.stack, null, 2)}</pre>
          <h3>
            {async ? "Promise state" : "Conceptual bindings / parameters"}
          </h3>
          <pre className="code">
            {async ? (f as any).promises : JSON.stringify(f.bindings, null, 2)}
          </pre>
          {async && (
            <>
              <h3>Tasks / microtasks</h3>
              <pre className="code">
                {JSON.stringify(
                  {
                    tasks: (f as any).tasks,
                    microtasks: (f as any).microtasks,
                  },
                  null,
                  2,
                )}
              </pre>
            </>
          )}
          <p>Return: {String((f as any).returned ?? "none at this step")}</p>
          <h3>Console</h3>
          <pre className="code">{f.output.join("\n") || "(no output yet)"}</pre>
        </div>
      </div>
      <BrowserLab
        key={source}
        engine="native"
        apiVersion="v4"
        example={{
          id: async ? "v4-async-trace" : "v4-context-trace",
          title: "Verify this trace with real JavaScript",
          html: "<p>Compare actual console output with the authored trace.</p>",
          code: source,
        }}
      />
    </section>
  );
}
function ClosureExplorer() {
  const counters = useRef([createCounter(), createCounter(10)]);
  const [values, setValues] = useState([0, 10]),
    [start, setStart] = useState("10"),
    [step, setStep] = useState("1"),
    [notice, setNotice] = useState("Two actual closure instances.");
  function update(index: number, action: "increment" | "decrement") {
    const result = counters.current[index][action]();
    setValues(counters.current.map((c) => c.getValue()));
    setNotice("Counter " + (index === 0 ? "A" : "B") + " returned " + result);
  }
  return (
    <section className="v3-card">
      <h2>Closure Memory Explorer</h2>
      <p>
        These controls invoke actual fixed counter functions. The displayed
        values are public observations of retained state, not memory addresses
        or a claim that all outer variables live forever.
      </p>
      <div className="v3-path-grid">
        {values.map((value, i) => (
          <section className="v3-card" key={i}>
            <h3>Counter {i === 0 ? "A" : "B"}</h3>
            <output className="v4-value">{value}</output>
            <div className="controls wrap">
              <button
                className="button secondary small"
                onClick={() => update(i, "increment")}
              >
                Increment {i === 0 ? "A" : "B"}
              </button>
              <button
                className="icon-label"
                onClick={() => update(i, "decrement")}
              >
                Decrement {i === 0 ? "A" : "B"}
              </button>
            </div>
            <p>
              increment, decrement and getValue share this instance’s count
              binding.
            </p>
          </section>
        ))}
      </div>
      <label>
        New B starting value
        <input
          type="number"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </label>
      <label>
        New B step
        <input
          type="number"
          value={step}
          onChange={(e) => setStep(e.target.value)}
        />
      </label>
      <button
        className="button secondary small"
        onClick={() => {
          try {
            if (!start.trim() || !step.trim())
              throw Error("Enter start and step");
            counters.current[1] = createCounter(Number(start), Number(step));
            setValues(counters.current.map((c) => c.getValue()));
            setNotice("Created a fresh B environment; A retained its value.");
          } catch (e) {
            setNotice((e as Error).message);
          }
        }}
      >
        Create second counter
      </button>
      <button
        className="icon-label"
        onClick={() => {
          counters.current = [createCounter(), createCounter(10)];
          setValues([0, 10]);
          setNotice("Fresh independent instances.");
        }}
      >
        Reset instances
      </button>
      <p role="status">{notice}</p>
    </section>
  );
}
function BindingDetective() {
  const [id, setId] = useState("method"),
    [result, setResult] = useState("Choose a case, predict, then verify.");
  const item = bindingCases.find((x) => x.id === id)!;
  return (
    <section className="v3-card">
      <h2>This Binding Detective</h2>
      <label>
        Invocation style
        <select
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setResult("Predict before verifying.");
          }}
        >
          {bindingCases.map((c) => (
            <option value={c.id} key={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <h3>Definition</h3>
      <pre className="code">{item.definition}</pre>
      <h3>Invocation</h3>
      <pre className="code">{item.invocation}</pre>
      <p>Expected receiver/result: {item.expected}</p>
      <p>
        Environment: explicit strict function, explicit factory receiver, class,
        or native event as shown. The native lab’s outer wrapper is called with
        window; this is not ES-module top level.
      </p>
      {item.verify && (
        <button
          className="button secondary small"
          onClick={() =>
            setResult("Actual fixed-example result: " + String(item.verify!()))
          }
        >
          Verify binding
        </button>
      )}
      <p role="status">{result}</p>
      <BrowserLab
        key={id}
        engine="native"
        apiVersion="v4"
        example={{
          id: "v4-binding-" + id,
          title: "Run the selected invocation",
          html: '<button id="act">Native event target</button>',
          code: item.code,
        }}
      />
    </section>
  );
}
function PromiseLifecycle() {
  const current = useRef<any>(null),
    generation = useRef(0);
  const [state, setState] = useState("pending"),
    [result, setResult] = useState(""),
    [value, setValue] = useState("7");
  function reset() {
    const mine = ++generation.current;
    setState("pending");
    setResult("Executor runs now; reactions wait for settlement.");
    const pending = new Promise((resolve, reject) => {
      current.current = { resolve, reject, locked: false };
    });
    pending.then(
      (value) => {
        if (mine === generation.current) {
          setState("fulfilled");
          setResult(
            "Fulfillment " +
              String(value) +
              " → returning value × 2 → " +
              String(Number(value) * 2),
          );
        }
      },
      (error) => {
        if (mine === generation.current) {
          setState("rejected");
          setResult(
            "Rejected: " +
              error.message +
              "; a catch could recover by returning a value.",
          );
        }
      },
    );
  }
  useEffect(() => {
    reset();
    return () => {
      generation.current++;
    };
  }, []);
  return (
    <section className="v3-card">
      <h2>Promise Lifecycle Simulator</h2>
      <p>
        These buttons settle a real, fixed Promise. They do not evaluate learner
        source in the app.
      </p>
      <label>
        Fulfillment value
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <div className="controls wrap">
        <button
          className="button secondary small"
          onClick={() => {
            const c = current.current;
            if (c.innerResolve) c.innerResolve(Number(value));
            else c.resolve(Number(value));
            c.locked = true;
          }}
        >
          Resolve promise
        </button>
        <button
          className="icon-label"
          onClick={() => {
            const c = current.current;
            (c.innerReject || c.reject)(Error("Demonstration failure"));
            c.locked = true;
          }}
        >
          Reject promise
        </button>
        <button
          className="icon-label"
          onClick={() => {
            const c = current.current;
            if (c.locked) return;
            c.locked = true;
            const inner = new Promise((resolve, reject) => {
              c.innerResolve = resolve;
              c.innerReject = reject;
            });
            c.resolve(inner);
            setState("resolved, adopting a pending promise");
            setResult(
              "Outer outcome follows inner; resolve/reject the inner using the controls.",
            );
          }}
        >
          Adopt pending promise
        </button>
        <button className="icon-label" onClick={reset}>
          Reset promise
        </button>
      </div>
      <p role="status">
        State: <b>{state}</b>. {result}
      </p>
      <p>
        Repeated settlement calls are ignored by the actual Promise. Choosing an
        outcome does not automatically cancel unrelated work.
      </p>
    </section>
  );
}
function DependencyExplorer() {
  const [mode, setMode] = useState("dependent"),
    [states, setStates] = useState<string[]>([]),
    [duration, setDuration] = useState(""),
    [running, setRunning] = useState(false);
  const controller = useRef<AbortController | null>(null),
    generation = useRef(0);
  useEffect(() => () => controller.current?.abort(), []);
  async function run() {
    controller.current?.abort();
    const mine = ++generation.current,
      c = new AbortController();
    controller.current = c;
    setRunning(true);
    setStates([]);
    setDuration("");
    const start = performance.now();
    const log = (s: string) => {
      if (mine === generation.current) setStates((v) => [...v, s]);
    };
    const delay = (name: string, ms: number) =>
      new Promise<void>((resolve, reject) => {
        log(name + " pending");
        const timer = setTimeout(() => {
          c.signal.removeEventListener("abort", abort);
          log(name + " fulfilled");
          resolve();
        }, ms);
        const abort = () => {
          clearTimeout(timer);
          reject(new DOMException("Cancelled", "AbortError"));
        };
        c.signal.addEventListener("abort", abort, { once: true });
        if (c.signal.aborted) abort();
      });
    try {
      if (mode === "dependent") {
        await delay("Location → coordinates", 200);
        await delay("Coordinates → weather", 300);
        log("Validated weather → render");
      } else {
        await Promise.all([
          delay("Independent users", 200),
          delay("Independent posts", 300),
        ]);
        log("Both independent results → render");
      }
      if (mine === generation.current)
        setDuration(
          (performance.now() - start).toFixed(0) +
            " ms measured on this device",
        );
    } catch (e) {
      log((e as Error).name);
    } finally {
      if (mine === generation.current) setRunning(false);
    }
  }
  return (
    <section className="v3-card">
      <h2>API Dependency Visualizer</h2>
      <p>
        Actual fixed timer operations represent fictional requests (200 / 300 ms
        requested delay). Measured duration can vary; this is not a live-network
        speed benchmark.
      </p>
      <label>
        Request relationship
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="dependent">
            Dependent: location → weather → render
          </option>
          <option value="independent">
            Independent: users + posts → render
          </option>
        </select>
      </label>
      <div className="controls wrap">
        <button className="button secondary small" onClick={run}>
          Run dependencies
        </button>
        <button
          className="icon-label"
          disabled={!running}
          onClick={() => controller.current?.abort()}
        >
          Cancel dependencies
        </button>
      </div>
      <ol>
        {states.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <p role="status">{running ? "Working…" : duration || "Ready"}</p>
    </section>
  );
}
export function HttpInspector() {
  const [method, setMethod] = useState("GET"),
    [url, setURL] = useState("/api/users"),
    [headers, setHeaders] = useState('{"Content-Type":"application/json"}'),
    [body, setBody] = useState('{"name":"Fictional learner"}'),
    [scenario, setScenario] = useState("success"),
    [result, setResult] = useState<any>(null),
    [pending, setPending] = useState(false);
  const database = useRef(structuredClone(advancedFixtures)),
    controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function request() {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setPending(true);
    setResult(null);
    const start = performance.now();
    try {
      const parsedHeaders = JSON.parse(headers);
      if (
        !parsedHeaders ||
        typeof parsedHeaders !== "object" ||
        Array.isArray(parsedHeaders)
      )
        throw Error("Headers must be a JSON object");
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, scenario === "slow" ? 1500 : 100);
        c.signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new DOMException("Cancelled", "AbortError"));
          },
          { once: true },
        );
      });
      const r = advancedResponse(
        url,
        {
          method,
          headers: parsedHeaders,
          body: method === "GET" ? undefined : body,
        },
        scenario,
        database.current,
      );
      const raw =
        scenario === "invalid"
          ? "bad JSON"
          : r.status === 204
            ? ""
            : JSON.stringify(r.body);
      let parsed: any = null,
        error = "";
      try {
        if (r.status < 200 || r.status >= 300) throw Error("HTTP " + r.status);
        if (r.status !== 204) {
          if (!r.headers["content-type"].includes("application/json"))
            throw Error("Unexpected Content-Type");
          parsed = JSON.parse(raw);
        }
      } catch (e) {
        error = (e as Error).message;
      }
      setResult({
        request: {
          method,
          url,
          headers: parsedHeaders,
          body: method === "GET" ? null : body,
        },
        status: r.status,
        headers: r.headers,
        raw,
        parsed,
        error,
        elapsed: Math.round(performance.now() - start),
        source: "Fictional offline; mutations last only until reset",
      });
    } catch (e) {
      if (controller.current === c)
        setResult({
          error: (e as Error).name + ": " + (e as Error).message,
          elapsed: Math.round(performance.now() - start),
          source: "Offline simulation; no request sent",
        });
    } finally {
      if (controller.current === c) setPending(false);
    }
  }
  return (
    <section className="v3-card">
      <h2>HTTP Request / Response Explorer</h2>
      <p>
        Offline by default. Requests use the same V4 fixture handler as the
        editable native exercises. No server, account or persistent backend is
        implied.
      </p>
      <div className="controls wrap">
        <label>
          Method
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Offline endpoint
          <input
            value={url}
            onChange={(e) => setURL(e.target.value)}
            maxLength={180}
          />
        </label>
        <label>
          Response scenario
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          >
            {[
              "success",
              "empty",
              "bad",
              "unauthorized",
              "forbidden",
              "missing",
              "rate",
              "error",
              "unavailable",
              "network",
              "cors",
              "invalid",
              "type",
              "slow",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Headers JSON
        <textarea
          value={headers}
          onChange={(e) => setHeaders(e.target.value)}
          maxLength={2000}
        />
      </label>
      <label>
        Request body JSON
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
        />
      </label>
      <div className="controls wrap">
        <button
          className="button secondary small"
          disabled={pending}
          onClick={request}
        >
          Send offline request
        </button>
        <button
          className="icon-label"
          disabled={!pending}
          onClick={() => controller.current?.abort()}
        >
          Cancel offline request
        </button>
        <button
          className="icon-label"
          onClick={() => {
            controller.current?.abort();
            database.current = structuredClone(advancedFixtures);
            setResult(null);
          }}
        >
          Reset fictional database
        </button>
      </div>
      <p role="status">
        {pending
          ? "Waiting for offline response…"
          : result?.error || result?.source || "Ready"}
      </p>
      {result && (
        <>
          <pre className="code">{JSON.stringify(result, null, 2)}</pre>
          <h3>Parsed JSON → safe rendered result</h3>
          <div className="v3-path-grid">
            {(Array.isArray(result.parsed)
              ? result.parsed
              : result.parsed
                ? [result.parsed]
                : []
            )
              .slice(0, 8)
              .map((r: any, i: number) => (
                <article className="v3-card" key={i}>
                  {String(r?.name ?? r?.title ?? r?.error ?? "Record")}
                  <p>{JSON.stringify(r)}</p>
                </article>
              ))}
          </div>
        </>
      )}
      <p>
        200 OK; 201 created; 204 no body; 301/302 redirect (normally followed by
        Fetch); 400 invalid request; 401 authentication needed; 403 forbidden;
        404 missing; 429 rate limited; 500/503 server failure. Network and CORS
        failures can both surface as TypeError; inspect DevTools/server policy.
      </p>
    </section>
  );
}
function JsonExplorer() {
  const [source, setSource] = useState(
      '[{"id":1,"name":"<script>plain title</script>"},{"id":2,"name":"Asha"}]',
    ),
    [sort, setSort] = useState(false);
  let rows: any[] = [],
    error = "";
  try {
    rows = validateRows(JSON.parse(source));
    if (sort)
      rows.sort((a: any, b: any) =>
        String(a.name ?? a.title).localeCompare(String(b.name ?? b.title)),
      );
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <section className="v3-card">
      <h2>JSON-to-DOM Explorer</h2>
      <label>
        Received JSON
        <textarea
          rows={5}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          maxLength={15000}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={sort}
          onChange={(e) => setSort(e.target.checked)}
        />
        Sort validated titles
      </label>
      <p role="status">
        {error ||
          rows.length + " valid records; missing/invalid records are omitted."}
      </p>
      <div className="v3-path-grid">
        {rows.slice(0, 20).map((row: any, i: number) => (
          <article className="v3-card" key={i}>
            <h3>{row.name ?? row.title}</h3>
            <p>JSON id → {row.id}; string field → heading text node.</p>
          </article>
        ))}
      </div>
      <p>
        React renders these values as text; no remote HTML is injected. The
        editable exercise below uses createElement/textContent for the same
        boundary.
      </p>
    </section>
  );
}
