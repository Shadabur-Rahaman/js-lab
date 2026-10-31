import { nativeDocument } from "../src/browser/native.mjs";
import { browserUnits } from "../src/browser/curriculum.ts";
import { browserProjects } from "../src/browser/projects.mjs";
let passed = 0,
  failed = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
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
function assert(ok: unknown, message: string) {
  if (!ok) throw Error(message);
}
async function run(html: string, code: string, css = "", ms = 260, seed = {}) {
  const token = crypto.randomUUID().replaceAll("-", "");
  const frame = document.createElement("iframe");
  frame.sandbox.add("allow-scripts", "allow-forms");
  const logs: string[] = [],
    errors: string[] = [];
  let snapshot = "",
    storage = {};
  const receive = (e: MessageEvent) => {
    if (e.source !== frame.contentWindow || e.data?.token !== token) return;
    const m = e.data;
    if (m.type === "native-log") logs.push(m.text);
    if (m.type === "native-error") errors.push(m.text);
    if (m.type === "native-snapshot") {
      snapshot = m.html;
      storage = m.storage;
    }
  };
  addEventListener("message", receive);
  frame.srcdoc = nativeDocument(html, css, code, token, seed);
  document.querySelector("#frames")!.append(frame);
  await sleep(ms);
  frame.remove();
  removeEventListener("message", receive);
  return { logs, errors, snapshot, storage };
}
const expect = (condition: string) =>
  `if(!(${condition}))throw Error(${JSON.stringify(condition)});`;
const actions: Record<string, string> = {
  todo: `document.querySelector('#add').click();${expect("document.querySelector('#status').textContent==='Enter a task'")}document.querySelector('#task').value='A';document.querySelector('#add').click();document.querySelector('[data-action="complete"]').click();${expect("document.querySelector('#status').textContent==='1 tasks; 0 active'")}document.querySelector('[data-action="remove"]').click();${expect("document.querySelectorAll('#list li').length===0")}`,
  faq: `const headers=document.querySelectorAll('#faq h2 button');headers[0].click();${expect("!document.querySelector('#answer1').hidden")}headers[1].click();${expect("document.querySelector('#answer1').hidden&&!document.querySelector('#answer2').hidden")}headers[1].dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));${expect("document.activeElement===headers[0]")}`,
  search: `const search=document.querySelector('#search');search.value='LAMP';search.dispatchEvent(new Event('input',{bubbles:true}));${expect("document.querySelector('#results').textContent==='Lamp'")}search.value='xyz';search.dispatchEvent(new Event('input',{bubbles:true}));${expect("document.querySelector('#status').textContent==='No results'")}`,
  dropdown: `const trigger=document.querySelector('#trigger');trigger.click();const opts=document.querySelectorAll('[role="option"]');${expect("document.activeElement===opts[0]")}opts[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));${expect("document.activeElement===opts[1]")}opts[1].dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));${expect("trigger.textContent.includes('Events')&&document.querySelector('#options').hidden&&document.activeElement===trigger")}`,
  survey: `const form=document.querySelector('#survey');form.requestSubmit();${expect("document.querySelector('#name').getAttribute('aria-invalid')==='true'")}document.querySelector('#name').value='Test';document.querySelector('#topic').value='DOM';document.querySelector('#feedback').value='Useful practice';document.querySelector('#consent').checked=true;form.requestSubmit();${expect("document.querySelector('#summary').textContent.includes('nothing sent')")}`,
  notes: `document.querySelector('#note').value='First';document.querySelector('#add').click();const note=document.querySelector('#list textarea');note.value='Edited';note.dispatchEvent(new Event('change',{bubbles:true}));${expect("JSON.parse(localStorage.getItem('browser-notes'))[0].text==='Edited'")}document.querySelector('#list button').click();${expect("JSON.parse(localStorage.getItem('browser-notes')).length===0")}`,
  theme: `const before=document.body.classList.contains('dark');document.querySelector('#toggle').click();${expect("document.body.classList.contains('dark')!==before&&localStorage.getItem('browser-theme')!==null")}document.querySelector('#system').click();${expect("localStorage.getItem('browser-theme')===null")}`,
  countdown: `document.querySelector('#seconds').value='1';document.querySelector('#start').click();document.querySelector('#pause').click();${expect("document.querySelector('#remaining').textContent.startsWith('Paused')")}document.querySelector('#pause').click();setTimeout(()=>{${expect("!document.querySelector('#alert').hidden")}document.querySelector('#reset').click();${expect("document.querySelector('#remaining').textContent==='Ready'&&document.querySelector('#alert').hidden")}console.log('PROJECT_OK')},1200);`,
};
document.querySelector("#run")!.addEventListener("click", async () => {
  passed = failed = 0;
  document.querySelector("#results")!.replaceChildren();
  for (const unit of browserUnits) {
    await check("Native lesson: " + unit.id, async () => {
      // Rendered-text semantics require the frame to finish its initial layout.
      const code =
        unit.id === "browser-content"
          ? `setTimeout(()=>{${unit.code}\n},50);`
          : unit.code;
      const result = await run(unit.html, code, unit.css);
      assert(result.errors.length === 0, result.errors.join(";"));
      assert(result.snapshot.includes("data-lab-native"), "No native snapshot");
      if (unit.expected)
        assert(
          JSON.stringify(result.logs) === JSON.stringify(unit.expected),
          "Expected " +
            JSON.stringify(unit.expected) +
            " got " +
            JSON.stringify(result.logs),
        );
    });
  }
  for (const p of browserProjects)
    await check("Project interactions: " + p.id, async () => {
      const result = await run(
        p.html,
        p.code +
          "\n;setTimeout(()=>{" +
          actions[p.id] +
          (p.id === "countdown" ? "" : "console.log('PROJECT_OK')") +
          "},50);",
        "",
        p.id === "countdown" ? 1800 : 450,
      );
      assert(!result.errors.length, result.errors.join(";"));
      assert(result.logs.includes("PROJECT_OK"), "Interaction did not finish");
    });
  await check(
    "Native propagation, live collections, hidden rendered text and FormData",
    async () => {
      const r = await run(
        '<div id="outer"><button id="inner">Go<span hidden>Hidden</span></button></div><form id="f"><input name="x" value="a"><input name="x" value="b"><input required name="required"></form>',
        `setTimeout(()=>{const outer=document.querySelector('#outer'),inner=document.querySelector('#inner');const live=outer.children,staticNodes=outer.querySelectorAll('button'),nodes=outer.childNodes;outer.append(document.createElement('button'));${expect("live.length===2&&staticNodes.length===1&&nodes.length===2")}${expect("inner.textContent==='GoHidden'&&inner.innerText==='Go'")}const order=[];outer.addEventListener('click',()=>order.push('capture'),true);inner.addEventListener('click',e=>{order.push(e.target===e.currentTarget?'target':'bad')});outer.addEventListener('click',()=>order.push('bubble'));inner.click();${expect("order.join(',')==='capture,target,bubble'")}const f=document.querySelector('#f');${expect("new FormData(f).getAll('x').join(',')==='a,b'&&!f.checkValidity()")}f.elements.required.value='ok';let submitted=false;f.addEventListener('submit',e=>{e.preventDefault();submitted=true});f.requestSubmit();${expect("submitted")}console.log('NATIVE_OK')},50);`,
      );
      assert(!r.errors.length, r.errors.join(";"));
      assert(r.logs.includes("NATIVE_OK"), "Not complete");
    },
  );
  await check(
    "Opaque origin, isolated learning store and ordinary loop budget",
    async () => {
      const r = await run(
        "<p>Budget</p>",
        `let blocked=false;try{parent.document.body}catch{blocked=true}${expect("blocked")}${expect("localStorage.getItem('js-lab-progress-v1')===null")}localStorage.setItem('sample','ok');try{while(true){}}catch(e){console.log(e.name)}console.log('BUDGET_OK')`,
        "",
        900,
      );
      assert(!r.errors.length, r.errors.join(";"));
      assert(
        r.logs.includes("RangeError") && r.logs.includes("BUDGET_OK"),
        "Loop budget missing",
      );
    },
  );
  await check(
    "Immediate propagation stop preserves same-node semantics",
    async () => {
      const r = await run(
        '<div id="parent"><button id="button">Go</button></div>',
        `const result=[];const button=document.querySelector('#button');button.addEventListener('click',e=>{result.push('first');e.stopImmediatePropagation()});button.addEventListener('click',()=>result.push('second'));document.querySelector('#parent').addEventListener('click',()=>result.push('parent'));button.click();${expect("result.join(',')==='first'")}console.log('STOP_OK')`,
      );
      assert(!r.errors.length, r.errors.join(";"));
      assert(r.logs.includes("STOP_OK"), "Stop behavior failed");
    },
  );
  await check(
    "Persistent to-do and notes restore isolated seeds; malformed JSON recovers",
    async () => {
      for (const id of ["todo", "notes"]) {
        const p = browserProjects.find((p) => p.id === id)!;
        const key = id === "todo" ? "browser-tasks" : "browser-notes";
        const valid =
          id === "todo"
            ? '[{"id":1,"text":"Saved","done":false}]'
            : '[{"id":1,"text":"Saved"}]';
        const r = await run(
          p.html,
          p.code +
            `;${expect("document.querySelector('#list').textContent.includes('Saved')||document.querySelector('#list input')?.value==='Saved'||document.querySelector('#list textarea')?.value==='Saved'")}`,
          "",
          300,
          { [key]: valid },
        );
        assert(!r.errors.length, r.errors.join(";"));
        const invalid = await run(p.html, p.code, "", 300, {
          [key]: "not JSON",
        });
        assert(!invalid.errors.length, invalid.errors.join(";"));
      }
    },
  );
  await check(
    "Promise comparison handles rejection, first fulfillment and request cleanup",
    async () => {
      const unit = browserUnits.find(
        (u) => u.id === "browser-promise-coordination",
      )!;
      const r = await run(
        unit.html,
        unit.code +
          ";setTimeout(()=>document.querySelector('#load').click(),20)",
        "",
        900,
      );
      assert(!r.errors.length, r.errors.join(";"));
      assert(
        r.logs.includes("race: fast failure") &&
          r.logs.includes("any: first success") &&
          r.logs.includes("cleanup complete"),
        JSON.stringify(r.logs),
      );
      assert(
        r.snapshot.includes("rows after 1 attempt"),
        "Offline fetch did not update UI",
      );
    },
  );
  document.querySelector("#status")!.textContent += " · complete";
});
