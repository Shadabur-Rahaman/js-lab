import { useEffect, useId, useRef, useState } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-css";
import { Play, Square, RotateCcw } from "lucide-react";
import { renderSnapshot, startRuntime } from "./runtime";
export type BrowserExample = {
  id: string;
  title: string;
  html: string;
  css?: string;
  code: string;
  task?: string;
  hint?: string;
  solution?: string;
};
const baseCSS =
  "body { font: 16px/1.6 system-ui; padding: 20px; color: #26352f; background: #fafaf5; } button,input,select,textarea { font: inherit; padding: 8px; margin: 4px; max-width:100%; } button { cursor:pointer; } label { display:block; } :focus-visible { outline: 3px solid #517c57; outline-offset:3px; } .dark { background:#20252c; color:#fafafa; } .error { color:#a02222; } img { max-width:100%; }";
export default function BrowserLab({
  example,
  external,
  storageSeed = {},
  onStorage,
  onCode,
  projectMode = false,
}: {
  projectMode?: boolean;
  example: BrowserExample;
  external?: { html: string; css: string; code: string };
  storageSeed?: Record<string, string>;
  onStorage?: (s: Record<string, string>) => void;
  onCode?: (v: { html: string; css: string; code: string }) => void;
}) {
  const [html, setHTML] = useState(example.html),
    [css, setCSS] = useState(example.css || baseCSS),
    [code, setCode] = useState(example.code),
    [tab, setTab] = useState("JavaScript"),
    [logs, setLogs] = useState<{ kind: string; text: string }[]>([]),
    [snapshot, setSnapshot] = useState(""),
    [before, setBefore] = useState(""),
    [running, setRunning] = useState(false),
    [width, setWidth] = useState("100%"),
    [hint, setHint] = useState(false),
    [scenario, setScenario] = useState("success"),
    [srcdoc, setSrcdoc] = useState("");
  const id = useId(),
    frame = useRef<HTMLIFrameElement>(null),
    session = useRef<ReturnType<typeof startRuntime> | null>(null),
    token = useRef(crypto.randomUUID().replaceAll("-", "")),
    latest = useRef(""),
    cssRef = useRef(css);
  useEffect(() => {
    if (external) {
      setHTML(external.html);
      setCSS(external.css);
      setCode(external.code);
    }
  }, [external]);
  useEffect(() => {
    onCode?.({ html, css, code });
  }, [html, css, code]);
  useEffect(() => () => session.current?.stop(), []);
  useEffect(() => {
    cssRef.current = css;
  }, [css]);
  useEffect(() => {
    const receive = (e: MessageEvent) => {
      if (
        e.source !== frame.current?.contentWindow ||
        e.data?.token !== token.current
      )
        return;
      if (e.data.type === "v3-preview-ready" && latest.current)
        frame.current?.contentWindow?.postMessage(
          {
            type: "render",
            token: token.current,
            html: renderSnapshot(latest.current, cssRef.current, token.current),
          },
          "*",
        );
      if (
        e.data.type === "v3-preview-event" &&
        [
          "click",
          "input",
          "change",
          "submit",
          "keydown",
          "keyup",
          "mouseover",
        ].includes(e.data.event) &&
        typeof e.data.id === "string"
      ) {
        session.current?.event({
          type: "event",
          event: e.data.event,
          id: e.data.id,
          key: String(e.data.key || "").slice(0, 80),
          code: String(e.data.code || "").slice(0, 80),
          fields: Array.isArray(e.data.fields)
            ? e.data.fields.slice(0, 100)
            : [],
        });
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  function stop() {
    session.current?.stop();
    setRunning(false);
  }
  function run() {
    stop();
    setLogs([]);
    setBefore(snapshot);
    token.current = crypto.randomUUID().replaceAll("-", "");
    latest.current = "";
    setSrcdoc(
      renderSnapshot(
        "<html><head></head><body><p>Starting isolated preview…</p></body></html>",
        css,
        token.current,
      ),
    );
    setRunning(true);
    session.current = startRuntime(html, code, storageSeed, scenario, (m) => {
      if (m.type === "snapshot" && m.html) {
        latest.current = m.html;
        setSnapshot(m.html);
        frame.current?.contentWindow?.postMessage(
          {
            type: "render",
            token: token.current,
            html: renderSnapshot(m.html, css, token.current),
          },
          "*",
        );
        if (m.storage) onStorage?.(m.storage);
      } else if (m.type === "clear") setLogs([]);
      else if (m.type === "log" || m.type === "error" || m.type === "stopped") {
        setLogs((l) => [
          ...l.slice(-149),
          { kind: m.kind || m.type, text: m.text || "" },
        ]);
        if (m.type === "stopped") setRunning(false);
      }
    });
  }
  const value = tab === "HTML" ? html : tab === "CSS" ? css : code;
  const language =
    tab === "HTML" ? "markup" : tab === "CSS" ? "css" : "javascript";
  return (
    <section className="v3-browser playground" aria-label={example.title}>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">LIVE DOM LAB · WORKER DOM BRIDGE</span>
          <h3>{example.title}</h3>
        </div>
        <span className="pill green">No real network</span>
      </div>
      {example.task && <p className="v3-task">{example.task}</p>}
      {!projectMode && (
        <div className="tabs">
          {["HTML", "CSS", "JavaScript"].map((t) => (
            <button
              className={tab === t ? "active" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <div
        className={"v3-editor-grid " + (projectMode ? "project-render" : "")}
      >
        {!projectMode && (
          <div className="editor-pane">
            <label className="sr-only" htmlFor={id}>
              {tab} source
            </label>
            <div className="v3-editor">
              <Editor
                textareaId={id}
                value={value}
                onValueChange={(v) => {
                  if (v.length > 40000) return;
                  tab === "HTML"
                    ? setHTML(v)
                    : tab === "CSS"
                      ? setCSS(v)
                      : setCode(v);
                }}
                highlight={(v) =>
                  Prism.highlight(v, Prism.languages[language], language)
                }
                padding={18}
                tabSize={2}
                insertSpaces
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  lineHeight: "22px",
                  minHeight: 310,
                }}
              />
            </div>
          </div>
        )}
        <div className="v3-preview-area">
          <label>
            Preview width
            <select value={width} onChange={(e) => setWidth(e.target.value)}>
              <option value="100%">Fit panel</option>
              <option value="320px">320px phone</option>
              <option value="768px">768px tablet</option>
            </select>
          </label>
          <div className="v3-preview-scroll">
            <iframe
              ref={frame}
              title="Student-written application preview"
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              srcDoc={srcdoc}
              style={{ width, height: 330, border: 0, background: "white" }}
            />
          </div>
        </div>
      </div>
      <div className="editor-actions">
        <button className="button primary small" onClick={run}>
          <Play size={14} />
          Run application
        </button>
        <button className="icon-label" disabled={!running} onClick={stop}>
          <Square size={13} />
          Stop
        </button>
        {!projectMode && (
          <button
            className="icon-label"
            onClick={() => {
              stop();
              setHTML(example.html);
              setCSS(example.css || baseCSS);
              setCode(example.code);
              setLogs([]);
            }}
          >
            <RotateCcw size={14} />
            Restore starter
          </button>
        )}
        {example.hint && (
          <button className="icon-label" onClick={() => setHint(!hint)}>
            Hint
          </button>
        )}
        {example.solution && (
          <button
            className="icon-label"
            onClick={() => setCode(example.solution!)}
          >
            Reveal reference
          </button>
        )}
        <label>
          Mock API scenario
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          >
            {[
              "success",
              "empty",
              "error",
              "network",
              "slow",
              "rate",
              "invalid",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {hint && <p className="hint">{example.hint}</p>}
      <div className="console-output" aria-live="polite">
        {logs.length ? (
          logs.map((l, i) => (
            <div className={"log " + l.kind} key={i}>
              <span>›</span>
              <span>{l.text}</span>
            </div>
          ))
        ) : (
          <p className="console-empty">
            Run your code, then interact with its preview.
          </p>
        )}
      </div>
      <details>
        <summary>Inspect resulting DOM & previous snapshot</summary>
        <p>
          These are serialized DOM states after execution and supported events,
          not arbitrary single-step debugging. data-lab-node identifies bridge
          nodes. There is no engine memory address or computed-layout
          inspection.
        </p>
        <pre className="code">{snapshot || "Run to inspect the document."}</pre>
        <details>
          <summary>Previous run’s snapshot</summary>
          <pre className="code">{before || "No previous run."}</pre>
        </details>
      </details>
      <details className="runner-boundaries">
        <summary>Execution support & limits</summary>
        <p>
          Student JavaScript runs in a disposable worker with a LinkeDOM
          document. Its updates render into a real isolated browser preview.
          Real input, change, click, submit, key and mouseover events are
          forwarded. Supported DOM methods include selectors, text, attributes,
          classList, style, create/append/remove and listeners. This is a
          documented DOM bridge, not a complete browser: layout APIs, native
          navigation, focus(), browser validity checks, canvas, native dialogs,
          file controls, custom elements and browser event-phase fidelity are
          unsupported. Use real-browser tools for those behaviors.
        </p>
        <p>
          HTML scripts and inline event attributes are ignored; write code in
          the JavaScript panel. Native listener behavior such as event capture
          is explored separately with a verified model. Timers, Promises,
          async/await, offline mock fetch and project-scoped learning storage
          are available. No same-origin, network, popups, downloads, or parent
          storage access is granted. A heartbeat stops unresponsive workers;
          sessions end after 60 seconds, with 150 console lines, 600 nodes and
          bounded snapshots. Extreme memory exhaustion is not safely measurable
          in a browser learning tool. Stop or rerun to clear timers.
        </p>
        <p>
          Each run starts fresh except explicitly saved project learning-storage
          values. Real production apps should use native DOM APIs and actual
          storage on their own origin.
        </p>
      </details>
    </section>
  );
}
