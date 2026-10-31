import { useEffect, useId, useRef, useState } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-css";
import { Play, Square, RotateCcw } from "lucide-react";
import { renderSnapshot, startRuntime } from "./runtime";
import { nativeDocument } from "../browser/native.mjs";
import { download, zipProject } from "./files.mjs";
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
  engine = "bridge",
}: {
  engine?: "bridge" | "native";
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
  const [selected, setSelected] = useState(""),
    [copyNotice, setCopyNotice] = useState("");
  const container = useRef<HTMLElement>(null);
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
      if (engine === "native") {
        const m = e.data;
        if (
          m.type === "native-snapshot" &&
          typeof m.html === "string" &&
          m.html.length <= 120000
        ) {
          setSnapshot(m.html);
          latest.current = m.html;
          if (
            m.storage &&
            typeof m.storage === "object" &&
            Object.entries(m.storage).length <= 100 &&
            Object.entries(m.storage).every(
              ([k, v]) =>
                k.length <= 200 && typeof v === "string" && v.length <= 24000,
            )
          )
            onStorage?.(m.storage);
        }
        if (
          m.type === "native-log" ||
          m.type === "native-error" ||
          m.type === "native-stopped"
        ) {
          if (typeof m.text === "string")
            setLogs((l) => [
              ...l.slice(-149),
              { kind: m.kind || m.type, text: m.text.slice(0, 3000) },
            ]);
          if (m.type === "native-stopped") {
            setRunning(false);
            setSrcdoc(
              renderSnapshot(
                latest.current || "<p>Session ended.</p>",
                cssRef.current,
                token.current,
              ),
            );
          }
        }
        if (m.type === "native-clear") setLogs([]);
        if (m.type === "native-select" && typeof m.selected === "string")
          setSelected(m.selected.replace(/[^0-9]/g, ""));
        return;
      }
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
  }, [engine, onStorage]);
  function stop() {
    session.current?.stop();
    if (engine === "native") {
      frame.current?.contentWindow?.postMessage(
        { type: "native-stop", token: token.current },
        "*",
      );
      setSrcdoc(
        renderSnapshot(
          snapshot || "<p>Execution stopped. Run again.</p>",
          css,
          token.current,
        ),
      );
    }
    setRunning(false);
  }
  function run() {
    stop();
    setLogs([]);
    setBefore(snapshot);
    token.current = crypto.randomUUID().replaceAll("-", "");
    latest.current = "";
    if (engine === "native") {
      try {
        setSrcdoc(
          nativeDocument(html, css, code, token.current, storageSeed, scenario),
        );
        setRunning(true);
      } catch (error) {
        setLogs([
          {
            kind: "error",
            text: (error as Error).name + ": " + (error as Error).message,
          },
        ]);
      }
      return;
    }
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
    <section
      ref={container}
      className="v3-browser playground"
      aria-label={example.title}
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            LIVE DOM LAB ·{" "}
            {engine === "native"
              ? "NATIVE BROWSER DOCUMENT"
              : "WORKER DOM BRIDGE"}
          </span>
          <h3>{example.title}</h3>
        </div>
        <span className="pill green">Offline fetch fixtures</span>
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
              sandbox={
                engine === "native"
                  ? "allow-scripts allow-forms"
                  : "allow-scripts"
              }
              allow="camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'"
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
        <button
          className="icon-label"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopyNotice("Current source copied.");
            } catch {
              setCopyNotice("Select the source and use Ctrl+C or ⌘ C.");
            }
          }}
        >
          Copy source
        </button>
        <button
          className="icon-label"
          onClick={() => {
            const d = new DOMParser().parseFromString(html, "text/html");
            d.querySelectorAll("script").forEach((n) => n.remove());
            const link = d.createElement("link");
            link.rel = "stylesheet";
            link.href = "style.css";
            d.head.append(link);
            const script = d.createElement("script");
            script.src = "app.js";
            d.body.append(script);
            download(
              zipProject({
                "index.html": "<!doctype html>" + d.documentElement.outerHTML,
                "style.css": css,
                "app.js": code,
                "README.md":
                  "Exported educational source. Open index.html on your own origin. Preview-only mock APIs and learning storage are not included; no backend is supplied.",
              }),
              "browser-exercise.zip",
              "application/zip",
            );
          }}
        >
          Download source
        </button>
        <button
          className="icon-label"
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            else
              container.current
                ?.requestFullscreen()
                .catch(() =>
                  setCopyNotice("Fullscreen is unavailable in this browser."),
                );
          }}
        >
          Fullscreen
        </button>
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
      {copyNotice && (
        <p role="status" className="hint">
          {copyNotice}
        </p>
      )}
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
        {engine === "native" && (
          <NativeTree
            html={snapshot}
            selected={selected}
            select={(id) => {
              setSelected(id);
              frame.current?.contentWindow?.postMessage(
                { type: "native-select", token: token.current, selected: id },
                "*",
              );
            }}
          />
        )}
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
        {engine === "native" ? (
          <>
            <p>
              This mode runs actual browser DOM, live HTMLCollections, native
              event propagation, FormData, validation and focus in an
              opaque-origin iframe. Your code executes as a function body after
              the HTML has been parsed. HTML script tags/inline handlers are
              ignored; use the JavaScript panel. CSS and DOM behavior are
              native. Cookies and Web Storage use explicitly isolated learning
              models; they never expose this app’s origin.
            </p>
            <p>
              Source loops and function bodies receive cooperative
              execution-budget checks. Ordinary infinite loops and recursion are
              interrupted; timers are bounded and the document is disposed on
              Stop/Run. The preview has a restrictive CSP and no same-origin,
              popups, clipboard or download permission. Fetch uses offline
              fixtures; CSP blocks ordinary network subresources and form
              navigation. Self-navigation is not a hostile-code containment
              boundary. This is for ordinary classroom code, not intentionally
              hostile snippets: instrumentation and a timeout cannot guarantee
              protection from all native blocking calls, memory exhaustion or
              browser exploits. The separate worker runner remains available for
              synchronous practice. Sessions end after 60 seconds; output, nodes
              and snapshots are bounded.
            </p>
          </>
        ) : (
          <p>
            Student JavaScript runs in a disposable worker with a LinkeDOM
            document. Its updates render into a real isolated browser preview.
            Real input, change, click, submit, key and mouseover events are
            forwarded. Supported DOM methods include selectors, text,
            attributes, classList, style, create/append/remove and listeners.
            This is a documented DOM bridge, not a complete browser: layout
            APIs, native navigation, focus(), browser validity checks, canvas,
            native dialogs, file controls, custom elements and browser
            event-phase fidelity are unsupported. Use real-browser tools for
            those behaviors.
          </p>
        )}
        {engine === "bridge" && (
          <p>
            HTML scripts and inline event attributes are ignored; write code in
            the JavaScript panel. Native listener behavior such as event capture
            is explored separately with a verified model. Timers, Promises,
            async/await, offline mock fetch and project-scoped learning storage
            are available. No same-origin, network, popups, downloads, or parent
            storage access is granted. A heartbeat stops unresponsive workers;
            sessions end after 60 seconds, with 150 console lines, 600 nodes and
            bounded snapshots. Extreme memory exhaustion is not safely
            measurable in a browser learning tool. Stop or rerun to clear
            timers.
          </p>
        )}
        <p>
          Each run starts fresh except explicitly saved project learning-storage
          values. Real production apps should use native DOM APIs and actual
          storage on their own origin.
        </p>
      </details>
    </section>
  );
}

function NativeTree({
  html,
  selected,
  select,
}: {
  html: string;
  selected: string;
  select: (id: string) => void;
}) {
  if (!html)
    return <p>Run the example, then click an element in its preview.</p>;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = [...doc.querySelectorAll("[data-lab-native]")];
  const node = nodes.find(
    (n) => n.getAttribute("data-lab-native") === selected,
  );
  return (
    <div className="native-tree">
      <p>
        Click a preview element or choose its node below. Text nodes (type 3),
        comments (type 8) and element nodes (type 1) are distinct.
      </p>
      <div className="tabs wrap">
        {nodes.slice(0, 80).map((n) => (
          <button
            className={n === node ? "active" : ""}
            key={n.getAttribute("data-lab-native")}
            onClick={() => select(n.getAttribute("data-lab-native")!)}
          >
            {n.tagName.toLowerCase()}
            {n.id ? "#" + n.id : ""}
          </button>
        ))}
      </div>
      {node && (
        <pre className="code">
          {JSON.stringify(
            {
              nodeType: node.nodeType,
              tag: node.tagName,
              attributes: Object.fromEntries(
                [...node.attributes]
                  .filter((a) => a.name !== "data-lab-native")
                  .map((a) => [a.name, a.value]),
              ),
              parent: node.parentElement?.tagName,
              children: [...node.children].map((n) => n.tagName),
              childNodes: [...node.childNodes].map((n) => ({
                type: n.nodeType,
                name: n.nodeName,
                text:
                  n.nodeType === 1 ? undefined : n.textContent?.slice(0, 100),
              })),
              previous: node.previousElementSibling?.tagName,
              next: node.nextElementSibling?.tagName,
            },
            null,
            2,
          )}
        </pre>
      )}
    </div>
  );
}
