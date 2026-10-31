import { useEffect, useRef, useState } from "react";
import BrowserLab from "../v3/BrowserLab";
export function CallbackRefactor() {
  const [mode, setMode] = useState("callbacks");
  const callbacks = `function loadUser(done){setTimeout(()=>done(null,{id:1}),40)}
function loadPosts(id,done){setTimeout(()=>done(null,[{title:'Workshop note'}]),40)}
loadUser((error,user)=>{
  if(error){console.error(error.message);return}
  console.log('User',user.id);
  loadPosts(user.id,(error,posts)=>{
    if(error){console.error(error.message);return}
    console.log('Posts',posts.length);
    document.querySelector('#out').textContent=posts[0].title;
  });
});`;
  const promises = `function loadUser(){return new Promise(resolve=>setTimeout(()=>resolve({id:1}),40))}
function loadPosts(id){return new Promise(resolve=>setTimeout(()=>resolve([{title:'Workshop note'}]),40))}
loadUser()
.then(user=>{console.log('User',user.id);return loadPosts(user.id)})
.then(posts=>{console.log('Posts',posts.length);document.querySelector('#out').textContent=posts[0].title})
.catch(error=>console.error(error.message));`;
  return (
    <section className="v3-card">
      <h2>Callback nesting → Promise chain</h2>
      <p>
        Both editable programs perform the same two dependent operations. The
        nested version repeats error-first checks at each boundary. The Promise
        version must return the second operation so one downstream rejection
        handler owns it.
      </p>
      <label>
        Implementation
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="callbacks">Nested error-first callbacks</option>
          <option value="promises">Returned Promise chain</option>
        </select>
      </label>
      <ol>
        <li>loadUser → receive user.id</li>
        <li>user.id → loadPosts</li>
        <li>posts → render title as text</li>
      </ol>
      <BrowserLab
        key={mode}
        engine="native"
        apiVersion="v4"
        example={{
          id: "v4-refactor-" + mode,
          title: "Execute the selected dependency pattern",
          html: '<p id="out" role="status">Waiting for the final dependent result.</p>',
          code: mode === "callbacks" ? callbacks : promises,
          task: "Add a failure in loadPosts and explain which handler receives it. Then refactor the chain using async/await.",
          hint: "A missing return disconnects the next dependent operation.",
          solution: promises,
        }}
      />
    </section>
  );
}
export function DelaySimulator() {
  const [delay, setDelay] = useState("300"),
    [fail, setFail] = useState(false),
    [status, setStatus] = useState("Ready");
  const current = useRef<AbortController | null>(null),
    generation = useRef(0);
  useEffect(() => () => current.current?.abort(), []);
  async function start() {
    current.current?.abort();
    const mine = ++generation.current,
      ms = Number(delay);
    if (!delay.trim() || !Number.isFinite(ms) || ms < 20 || ms > 2000) {
      setStatus("Use a delay from 20 to 2000 ms");
      return;
    }
    const c = new AbortController();
    current.current = c;
    const started = performance.now();
    setStatus("Started → pending");
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          c.signal.removeEventListener("abort", abort);
          fail ? reject(Error("Simulated failure")) : resolve();
        }, ms);
        function abort() {
          clearTimeout(timer);
          reject(new DOMException("Cancelled", "AbortError"));
        }
        c.signal.addEventListener("abort", abort, { once: true });
      });
      if (mine === generation.current)
        setStatus(
          "Completed after " +
            Math.round(performance.now() - started) +
            " ms measured",
        );
    } catch (error) {
      if (mine === generation.current)
        setStatus((error as Error).name + ": " + (error as Error).message);
    }
  }
  return (
    <section className="v3-card">
      <h2>Async Delay Simulator</h2>
      <p>
        A real fixed Promise waits for a timer. Changing the delay or rejection
        option changes its behavior; cancellation clears the pending timer.
      </p>
      <label>
        Requested delay (ms)
        <input
          type="number"
          min="20"
          max="2000"
          value={delay}
          onChange={(e) => setDelay(e.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={fail}
          onChange={(e) => setFail(e.target.checked)}
        />
        Reject after the delay
      </label>
      <button className="button secondary small" onClick={start}>
        Start delay
      </button>
      <button className="icon-label" onClick={() => current.current?.abort()}>
        Cancel delay
      </button>
      <p role="status">{status}</p>
    </section>
  );
}
export function CombinatorStudio() {
  const [policy, setPolicy] = useState("allSettled"),
    [fail, setFail] = useState("second"),
    [firstDelay, setFirstDelay] = useState("200"),
    [secondDelay, setSecondDelay] = useState("80"),
    [states, setStates] = useState(["idle", "idle"]),
    [outcome, setOutcome] = useState("Predict before running.");
  const controller = useRef<AbortController | null>(null),
    generation = useRef(0);
  useEffect(() => () => controller.current?.abort(), []);
  async function run() {
    controller.current?.abort();
    const mine = ++generation.current,
      delays = [Number(firstDelay), Number(secondDelay)];
    if (delays.some((ms) => !Number.isFinite(ms) || ms < 20 || ms > 2000)) {
      setOutcome("Use finite delays from 20 to 2000 ms");
      return;
    }
    const c = new AbortController();
    controller.current = c;
    setStates(["pending", "pending"]);
    setOutcome("Waiting for " + policy);
    const jobs = delays.map(
      (ms, i) =>
        new Promise<string>((resolve, reject) => {
          const update = (phase: string) => {
            if (mine === generation.current)
              setStates((v) => v.map((old, j) => (j === i ? phase : old)));
          };
          const timer = setTimeout(() => {
            c.signal.removeEventListener("abort", abort);
            const rejected =
              fail === "both" || fail === (i === 0 ? "first" : "second");
            update(rejected ? "rejected" : "fulfilled");
            rejected
              ? reject(Error("Input " + (i + 1) + " failed"))
              : resolve("Value " + (i + 1));
          }, ms);
          function abort() {
            clearTimeout(timer);
            update("cancelled");
            reject(new DOMException("Cancelled", "AbortError"));
          }
          c.signal.addEventListener("abort", abort, { once: true });
        }),
    );
    try {
      const result = await (policy === "all"
        ? Promise.all(jobs)
        : policy === "allSettled"
          ? Promise.allSettled(jobs)
          : policy === "race"
            ? Promise.race(jobs)
            : Promise.any(jobs));
      if (mine === generation.current)
        setOutcome(
          "Aggregate fulfilled: " +
            JSON.stringify(result, (key, value) =>
              value instanceof Error ? value.message : value,
            ),
        );
    } catch (error) {
      if (mine === generation.current)
        setOutcome(
          "Aggregate rejected: " +
            (error as Error).name +
            " — " +
            (error as Error).message,
        );
    }
  }
  return (
    <section className="v3-card">
      <h2>Promise combinator comparison</h2>
      <label>
        Aggregate policy
        <select value={policy} onChange={(e) => setPolicy(e.target.value)}>
          {["all", "allSettled", "race", "any"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <label>
        Rejected inputs
        <select value={fail} onChange={(e) => setFail(e.target.value)}>
          <option value="none">None</option>
          <option value="first">First</option>
          <option value="second">Second</option>
          <option value="both">Both</option>
        </select>
      </label>
      <label>
        First input delay (ms)
        <input
          value={firstDelay}
          type="number"
          onChange={(e) => setFirstDelay(e.target.value)}
        />
      </label>
      <label>
        Second input delay (ms)
        <input
          value={secondDelay}
          type="number"
          onChange={(e) => setSecondDelay(e.target.value)}
        />
      </label>
      <div className="controls wrap">
        <button className="button secondary small" onClick={run}>
          Run combinator
        </button>
        <button
          className="icon-label"
          onClick={() => controller.current?.abort()}
        >
          Cancel both inputs
        </button>
      </div>
      <ol>
        {states.map((s, i) => (
          <li key={i}>
            Input {i + 1}: {s}
          </li>
        ))}
      </ol>
      <p role="status">{outcome}</p>
      <p>
        The aggregate may settle while another input is still pending; inspect
        that input finishing later. There is no automatic loser cancellation.
        Requested delays are not guaranteed exact.
      </p>
    </section>
  );
}
