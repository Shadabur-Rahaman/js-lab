import { startRuntime, renderSnapshot } from "../src/v3/runtime";
import { compileProject } from "../src/v3/files.mjs";
import { applicationProjects } from "../src/v3/projects.mjs";
import {
  browserExamples,
  defaultFiles,
  formExamples,
} from "../src/v3/examples.mjs";
let passed = 0,
  failed = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function assert(condition: unknown, message: string) {
  if (!condition) throw Error(message);
}
async function check(name: string, fn: () => Promise<void> | void) {
  const li = document.createElement("li");
  try {
    await fn();
    li.className = "pass";
    li.textContent = "PASS · " + name;
    passed++;
  } catch (e) {
    li.className = "fail";
    li.textContent = "FAIL · " + name + " · " + (e as Error).message;
    failed++;
  }
  document.querySelector("#results")!.append(li);
  document.querySelector("#status")!.textContent =
    `${passed} passed · ${failed} failed`;
}
function runtime(
  html: string,
  code: string,
  scenario = "success",
  storage: Record<string, string> = {},
) {
  let executed = false;
  let latest = "",
    store: Record<string, string> = {},
    errors: string[] = [],
    logs: string[] = [],
    stopped = "";
  const session = startRuntime(html, code, storage, scenario, (m) => {
    if (m.type === "executed") executed = true;
    if (m.type === "snapshot") {
      latest = m.html || "";
      store = m.storage || {};
    }
    if (m.type === "log") logs.push(m.text || "");
    if (m.type === "error") errors.push(m.text || "");
    if (m.type === "stopped") stopped = m.text || "";
  });
  return {
    session,
    get executed() {
      return executed;
    },
    get html() {
      return latest;
    },
    get store() {
      return store;
    },
    errors,
    logs,
    get stopped() {
      return stopped;
    },
    doc() {
      return new DOMParser().parseFromString(latest, "text/html");
    },
    async wait(predicate: () => boolean, limit = 3500) {
      const end = Date.now() + limit;
      while (Date.now() < end) {
        if (errors.length) throw Error(errors.join("\n"));
        if (predicate()) return;
        await sleep(40);
      }
      throw Error("Expected state was not reached: " + latest.slice(-400));
    },
    event(
      selector: string,
      event = "click",
      values: Record<string, string | boolean> = {},
    ) {
      const doc = this.doc();
      const el = doc.querySelector(selector);
      assert(el, "Missing event target " + selector);
      const fields = [
        ...doc.querySelectorAll<HTMLInputElement>("input,textarea,select"),
      ].map((n) => ({
        id: n.getAttribute("data-lab-node"),
        value: typeof values[n.id] === "string" ? values[n.id] : n.value,
        checked: typeof values[n.id] === "boolean" ? values[n.id] : n.checked,
      }));
      session.event({
        type: "event",
        event,
        id: el!.getAttribute("data-lab-node"),
        fields,
      });
    },
  };
}
document.querySelector("#run")!.addEventListener("click", async () => {
  (document.querySelector("#run") as HTMLButtonElement).disabled = true;
  await check("student code changes document and console output", async () => {
    const e = browserExamples[0],
      r = runtime(e.html, e.code);
    try {
      await r.wait(() => r.html.includes("I wrote this JavaScript"));
      assert(
        r.logs.includes("I wrote this JavaScript"),
        "Console not forwarded",
      );
    } finally {
      r.session.stop();
    }
  });
  await check(
    "isolated native module imports use real module semantics",
    async () => {
      const p = compileProject(defaultFiles),
        r = runtime(p.html, p.code);
      try {
        await r.wait(() => r.executed && r.html.includes("data-lab-node"));
        r.event("#add");
        await r.wait(
          () => r.doc().querySelector("#count")?.textContent === "1",
        );
      } finally {
        r.session.stop();
      }
    },
  );
  await check("async ordering matches microtask/task semantics", async () => {
    const e = browserExamples.find((e) => e.id === "async")!,
      r = runtime(e.html, e.code);
    try {
      await r.wait(() => r.logs.length >= 4);
      assert(r.logs.join(",") === "Start,End,Promise,Timer", r.logs.join(","));
    } finally {
      r.session.stop();
    }
  });
  await check("worker stops a synchronous infinite loop", async () => {
    const r = runtime("<h1>Loop</h1>", "while(true){}");
    try {
      await r.wait(() => !!r.stopped, 4000);
      assert(
        r.stopped.includes("unresponsive"),
        "Watchdog did not stop worker",
      );
    } finally {
      r.session.stop();
    }
  });
  await check(
    "worker stops an infinite loop in an event callback",
    async () => {
      const r = runtime(
        '<button id="loop">Loop</button>',
        'document.querySelector("#loop").addEventListener("click",()=>{while(true){}})',
      );
      try {
        await r.wait(() => r.executed && r.html.includes("data-lab-node"));
        r.event("#loop");
        await r.wait(() => !!r.stopped, 4000);
      } finally {
        r.session.stop();
      }
    },
  );
  await check(
    "parent storage is inaccessible and mock fetch has no external transport",
    async () => {
      const r = runtime(
        "<h1>Isolation</h1>",
        'console.log(typeof indexedDB, typeof self.Worker, typeof parent);\ntry { localStorage.getItem("js-lab-progress-v1"); console.log(localStorage.getItem("js-lab-progress-v1")); }catch(e){console.log(e.name)}\nfetch("https://example.org/").catch(e=>console.log(e.name));',
      );
      try {
        await r.wait(() => r.logs.length >= 3);
        assert(r.logs[0] === "undefined undefined undefined", r.logs[0]);
        assert(r.logs[1] === "null", "Progress key must not leak");
        assert(
          r.logs[2] === "TypeError",
          "External transport must be rejected",
        );
      } finally {
        r.session.stop();
      }
    },
  );
  await check("runtime errors are reported", async () => {
    const r = runtime(
      "<h1>Error</h1>",
      'document.querySelector("#missing").textContent="x"',
    );
    try {
      await sleep(700);
      assert(
        r.errors.some((e) => e.includes("TypeError")),
        "Missing TypeError",
      );
    } finally {
      r.session.stop();
    }
  });
  await check(
    "preview removes active markup and grants only fixed nonce bridge",
    () => {
      const html = renderSnapshot(
        '<script>parent.bad=1</script><img src="https://example.org/x" onerror="bad()"><iframe></iframe><form action="https://example.org/"></form>',
        "body { color: teal }",
        "trusted-test-token",
      );
      const d = new DOMParser().parseFromString(html, "text/html");
      assert(d.scripts.length === 1, "Only trusted bridge should remain");
      assert(
        d.scripts[0].getAttribute("nonce") === "trusted-test-token",
        "Nonce missing",
      );
      assert(
        !d.querySelector("iframe,[onerror],form[action]"),
        "Active source retained",
      );
      assert(!d.querySelector("img[src]"), "Remote image retained");
    },
  );
  for (const scenario of ["success", "empty", "error", "network", "invalid"])
    await check("mock API UI scenario: " + scenario, async () => {
      const e = browserExamples.find((e) => e.id === "api")!,
        r = runtime(e.html, e.code, scenario);
      try {
        await r.wait(() => r.executed && r.html.includes("data-lab-node"));
        r.event("#load");
        await r.wait(
          () =>
            r.doc().querySelector("#status")?.textContent !== "Ready" &&
            r.doc().querySelector("#status")?.textContent !== "Loading…",
        );
        const text = r.doc().querySelector("#status")!.textContent!;
        assert(
          scenario === "success"
            ? text.includes("Loaded")
            : scenario === "empty"
              ? text.includes("No records")
              : scenario === "error"
                ? text.includes("500")
                : scenario === "network"
                  ? text.includes("network")
                  : text.includes("JSON"),
          text,
        );
      } finally {
        r.session.stop();
      }
    });
  for (const p of applicationProjects)
    await check("application reference interaction: " + p.title, async () => {
      const c = compileProject(p.files),
        r = runtime(c.html, c.code);
      try {
        await r.wait(() => r.executed && r.html.includes("data-lab-node"));
        if (p.id === "calculator") {
          r.event("#calculate", "click", { a: "2", b: "3", op: "+" });
          await r.wait(
            () => r.doc().querySelector("#result")?.textContent === "5",
          );
        } else if (p.id === "marks") {
          r.event("#add", "click", { name: "Asha", marks: "86" });
          await r.wait(() => r.html.includes("Asha: 86"));
        } else if (p.id === "todo") {
          r.event("#add", "click", { task: "Review project", filter: "all" });
          await r.wait(() => r.html.includes("Review project"));
          assert(
            r.store.tasks?.includes("Review project"),
            "Learning storage not updated",
          );
          r.event("li button");
          await r.wait(() => r.doc().querySelector("li")?.className === "done");
        } else if (p.id === "expense") {
          r.event("#add", "click", {
            name: "Fictional book",
            amount: "12.50",
            filter: "",
          });
          await r.wait(() => r.html.includes("12.50"));
        } else if (p.id === "weather") {
          r.event("#load");
          await r.wait(() => r.html.includes("Example City"));
        } else if (p.id === "products") {
          r.event("#search", "input", { search: "lamp", sort: "asc" });
          await r.wait(() => r.doc().querySelectorAll("li").length === 1);
          assert(r.html.includes("Lamp"), "Wrong filtered product");
        } else if (p.id === "quiz") {
          r.event("#options button");
          await r.wait(() => r.html.includes("Correct"));
          r.event("#next");
          await r.wait(() => r.html.includes("mapped array"));
        } else if (p.id === "rps") {
          r.event("#choices button");
          await r.wait(() => !!r.doc().querySelector("#result")?.textContent);
        } else if (p.id === "memory") {
          r.event("#cards button");
          await r.wait(
            () =>
              !r
                .doc()
                .querySelector("#cards button")
                ?.textContent?.startsWith("Card"),
          );
        } else if (p.id === "directory") {
          await r.wait(() => r.html.includes("Asha"));
          r.event("#next");
          await r.wait(() => r.html.includes("Mira"));
        } else if (p.id === "estimator") {
          r.event("#estimate", "click", {
            length: "2",
            width: "3",
            rate: "10",
          });
          await r.wait(() => r.html.includes("60.00"));
        } else if (p.id === "dashboard") {
          r.event("#load", "click", { minimum: "0" });
          await r.wait(() => r.html.includes("total 377"));
        } else if (p.id === "capstone") {
          r.event("#add", "click", {
            name: "Bracket",
            quantity: "3",
            search: "",
          });
          await r.wait(() => r.html.includes("3 total units"));
        }
        assert(!r.errors.length, r.errors.join("\n"));
      } finally {
        r.session.stop();
      }
    });
  for (const e of formExamples)
    await check("editable form: " + e!.title, async () => {
      const r = runtime(e!.html, e!.code);
      try {
        await r.wait(() => r.executed);
        if (e!.id === "form") {
          r.event("#form", "submit", {
            email: "learner@example.invalid",
            marks: "80",
            agree: true,
          });
          await r.wait(() => r.html.includes("Valid demonstration input"));
        } else if (e!.id === "contact-form") {
          r.event("#form", "submit", {
            name: "Asha",
            message: "A useful fictional message",
          });
          await r.wait(() => r.html.includes("Nothing was sent"));
        } else if (e!.id === "job-form") {
          r.event("#form", "submit", {
            name: "Dev",
            role: "design",
            skills: "Drawing",
            confirm: true,
          });
          await r.wait(() => r.html.includes("reviewed locally"));
        } else if (e!.id === "order-form") {
          r.event("#form", "submit", {
            quantity: "2",
            notebook: true,
            pencil: false,
          });
          await r.wait(() => r.html.includes("total: 90"));
        } else {
          r.event("#next", "click", { name: "Mira", topic: "" });
          await r.wait(() =>
            r.doc().querySelector("#step1")!.hasAttribute("hidden"),
          );
          r.event("#finish", "click", { name: "Mira", topic: "Projects" });
          await r.wait(() => r.html.includes("Local review complete"));
        }
      } finally {
        r.session.stop();
      }
    });
  document.querySelector("#status")!.textContent =
    `COMPLETE · ${passed} passed · ${failed} failed`;
});
