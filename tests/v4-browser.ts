import { nativeDocument } from "../src/browser/native.mjs";
import { advancedUnits } from "../src/v4/curriculum.ts";
import { advancedProjects } from "../src/v4/projects.mjs";
import { liveDocument } from "../src/v4/live.mjs";
import { compileProject } from "../src/v3/files.mjs";
import { startRuntime } from "../src/v3/runtime";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import AdvancedChapter from "../src/v4/AdvancedChapter";
import { AdvancedFinal } from "../src/v4/Hub";
let passed = 0,
  failed = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function assert(ok: unknown, message: string) {
  if (!ok) throw Error(message);
}
const expect = (value: string) =>
  `if(!(${value}))throw Error(${JSON.stringify(value)});`;
async function check(name: string, fn: () => Promise<void>) {
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
async function run(html: string, code: string, ms = 800, scenario = "success") {
  const token = crypto.randomUUID().replaceAll("-", ""),
    frame = document.createElement("iframe");
  frame.sandbox.add("allow-scripts", "allow-forms");
  const logs: string[] = [],
    errors: string[] = [];
  let snapshot = "";
  const receive = (event: MessageEvent) => {
    if (event.source !== frame.contentWindow || event.data?.token !== token)
      return;
    const m = event.data;
    if (m.type === "native-log") logs.push(m.text);
    if (m.type === "native-error") errors.push(m.text);
    if (m.type === "native-snapshot") snapshot = m.html;
  };
  addEventListener("message", receive);
  frame.srcdoc = nativeDocument(
    html,
    "body{font:16px system-ui}",
    code,
    token,
    {},
    scenario,
    "v4",
  );
  document.querySelector("#frames")!.append(frame);
  await sleep(ms);
  frame.remove();
  removeEventListener("message", receive);
  return { logs, errors, snapshot };
}
const actions: Record<string, string> = {
  "v4-counter": `const buttons=document.querySelectorAll('#counters button');buttons[0].click();buttons[0].click();document.querySelector('#counters button:nth-of-type(2)').click();${expect("document.querySelector('#counters output').textContent==='1'")}document.querySelector('#start').value='10';document.querySelector('#step').value='2';document.querySelector('#create').click();${expect("document.querySelectorAll('#counters output')[1].textContent==='10'")}`,
  "v4-logger": `document.querySelector('#write').click();${expect("document.querySelector('#logs').textContent.includes('Workshop: ready')")}document.querySelector('#style').value='extracted';document.querySelector('#write').click();${expect("document.querySelector('#logs').textContent.includes('TypeError')")}document.querySelector('#style').value='bind';document.querySelector('#owner').value='1';document.querySelector('#write').click();${expect("document.querySelector('#logs').textContent.includes('Studio: ready')")}`,
  "v4-tasks": `document.querySelector('#run').click();setTimeout(()=>{${expect("document.querySelector('#status').textContent.includes('3 fulfilled')")}document.querySelector('#fail').checked=true;document.querySelector('#run').click();setTimeout(()=>{${expect("document.querySelector('#status').textContent.includes('1 rejected')")}document.querySelector('#run').click();document.querySelector('#cancel').click();setTimeout(()=>{${expect("document.querySelector('#status').textContent.includes('Cancelled')")}console.log('PROJECT_OK')},30)},350)},350);`,
  "v4-user-search": `setTimeout(()=>{${expect("document.querySelector('#results').textContent.includes('Asha')")}document.querySelector('#next').click();setTimeout(()=>{${expect("document.querySelector('#results').textContent.includes('Mira')")}document.querySelector('#query').value='Dev';document.querySelector('#search-form').requestSubmit();setTimeout(()=>{${expect("document.querySelector('#results').textContent.includes('Dev')&&!document.querySelector('#results').textContent.includes('Asha')")}console.log('PROJECT_OK')},260)},260)},260);`,
  "v4-weather": `setTimeout(()=>{${expect("document.querySelector('#weather').textContent.includes('26 °C')&&document.querySelectorAll('#weather li').length===3")}document.querySelector('#city').value='unknown';document.querySelector('#weather-form').requestSubmit();setTimeout(()=>{${expect("document.querySelector('#status').textContent.includes('No matching')")}console.log('PROJECT_OK')},250)},500);`,
  "v4-movies": `setTimeout(()=>{${expect("document.querySelectorAll('#cards article').length===3")}document.querySelector('#query').value='Bridge';document.querySelector('#query').dispatchEvent(new Event('input'));${expect("document.querySelectorAll('#cards article').length===1")}console.log('PROJECT_OK')},260);`,
  "v4-dashboard": `setTimeout(()=>{${expect("document.querySelector('#status').textContent.includes('1 failed')&&document.querySelector('#panels').textContent.includes('Asha')")}document.querySelector('#fail').checked=false;document.querySelector('#retry').click();setTimeout(()=>{${expect("document.querySelector('#status').textContent.includes('0 failed')&&document.querySelector('#panels').textContent.includes('Plan a small feature')")}console.log('PROJECT_OK')},260)},260);`,
  "v4-capstone": `setTimeout(()=>{${expect("document.querySelector('#records').textContent.includes('Asha')")}document.querySelector('#resource').value='products';document.querySelector('#filter').requestSubmit();setTimeout(()=>{${expect("document.querySelector('#records').textContent.includes('Notebook')")}document.querySelector('#query').value='none';document.querySelector('#filter').requestSubmit();setTimeout(()=>{${expect("document.querySelector('#status').textContent==='No results'")}console.log('PROJECT_OK')},260)},260)},260);`,
};
document.querySelector("#run")!.addEventListener("click", async () => {
  (document.querySelector("#run") as HTMLButtonElement).disabled = true;
  passed = failed = 0;
  document.querySelector("#results")!.replaceChildren();
  for (const unit of advancedUnits)
    await check("Native V4 source: " + unit.id, async () => {
      const result = await run(unit.html, unit.code);
      assert(!result.errors.length, result.errors.join(";"));
      if (unit.expected)
        assert(
          JSON.stringify(result.logs) === JSON.stringify(unit.expected),
          "Expected " +
            JSON.stringify(unit.expected) +
            "; got " +
            JSON.stringify(result.logs),
        );
      assert(result.snapshot.length > 0, "No native snapshot");
    });
  for (const project of advancedProjects)
    await check("Project actions: " + project.id, async () => {
      const action = actions[project.id];
      const asyncAction = !["v4-counter", "v4-logger"].includes(project.id);
      const result = await run(
        project.html,
        project.code +
          `;setTimeout(()=>{${action}${asyncAction ? "" : "console.log('PROJECT_OK')"}},60);`,
        1400,
      );
      assert(!result.errors.length, result.errors.join(";"));
      assert(
        result.logs.includes("PROJECT_OK"),
        "Project actions did not complete",
      );
    });
  for (const [scenario, fragment] of [
    ["error", "HTTP 500"],
    ["missing", "HTTP 404"],
    ["type", "Expected JSON"],
    ["invalid", "SyntaxError"],
    ["network", "TypeError"],
    ["cors", "TypeError"],
  ])
    await check("Failure path: " + scenario, async () => {
      const unit = advancedUnits.find((u) => u.id === "v4-parse")!;
      const result = await run(unit.html, unit.code, 500, scenario);
      assert(!result.errors.length, result.errors.join(";"));
      assert(
        result.logs.some((line) => line.includes(fragment)),
        JSON.stringify(result.logs),
      );
    });
  await check(
    "Stale request owner cannot overwrite a newer result",
    async () => {
      const result = await run(
        '<p id="out"></p>',
        `let generation=0;async function search(name,delay){const mine=++generation;const response=await fetch('/api/users?q='+name+'&delay='+delay);const rows=await response.json();if(mine===generation)document.querySelector('#out').textContent=rows[0]?.name||'empty'}search('Asha',300);search('Dev',40);setTimeout(()=>{${expect("document.querySelector('#out').textContent==='Dev'")}console.log('OWNED')},450)`,
        700,
      );
      assert(!result.errors.length, result.errors.join(";"));
      assert(result.logs.includes("OWNED"), "Ownership failed");
    },
  );
  await check("Native cancellation, 204 and parent isolation", async () => {
    const result = await run(
      "<p>Boundaries</p>",
      `(async()=>{let blocked=false;try{parent.document.body}catch{blocked=true}${expect("blocked")}${expect("localStorage.getItem('js-lab-progress-v1')===null")}const controller=new AbortController();const pending=fetch('/api/users?delay=400',{signal:controller.signal});controller.abort();try{await pending;throw Error('Not aborted')}catch(error){${expect("error.name==='AbortError'")}}const deleted=await fetch('/api/users/1',{method:'DELETE'});${expect("deleted.status===204&&await deleted.text()===''")}console.log('BOUNDARIES_OK')})().catch(error=>console.error(error.message));`,
      700,
    );
    assert(!result.errors.length, result.errors.join(";"));
    assert(result.logs.includes("BOUNDARIES_OK"), JSON.stringify(result.logs));
  });
  for (const mode of ["sequential", "concurrent"])
    await check("Actual user loader: " + mode, async () => {
      const unit = advancedUnits.find((u) => u.id === "v4-user-loading")!;
      const result = await run(
        unit.html,
        unit.code +
          `;setTimeout(()=>{document.querySelector('#mode').value=${JSON.stringify(mode)};document.querySelector('#load-users').click();setTimeout(()=>{${expect("document.querySelector('#status').textContent.includes('Asha, Dev, Mira')")}console.log('USERS_OK')},720)},50)`,
        1000,
      );
      assert(!result.errors.length, result.errors.join(";"));
      assert(result.logs.includes("USERS_OK"), JSON.stringify(result.logs));
    });
  await check(
    "Existing isolated native module mode: top-level this and await",
    async () => {
      const project = compileProject({
        "index.html":
          '<!doctype html><html><head><title>Module</title></head><body><p>Module context</p><script type="module" src="app.js"></script></body></html>',
        "app.js":
          "console.log(this===undefined);const value=await Promise.resolve(42);console.log(value);",
      });
      const logs: string[] = [],
        errors: string[] = [];
      const runtime = startRuntime(
        project.html,
        project.code,
        {},
        "success",
        (m) => {
          if (m.type === "log") logs.push(m.text || "");
          if (m.type === "error") errors.push(m.text || "");
        },
      );
      try {
        for (let n = 0; n < 60 && logs.length < 2 && !errors.length; n++)
          await sleep(50);
        assert(!errors.length, errors.join(";"));
        assert(logs.join(",") === "true,42", JSON.stringify(logs));
      } finally {
        runtime.stop();
      }
    },
  );
  await check("Inspector IDs stay out of learner DOM attributes", async () => {
    const result = await run(
      '<p id="node">Text</p>',
      `setTimeout(()=>{${expect("document.querySelectorAll('[data-lab-native]').length===0")}console.log('DOM_CLEAN')},80)`,
      300,
    );
    assert(!result.errors.length, result.errors.join(";"));
    assert(
      result.logs.includes("DOM_CLEAN") &&
        result.snapshot.includes("data-lab-native"),
      "Inspector snapshot/live DOM separation failed",
    );
  });
  await check(
    "React concept switching removes old visualizers; closure and trace controls change state",
    async () => {
      const host = document.createElement("section");
      document.querySelector("#frames")!.append(host);
      const root = createRoot(host);
      const props = {
        id: 15,
        teacher: false,
        completed: false,
        concepts: [],
        onConcept() {},
        onAnswer() {},
        onComplete() {},
      };
      root.render(createElement(AdvancedChapter, props));
      const button = (name: string) =>
        [...host.querySelectorAll("button")].find(
          (b) => b.textContent?.trim() === name,
        ) as HTMLButtonElement;
      try {
        await sleep(80);
        button("Experiment").click();
        await sleep(50);
        const choose = async (value: string) => {
          const select = host.querySelector(
            ".browser-unit-select select",
          ) as HTMLSelectElement;
          select.value = value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          await sleep(50);
        };
        await choose("v4-retained");
        assert(
          ![...host.querySelectorAll("h2")].some(
            (h) => h.textContent === "Scope Explorer",
          ),
          "Old scope UI remained",
        );
        button("Increment A").click();
        await sleep(30);
        assert(
          host.textContent?.includes("Counter A returned 1"),
          "Counter did not change",
        );
        await choose("v4-contexts");
        assert(
          ![...host.querySelectorAll("h2")].some(
            (h) => h.textContent === "Closure Memory Explorer",
          ),
          "Old closure UI remained",
        );
        button("Next step").click();
        await sleep(30);
        assert(host.textContent?.includes("Step 2/"), "Trace did not step");
        button("Previous step").click();
        await sleep(30);
        assert(host.textContent?.includes("Step 1/"), "Trace did not reverse");
      } finally {
        root.unmount();
        host.remove();
      }
    },
  );
  await check(
    "Existing Quiz component records V4 final answers and feedback",
    async () => {
      const host = document.createElement("section");
      document.querySelector("#frames")!.append(host);
      const root = createRoot(host),
        answers: string[] = [];
      root.render(
        createElement(AdvancedFinal, {
          teacher: false,
          onAnswer: (id: string, correct: boolean) => {
            if (correct) answers.push(id);
          },
          done() {},
        }),
      );
      try {
        await sleep(60);
        const quiz = host.querySelector(".quiz-card")!;
        const choice = quiz.querySelector(".quiz-choice") as HTMLButtonElement;
        choice.click();
        await sleep(30);
        (quiz.querySelector(".button") as HTMLButtonElement).click();
        await sleep(30);
        assert(answers.includes("v4-final-15-0"), "Answer not recorded");
        assert(
          quiz.textContent?.includes("You’ve got it."),
          "Feedback missing",
        );
      } finally {
        root.unmount();
        host.remove();
      }
    },
  );
  document.querySelector("#status")!.textContent += " · deterministic complete";
  (document.querySelector("#run") as HTMLButtonElement).disabled = false;
});
document.querySelector("#live")!.addEventListener("click", async () => {
  (document.querySelector("#live") as HTMLButtonElement).disabled = true;
  for (const [provider, query] of [
    ["users", ""],
    ["weather", "Kolkata"],
    ["television", "girls"],
  ])
    await check("Actual approved provider: " + provider, async () => {
      const frame = document.createElement("iframe"),
        token = crypto.randomUUID().replaceAll("-", "");
      frame.sandbox.add("allow-scripts");
      let ready = false,
        result: any;
      const receive = (e: MessageEvent) => {
        if (e.source !== frame.contentWindow || e.data?.token !== token) return;
        if (e.data.type === "live-ready") ready = true;
        if (e.data.type === "live-result" || e.data.type === "live-error")
          result = e.data;
      };
      addEventListener("message", receive);
      frame.srcdoc = liveDocument(token);
      document.querySelector("#frames")!.append(frame);
      try {
        for (let n = 0; n < 40 && !ready; n++) await sleep(50);
        assert(ready, "Controller did not start");
        frame.contentWindow!.postMessage(
          { token, type: "live-request", provider, query },
          "*",
        );
        for (let n = 0; n < 230 && !result; n++) await sleep(50);
        assert(
          result?.type === "live-result",
          result?.error || "No provider response",
        );
        assert(
          result.source === "Live response" && result.rows.length > 0,
          "Not a validated live result",
        );
        assert(
          result.trace.every((step: any) => step.url.startsWith("https://")),
          "Unexpected request",
        );
      } finally {
        frame.remove();
        removeEventListener("message", receive);
      }
    });
  document.querySelector("#status")!.textContent += " · live checks complete";
  (document.querySelector("#live") as HTMLButtonElement).disabled = false;
});
