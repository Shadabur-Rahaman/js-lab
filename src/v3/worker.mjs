import {
  parseHTML,
  Event,
  HTMLSelectElement,
  HTMLInputElement,
} from "linkedom/worker";
import { displayValue } from "../utils/displayValue.mjs";
import { fixtures, mockResponse } from "./mock.mjs";
const send = self.postMessage.bind(self),
  nativeTimeout = self.setTimeout.bind(self),
  nativeInterval = self.setInterval.bind(self),
  nativeClear = self.clearTimeout.bind(self);
// LinkeDOM exposes a read-only select.value; bridge the supported single-select behavior.
Object.defineProperty(HTMLSelectElement.prototype, "value", {
  configurable: true,
  get() {
    const options = [...this.querySelectorAll("option")];
    return (
      (
        options.find((o) => o.hasAttribute("selected")) || options[0]
      )?.getAttribute("value") ??
      (options.find((o) => o.hasAttribute("selected")) || options[0])
        ?.textContent ??
      ""
    );
  },
  set(value) {
    for (const option of this.querySelectorAll("option")) {
      if (
        (option.getAttribute("value") ?? option.textContent) === String(value)
      )
        option.setAttribute("selected", "");
      else option.removeAttribute("selected");
    }
  },
});
Object.defineProperty(HTMLInputElement.prototype, "checked", {
  configurable: true,
  get() {
    return this.hasAttribute("checked");
  },
  set(value) {
    if (value) {
      if (this.type === "radio" && this.name)
        for (const radio of this.ownerDocument.querySelectorAll(
          'input[type="radio"]',
        ))
          if (
            radio !== this &&
            radio.name === this.name &&
            radio.closest("form") === this.closest("form")
          )
            radio.removeAttribute("checked");
      this.setAttribute("checked", "");
    } else this.removeAttribute("checked");
  },
});
const blocked = [
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "Worker",
  "SharedWorker",
  "importScripts",
  "indexedDB",
  "caches",
  "BroadcastChannel",
  "navigator",
];
for (const key of blocked)
  try {
    Object.defineProperty(self, key, {
      value: undefined,
      writable: false,
      configurable: false,
    });
  } catch {}
let doc,
  ids = new Map(),
  serial = 0,
  logs = 0,
  timers = 0,
  store = {},
  session = Object.create(null),
  dirty = false,
  lastHTML = "",
  scenario = "success",
  database = structuredClone(fixtures);
const storage = (map) => ({
  getItem: (k) => (Object.hasOwn(map, String(k)) ? map[String(k)] : null),
  setItem: (k, v) => {
    if (JSON.stringify(map).length + String(v).length > 24000)
      throw Error("Learning storage limit: 24 KB.");
    map[String(k)] = String(v);
    dirty = true;
  },
  removeItem: (k) => {
    delete map[String(k)];
    dirty = true;
  },
  clear: () => {
    for (const k of Object.keys(map)) delete map[k];
    dirty = true;
  },
  key: (i) => Object.keys(map)[i] ?? null,
  get length() {
    return Object.keys(map).length;
  },
});
function log(kind, args) {
  if (logs++ < 150)
    send({
      type: "log",
      kind,
      text: args.map(displayValue).join(" ").slice(0, 2000),
    });
}
function snapshot() {
  if (!doc) return;
  ids = new Map();
  for (const el of doc.querySelectorAll("*")) {
    if (!el.hasAttribute("data-lab-node"))
      el.setAttribute("data-lab-node", String(++serial));
    ids.set(el.getAttribute("data-lab-node"), el);
    if (el.tagName === "INPUT" && ["checkbox", "radio"].includes(el.type)) {
      if (el.checked) el.setAttribute("checked", "");
      else el.removeAttribute("checked");
    }
  }
  const html = doc.toString();
  if (html.length > 120000 || ids.size > 600) {
    send({
      type: "error",
      text: "Preview limited to 600 elements and 120,000 characters.",
    });
    doc = null;
    return;
  }
  if (html !== lastHTML || dirty) {
    send({ type: "snapshot", html, storage: store });
    lastHTML = html;
  }
  dirty = false;
}
const safeTimeout = (fn, ms, ...args) => {
  if (typeof fn !== "function")
    throw TypeError("Timer callbacks must be functions.");
  if (++timers > 120)
    throw Error("Timer limit reached. Stop and run a fresh session.");
  return nativeTimeout(
    () => {
      try {
        fn(...args);
        snapshot();
      } catch (e) {
        failure(e);
      }
    },
    Math.max(0, Math.min(30000, Number(ms) || 0)),
  );
};
const safeInterval = (fn, ms, ...args) => {
  if (typeof fn !== "function")
    throw TypeError("Interval callbacks must be functions.");
  if (++timers > 120) throw Error("Timer limit reached.");
  return nativeInterval(
    () => {
      try {
        fn(...args);
        snapshot();
      } catch (e) {
        failure(e);
      }
    },
    Math.max(100, Number(ms) || 100),
  );
};
function failure(e) {
  send({
    type: "error",
    text: (e?.name + ": " + e?.message + "\n" + (e?.stack || "")).slice(
      0,
      3000,
    ),
  });
}
function mockFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new DOMException("Cancelled", "AbortError"));
      return;
    }
    const timer = safeTimeout(
      () => {
        try {
          const r = mockResponse(url, options, scenario, database);
          resolve({
            ok: r.status >= 200 && r.status < 300,
            status: r.status,
            headers: { get: (k) => r.headers[k.toLowerCase()] || null },
            json: async () => {
              if (scenario === "invalid")
                throw SyntaxError("Simulated malformed JSON");
              return structuredClone(r.body);
            },
            text: async () => JSON.stringify(r.body),
          });
        } catch (e) {
          reject(e);
        }
      },
      scenario === "slow" ? 1800 : 250,
    );
    options.signal?.addEventListener(
      "abort",
      () => {
        nativeClear(timer);
        reject(new DOMException("Cancelled", "AbortError"));
      },
      { once: true },
    );
  });
}
self.onmessage = async (e) => {
  const data = e.data;
  if (data.type === "start") {
    try {
      scenario = data.scenario || "success";
      store = Object.assign(
        Object.create(null),
        JSON.parse(JSON.stringify(data.storage || {})),
      );
      const parsed = parseHTML(
        data.html || "<!doctype html><html><head></head><body></body></html>",
      );
      doc = parsed.document;
      Object.defineProperty(doc, "readyState", { value: "complete" });
      const fakeConsole = Object.fromEntries(
        ["log", "info", "warn", "error", "table"].map((k) => [
          k,
          (...a) => log(k, a),
        ]),
      );
      fakeConsole.clear = () => send({ type: "clear" });
      const api = {
        document: doc,
        console: fakeConsole,
        setTimeout: safeTimeout,
        setInterval: safeInterval,
        clearTimeout: nativeClear,
        clearInterval: self.clearInterval.bind(self),
        fetch: mockFetch,
        localStorage: storage(store),
        sessionStorage: storage(session),
        alert: (v) => log("alert", [v]),
        prompt: () => null,
      };
      Object.assign(api, { window: api });
      for (const [key, value] of Object.entries(api))
        try {
          Object.defineProperty(self, key, {
            value,
            writable: false,
            configurable: false,
          });
        } catch {}
      const execute = new Function(...Object.keys(api), data.code);
      const result = execute(...Object.values(api));
      snapshot();
      Promise.resolve(result).then(() => {
        snapshot();
        send({ type: "executed" });
      }, failure);
    } catch (e) {
      failure(e);
      snapshot();
    }
  } else if (data.type === "event" && doc) {
    try {
      for (const f of data.fields || []) {
        const node = ids.get(f.id);
        if (node) {
          if (typeof f.value === "string") node.value = f.value.slice(0, 4000);
          if (typeof f.checked === "boolean") node.checked = f.checked;
        }
      }
      const target = ids.get(data.id);
      if (target) {
        const event = new Event(data.event, {
          bubbles: true,
          cancelable: true,
        });
        for (const [k, v] of Object.entries({
          key: data.key || "",
          code: data.code || "",
        }))
          Object.defineProperty(event, k, { value: v });
        target.dispatchEvent(event);
      }
      snapshot();
    } catch (e) {
      failure(e);
    }
  }
};
self.addEventListener("unhandledrejection", (e) => {
  failure(e.reason);
  e.preventDefault();
});
nativeInterval(() => {
  send({ type: "heartbeat" });
  snapshot();
}, 200);
