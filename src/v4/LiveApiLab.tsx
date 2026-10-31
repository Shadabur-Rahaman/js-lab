import { useEffect, useRef, useState } from "react";
import { liveDocument, offlineLiveResult } from "./live.mjs";
export default function LiveApiLab() {
  const token = useRef(crypto.randomUUID().replaceAll("-", "")),
    frame = useRef<HTMLIFrameElement>(null);
  const active = useRef(false);
  const [source] = useState(() => liveDocument(token.current)),
    [provider, setProvider] = useState("users"),
    [query, setQuery] = useState(""),
    [mode, setMode] = useState("offline"),
    [ready, setReady] = useState(false),
    [pending, setPending] = useState(false),
    [result, setResult] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (
        event.source !== frame.current?.contentWindow ||
        event.data?.token !== token.current
      )
        return;
      const m = event.data;
      if (m.type === "live-ready") setReady(true);
      if (!active.current) return;
      if (m.type === "live-state") {
        setPending(m.status === "pending");
        if (m.status === "cancelled") setError(m.source);
      }
      if (m.type === "live-error" && typeof m.error === "string") {
        active.current = false;
        setPending(false);
        setError(m.error);
        setResult({ source: m.source || "Live unavailable", trace: m.trace });
      }
      if (
        m.type === "live-result" &&
        Array.isArray(m.rows) &&
        m.rows.length <= 12 &&
        JSON.stringify(m).length < 35000
      ) {
        active.current = false;
        setPending(false);
        setError("");
        setResult(m);
      }
    }
    addEventListener("message", receive);
    return () => removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      active.current = false;
      setPending(false);
      setError(
        "Live request did not finish. Cancelled; choose the labeled offline fallback.",
      );
      frame.current?.contentWindow?.postMessage(
        { token: token.current, type: "live-cancel" },
        "*",
      );
    }, 12000);
    return () => clearTimeout(timer);
  }, [pending]);
  function cancel() {
    active.current = false;
    frame.current?.contentWindow?.postMessage(
      { token: token.current, type: "live-cancel" },
      "*",
    );
    setPending(false);
  }
  function load(force = false) {
    setError("");
    if (mode === "offline") {
      cancel();
      setResult({
        ...offlineLiveResult(provider, query),
        source: "Mocked offline practice",
        receivedAt: new Date().toISOString(),
      });
      return;
    }
    setPending(true);
    active.current = true;
    setResult(null);
    frame.current?.contentWindow?.postMessage(
      { token: token.current, type: "live-request", provider, query, force },
      "*",
    );
  }
  return (
    <section className="v3-card v4-learning">
      <span className="eyebrow">LIVE API LAB — CONNECT TO REAL DATA</span>
      <h2>Choose a source. Follow the response.</h2>
      <p>
        Offline practice is the default. Live mode sends only controlled public
        GET requests from a separate opaque-origin integration. It does not run
        editable student code, use credentials, expose app storage or accept
        arbitrary URLs. Public endpoints can fail or change.
      </p>
      <iframe
        ref={frame}
        title="Controlled live request service"
        sandbox="allow-scripts"
        srcDoc={source}
        hidden
      />
      <div className="controls wrap">
        <label>
          Data mode
          <select
            value={mode}
            onChange={(e) => {
              cancel();
              setMode(e.target.value);
              setResult(null);
              setError("");
            }}
          >
            <option value="offline">Offline practice</option>
            <option value="live">Live public APIs</option>
          </select>
        </label>
        <label>
          Public data source
          <select
            value={provider}
            onChange={(e) => {
              cancel();
              setProvider(e.target.value);
              setQuery(
                e.target.value === "weather"
                  ? "Kolkata"
                  : e.target.value === "television"
                    ? "girls"
                    : "",
              );
              setResult(null);
            }}
          >
            <option value="users">JSONPlaceholder fictional users</option>
            <option value="weather">Open-Meteo weather</option>
            <option value="television">TVMaze television shows</option>
          </select>
        </label>
      </div>
      <label>
        {provider === "weather"
          ? "City name"
          : provider === "television"
            ? "Television title"
            : "Filter user names"}
        <input
          value={query}
          maxLength={80}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="controls wrap">
        <button
          className="button primary small"
          disabled={pending || (mode === "live" && !ready)}
          onClick={() => load()}
        >
          Load selected data
        </button>
        <button
          className="icon-label"
          disabled={!pending}
          onClick={() => {
            cancel();
            setError("Cancelled; no new result rendered.");
          }}
        >
          Cancel live request
        </button>
        <button
          className="icon-label"
          disabled={pending || (mode === "live" && !ready)}
          onClick={() => load(true)}
        >
          Refresh selected data
        </button>
        {mode === "live" && (
          <button
            className="icon-label"
            onClick={() => {
              cancel();
              setMode("offline");
              setError("");
              setResult({
                ...offlineLiveResult(provider, query),
                source: "Offline fallback explicitly selected",
              });
            }}
          >
            Use labeled offline fallback
          </button>
        )}
      </div>
      <p role="status">
        {pending
          ? "Waiting for live response…"
          : error || result?.source || "Ready — no request sent yet"}
      </p>
      {result && (
        <>
          <p>
            <b>Source:</b> {result.source}. {result.credit}{" "}
            {result.ageSeconds ? `Age: ${result.ageSeconds} seconds.` : ""}{" "}
            {result.receivedAt ? "Received " + result.receivedAt : ""}
          </p>
          {Array.isArray(result.rows) && !result.rows.length && (
            <p>No results. Try another query.</p>
          )}
          <div className="v3-path-grid">
            {result.rows?.map((row: any, i: number) => (
              <article className="v3-card" key={i}>
                <h3>{String(row.title)}</h3>
                <p>{String(row.description)}</p>
                {row.rating !== undefined && (
                  <p>Rating: {row.rating ?? "not available"}</p>
                )}
                {row.link && <a href={row.link}>Source on TVMaze</a>}
              </article>
            ))}
          </div>
          <details>
            <summary>
              Inspect request dependency, response and parsed data
            </summary>
            <pre className="code">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </>
      )}
      <p>
        Live results cache for 60 seconds with an explicit cached label; Refresh
        bypasses cache. Six operations/minute, 1.5 seconds between starts,
        10-second cancellation timeout, bounded responses. These local limits
        are courtesy controls, not a shared server quota. No background polling.
      </p>
      <p>
        Attribution and terms:{" "}
        <a href="https://jsonplaceholder.typicode.com/">JSONPlaceholder</a>{" "}
        (fictional online REST data);{" "}
        <a href="https://open-meteo.com/">Open-Meteo</a> /{" "}
        <a href="https://open-meteo.com/en/terms">terms</a> (CC BY 4.0, free
        non-commercial educational use);{" "}
        <a href="https://www.tvmaze.com/api">TVMaze API</a> (television, CC
        BY-SA including ShareAlike). Movie exercises use fictional offline
        fixtures. TMDB/OpenWeather private-key integrations require
        learner-owned secured infrastructure and are not bundled.
      </p>
    </section>
  );
}
