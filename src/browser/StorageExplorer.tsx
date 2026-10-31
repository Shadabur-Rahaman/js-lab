import { useState } from "react";
import {
  CookieModel,
  newStorageModel,
  storageArea,
  reloadModel,
  closeTabModel,
} from "./storage.mjs";
export default function StorageExplorer() {
  const [model, setModel] = useState(newStorageModel),
    [jar] = useState(() => new CookieModel()),
    [revision, setRevision] = useState(0),
    [type, setType] = useState("local"),
    [key, setKey] = useState("theme"),
    [value, setValue] = useState("dark"),
    [cookie, setCookie] = useState(
      "theme=dark; Path=/; Max-Age=60; SameSite=Lax; Secure",
    ),
    [path, setPath] = useState("/course/page.html"),
    [cross, setCross] = useState(false),
    [method, setMethod] = useState("GET"),
    [top, setTop] = useState(true),
    [notice, setNotice] = useState("");
  const url = model.origin + path;
  const refresh = () => {
    setModel({ ...model });
    setRevision(revision + 1);
  };
  function attempt(fn: () => void) {
    try {
      fn();
      setNotice(
        "Model updated. No real application storage or cookies changed.",
      );
      refresh();
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  return (
    <section className="v3-card">
      <span className="eyebrow">
        DETERMINISTIC STORAGE MODEL · NO REAL COOKIE OR PROGRESS ACCESS
      </span>
      <h2>Follow state across origins, tabs and lifecycle events.</h2>
      <div className="controls wrap">
        <label>
          Origin
          <select
            value={model.origin}
            onChange={(e) => setModel({ ...model, origin: e.target.value })}
          >
            <option>https://learn.example.test</option>
            <option>https://other.example.test</option>
            <option>http://learn.example.test</option>
          </select>
        </label>
        <label>
          Independent tab
          <select
            value={model.tab}
            onChange={(e) => setModel({ ...model, tab: e.target.value })}
          >
            <option>A</option>
            <option>B</option>
          </select>
        </label>
        <label>
          Area
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="memory">Variable</option>
            <option value="local">localStorage</option>
            <option value="session">sessionStorage</option>
          </select>
        </label>
        <label>
          Key
          <input
            value={key}
            maxLength={80}
            onChange={(e) => setKey(e.target.value)}
          />
        </label>
        <label>
          String value
          <input
            value={value}
            maxLength={500}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
      </div>
      <div className="controls wrap">
        <button
          className="button primary small"
          onClick={() =>
            attempt(() => {
              Object.defineProperty(storageArea(model, type), key, {
                value,
                writable: true,
                configurable: true,
                enumerable: true,
              });
            })
          }
        >
          Set model value
        </button>
        <button
          className="icon-label"
          onClick={() =>
            attempt(() => {
              delete storageArea(model, type)[key];
            })
          }
        >
          Remove model key
        </button>
        <button
          className="icon-label"
          onClick={() =>
            attempt(() => {
              const area = storageArea(model, type);
              for (const k of Object.keys(area)) delete area[k];
            })
          }
        >
          Clear selected model area
        </button>
        <button
          className="button secondary small"
          onClick={() => attempt(() => reloadModel(model))}
        >
          Simulate reload
        </button>
        <button
          className="button secondary small"
          onClick={() => attempt(() => closeTabModel(model))}
        >
          Simulate end of this tab session
        </button>
      </div>
      <pre className="code" aria-live="polite">
        {JSON.stringify(
          {
            origin: model.origin,
            tab: model.tab,
            memory: storageArea(model, "memory"),
            localStorage: storageArea(model, "local"),
            sessionStorage: storageArea(model, "session"),
          },
          null,
          2,
        )}
      </pre>
      <p>
        The model’s reload clears only variables. Ending a tab session clears
        its variables and session area, while same-origin local storage remains.
        Switching origin changes the available areas. A brand-new independent
        tab is modeled, not a duplicated/opener-cloned tab. Browser session
        restore, privacy restrictions, quota and eviction can alter real
        lifetimes.
      </p>
      <h3>Cookie explorer</h3>
      <label>
        Current page path
        <input
          value={path}
          onChange={(e) =>
            setPath(e.target.value.startsWith("/") ? e.target.value : "/")
          }
        />
      </label>
      <label>
        One document.cookie-style assignment
        <textarea
          value={cookie}
          maxLength={4096}
          rows={3}
          onChange={(e) => setCookie(e.target.value)}
        />
      </label>
      <div className="controls wrap">
        <button
          className="button primary small"
          onClick={() =>
            attempt(() => {
              jar.set(cookie, url);
            })
          }
        >
          Set script cookie in model
        </button>
        <button
          className="button secondary small"
          onClick={() =>
            attempt(() => {
              jar.set(
                "session_demo=fictional; Path=/; Secure; HttpOnly; SameSite=Lax",
                url,
                true,
              );
            })
          }
        >
          Model fictional HTTP-set HttpOnly cookie
        </button>
        <button
          className="icon-label"
          onClick={() => attempt(() => jar.advance(61))}
        >
          Advance model clock 61 seconds
        </button>
        <button
          className="icon-label"
          onClick={() => attempt(() => jar.endSession())}
        >
          Model browser session end
        </button>
      </div>
      <label>
        <input
          type="checkbox"
          checked={cross}
          onChange={(e) => setCross(e.target.checked)}
        />
        Cross-site request context
      </label>
      <label>
        <input
          type="checkbox"
          checked={top}
          onChange={(e) => setTop(e.target.checked)}
        />
        Top-level navigation
      </label>
      <label>
        Request method
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option>GET</option>
          <option>POST</option>
        </select>
      </label>
      <pre className="code" aria-live="polite">
        {JSON.stringify(
          {
            clock: new Date(jar.now).toISOString(),
            scriptVisible: jar.visible(url),
            eligibleRequestCookieHeader: jar.request(url, {
              crossSite: cross,
              topLevel: top,
              method,
            }),
            modelRecords: jar.cookies.map((c) => ({
              ...c,
              value: c.httpOnly ? "[hidden from script]" : c.value,
            })),
          },
          null,
          2,
        )}
      </pre>
      <p role="status">{notice}</p>
      <p>
        This simplified cookie model implements host/domain/path matching,
        expiration, Secure and common SameSite rules for example.test teaching
        hosts. It is not a browser conformance suite: public-suffix lists,
        partitioning, request credentials modes, browser privacy policies and
        special cases are outside its model. Actual storage/cookie quotas vary.
        No real requests are made. Session cookies can be restored by some
        browsers; model session end deliberately removes them.
      </p>
      <h3>Choose storage by purpose</h3>
      <table>
        <thead>
          <tr>
            <th>Area</th>
            <th>Lifetime / scope</th>
            <th>Values & typical use</th>
            <th>Security / limit</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Variables</td>
            <td>Current running document</td>
            <td>JavaScript values; transient UI</td>
            <td>Not durable</td>
          </tr>
          <tr>
            <td>localStorage</td>
            <td>Origin; until cleared/evicted</td>
            <td>Strings; small non-sensitive preferences</td>
            <td>Synchronous; browser quotas; script-visible</td>
          </tr>
          <tr>
            <td>sessionStorage</td>
            <td>Origin + page session</td>
            <td>Strings; tab-specific drafts</td>
            <td>Session restore/opener caveats; script-visible</td>
          </tr>
          <tr>
            <td>Cookies</td>
            <td>Domain/path + expiry/session</td>
            <td>Small strings; suitable HTTP state</td>
            <td>
              Sent on eligible requests; flags matter; sensitive sessions need
              backend design
            </td>
          </tr>
          <tr>
            <td>IndexedDB</td>
            <td>Origin; until cleared/evicted</td>
            <td>Structured values; larger local projects</td>
            <td>Async; quota/privacy restrictions; not a server database</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
