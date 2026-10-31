const example = (id, title, html, code, task, hint, solution) => ({
  id,
  title,
  html:
    "<!doctype html><html><head><title>" +
    title +
    "</title></head><body>" +
    html +
    "</body></html>",
  code,
  task,
  hint,
  solution,
});
export const browserExamples = [
  example(
    "heading",
    "Change real page content",
    '<h1 id="title">Before</h1><p id="note">A paragraph</p>',
    'const heading = document.querySelector("#title");\nheading.textContent = "I wrote this JavaScript";\nconsole.log(heading.textContent);',
    "Change the heading, then change the paragraph. Compare console output with the visible page.",
    "querySelector returns null when no element matches. Check the selector before using textContent.",
    'document.getElementById("title").textContent = "My first DOM update";\ndocument.querySelector("#note").textContent = "The page changed.";',
  ),
  example(
    "style",
    "Style, hide & show",
    '<h1>Theme workshop</h1><button id="theme">Change theme</button><button id="toggle">Show/hide note</button><p id="note">A visible note</p>',
    'document.querySelector("#theme").addEventListener("click", () => {\n document.body.classList.toggle("dark");\n});\ndocument.querySelector("#toggle").addEventListener("click", () => {\n const note = document.querySelector("#note");\n note.hidden = !note.hidden;\n});',
    "Add a second class or change a style property. Keep the controls usable by keyboard.",
    "classList changes class tokens; style changes inline declarations. hidden is a semantic visibility state.",
  ),
  example(
    "list",
    "Create, append & remove",
    '<h1>Task list</h1><label>Task <input id="task"></label><button id="add">Add task</button><ul id="list"></ul><p id="status" role="status"></p>',
    'const list = document.querySelector("#list");\ndocument.querySelector("#add").addEventListener("click", () => {\n const input = document.querySelector("#task");\n if (!input.value.trim()) return;\n const item = document.createElement("li");\n const button = document.createElement("button");\n button.textContent = input.value.trim() + " — remove";\n item.appendChild(button); list.append(item); input.value = "";\n});\nlist.addEventListener("click", event => {\n const button = event.target.closest("button");\n if (button) { button.parentElement.remove(); document.querySelector("#status").textContent = "Task removed"; }\n});',
    "Add dynamically created tasks, then remove them through one delegated listener. Add an empty-input message.",
    "Listen on the list and inspect event.target. Use textContent for text supplied by a user.",
  ),
  example(
    "counter",
    "Accessible counter",
    '<h1>Counter</h1><button id="minus">Decrease</button><button id="plus">Increase</button><p id="count" role="status">0</p>',
    'let count = 0;\nfunction render() { document.querySelector("#count").textContent = String(count); }\ndocument.querySelector("#plus").addEventListener("click", () => { count++; render(); });\ndocument.querySelector("#minus").addEventListener("click", () => { count--; render(); });',
    "Add a Reset button and handler. Keep state and rendering separate.",
    "The paragraph is an output; the buttons are actions. A polite status announces a meaningful update.",
  ),
  example(
    "input",
    "Input, change & keyboard events",
    '<h1>Typing workshop</h1><label>Fictional message <textarea id="message"></textarea></label><p id="count" role="status">0 characters</p><p id="key"></p>',
    'const input = document.querySelector("#message");\nfunction update(event) { document.querySelector("#count").textContent = event.target.value.length + " characters"; }\ninput.addEventListener("input", update);\ninput.addEventListener("keydown", event => { document.querySelector("#key").textContent = "Last key: " + event.key; });',
    "Try spaces and different keys. Add a maximum-length warning without hiding the label.",
    "input fires as a value changes through editing; change commonly fires when a change is committed. removeEventListener needs the same function reference.",
  ),
  example(
    "profile",
    "Update a profile & notification",
    '<h1>Profile</h1><label>Fictional name <input id="name"></label><button id="save">Update card</button><article><h2 id="card">Guest</h2><p id="notice" role="status"></p></article>',
    'document.querySelector("#save").addEventListener("click", () => {\n const name = document.querySelector("#name").value.trim();\n document.querySelector("#card").textContent = name || "Guest";\n document.querySelector("#notice").textContent = "Card updated in this preview";\n});',
    "Show a message when a name is empty. Use fictional information.",
    "innerHTML parses markup and can create injection risk. Prefer textContent for untrusted strings.",
  ),
  example(
    "form",
    "Form handling & accessible feedback",
    '<h1>Fictional registration</h1><form id="form"><label>Email <input id="email" type="email"></label><label>Marks <input id="marks" inputmode="decimal"></label><label><input id="agree" type="checkbox"> I understand this is a demo</label><button>Review registration</button></form><p id="result" role="status"></p>',
    'document.querySelector("#form").addEventListener("submit", event => {\n event.preventDefault();\n const email = document.querySelector("#email").value.trim();\n const raw = document.querySelector("#marks").value.trim();\n const marks = Number(raw);\n const errors = [];\n if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) errors.push("Enter a plausible fictional email.");\n if (!raw || !Number.isFinite(marks) || marks < 0 || marks > 100) errors.push("Marks must be between 0 and 100.");\n if (!document.querySelector("#agree").checked) errors.push("Confirm the demo notice.");\n document.querySelector("#result").textContent = errors.length ? errors.join(" ") : "Valid demonstration input. Nothing was submitted.";\n});',
    "Add a labeled select and radio group. Read their values. Add a confirmation field using fictional text only.",
    "Frontend validation helps people. It is not secure authentication or a server-side validation service.",
  ),
  example(
    "async",
    "Timers, Promises & async code",
    "<h1>Async workshop</h1><p>Watch the console.</p>",
    'console.log("Start");\nsetTimeout(() => console.log("Timer"), 0);\nPromise.resolve().then(() => console.log("Promise"));\nconsole.log("End");',
    "Predict the order before running. Then add a chained then and explain when it executes.",
    "The synchronous stack finishes before promise reactions. Ready timer callbacks are tasks; promise reactions are microtasks.",
  ),
  example(
    "promises",
    "Fulfillment, rejection & cleanup",
    '<h1>Promise lifecycle</h1><p id="state" role="status">Pending</p>',
    'async function load() {\n try {\n  const value = await new Promise(resolve => setTimeout(() => resolve("Ready"), 400));\n  document.querySelector("#state").textContent = value;\n  console.log(await Promise.all([Promise.resolve(1), Promise.resolve(2)]));\n  console.log(await Promise.allSettled([Promise.resolve(1), Promise.reject("Example error")]));\n } catch (error) { console.error(error.message); }\n finally { console.log("Cleanup"); }\n}\nload();',
    'Change resolve to reject(new Error("Unavailable")); handle the error and show an error state.',
    "await pauses that async function; it does not block the worker’s whole event loop. Promise.all rejects on the first rejection; allSettled reports every outcome.",
  ),
  example(
    "interval",
    "Start, stop & clear timers",
    '<h1>Timer</h1><button id="start">Start</button><button id="stop">Stop</button><p id="ticks" role="status">0</p>',
    'let timer = null, ticks = 0;\ndocument.querySelector("#start").addEventListener("click", () => {\n if (timer !== null) return;\n timer = setInterval(() => { document.querySelector("#ticks").textContent = String(++ticks); }, 500);\n});\ndocument.querySelector("#stop").addEventListener("click", () => { clearInterval(timer); timer = null; });',
    "Make Start safe to click repeatedly. Explain why clearing a timer prevents future callbacks rather than undoing past work.",
    "Intervals are not precise clocks. This learning worker enforces a minimum interval of 100ms.",
  ),
  example(
    "api",
    "API explorer — offline fictional data",
    '<h1>Student records</h1><button id="load">Load records</button><button id="cancel">Cancel</button><p id="status" role="status">Ready</p><ul id="records"></ul>',
    'let controller;\ndocument.querySelector("#cancel").addEventListener("click", () => controller?.abort());\ndocument.querySelector("#load").addEventListener("click", async () => {\n controller?.abort(); controller = new AbortController();\n const status = document.querySelector("#status");\n status.textContent = "Loading…";\n try {\n  const response = await fetch("/api/students?page=1&limit=2", { signal: controller.signal });\n  if (!response.ok) throw new Error("HTTP " + response.status);\n  const data = await response.json();\n  document.querySelector("#records").replaceChildren();\n  for (const student of data) { const li = document.createElement("li"); li.textContent = student.name + ": " + student.marks; document.querySelector("#records").append(li); }\n  status.textContent = data.length ? "Loaded fictional records" : "No records found";\n } catch (error) { status.textContent = error.name === "AbortError" ? "Cancelled" : error.message; }\n});',
    "Switch the mock scenario and rerun. Try /api/products, courses, weather, posts, tasks, countries or users. Add q, page and limit query parameters.",
    "fetch rejects for a network failure, but normally resolves for an HTTP error. Check ok/status before parsing JSON.",
  ),
  example(
    "storage",
    "Project-scoped storage & state",
    '<h1>Notes</h1><label>Fictional note <textarea id="note"></textarea></label><button id="save">Save note</button><button id="load">Load note</button><button id="remove">Remove saved note</button><p id="status" role="status"></p>',
    'const input = document.querySelector("#note");\ninput.value = JSON.parse(localStorage.getItem("note") || \'""\');\ndocument.querySelector("#save").addEventListener("click", () => { localStorage.setItem("note", JSON.stringify(input.value)); document.querySelector("#status").textContent = "Stored in this project’s learning storage"; });\ndocument.querySelector("#load").addEventListener("click", () => { input.value = JSON.parse(localStorage.getItem("note") || \'""\'); });\ndocument.querySelector("#remove").addEventListener("click", () => { localStorage.removeItem("note"); input.value = ""; });',
    "Save a note, change the field, and load it again. Use the workspace Save to retain learning storage across sessions.",
    "This is a bounded per-project storage facade. It never reads the real JS LAB progress key or native app storage.",
  ),
];
export const defaultFiles = {
  "index.html":
    '<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>My application</title><link rel="stylesheet" href="css/style.css"></head><body><h1>My application</h1><button id="add">Add one</button><p id="count" role="status">0</p><script type="module" src="js/app.js"></script></body></html>',
  "css/style.css":
    "body { font: 16px/1.7 system-ui; padding: 24px; background:#fafaf5; color:#24332b; } button { padding:12px; font:inherit; } :focus-visible { outline: 3px solid teal; }",
  "js/app.js":
    'import { increment } from "./logic.js";\nlet count = 0;\ndocument.querySelector("#add").addEventListener("click", () => {\n count = increment(count);\n document.querySelector("#count").textContent = String(count);\n});',
  "js/logic.js":
    "export function increment(value) { return value + 1; }\nexport default increment;",
  "README.md":
    "# My application\n\nFictional educational example. Use a local development server for native ES modules. No backend or authentication.\n",
};
browserExamples.push(
  example(
    "password",
    "Fictional password visibility",
    '<h1>Visibility control</h1><p>Use fictional sample text only.</p><label>Demo string<input id="demo" type="password" value="sample-text"></label><button id="toggle" aria-pressed="false">Show demo string</button>',
    'document.querySelector("#toggle").addEventListener("click", () => {\n const input=document.querySelector("#demo"), button=document.querySelector("#toggle");\n const show=input.type === "password";\n input.type=show ? "text" : "password";\n button.setAttribute("aria-pressed", String(show));\n button.textContent=show ? "Hide demo string" : "Show demo string";\n});',
    "Change a supported input attribute and keep the action name and state accurate. Do not enter or store a real password.",
    "A masked field changes presentation, not access protection.",
  ),
  example(
    "keyboard",
    "Keyboard-controlled marker",
    '<h1>Move the marker</h1><p>Focus the button, then use ArrowLeft or ArrowRight. Buttons provide an alternative.</p><button id="board">Keyboard control</button><button id="left">Move left</button><button id="right">Move right</button><p id="position" role="status">Position: 0</p>',
    'let position=0;\nfunction move(delta){position=Math.max(0,Math.min(5,position+delta));document.querySelector("#position").textContent="Position: "+position;}\ndocument.querySelector("#board").addEventListener("keydown",event=>{if(event.key==="ArrowLeft"){event.preventDefault();move(-1)}else if(event.key==="ArrowRight"){event.preventDefault();move(1)}});\ndocument.querySelector("#left").addEventListener("click",()=>move(-1));\ndocument.querySelector("#right").addEventListener("click",()=>move(1));',
    "Keep movement within 0–5. Add a reset action and explain event.key.",
    "Keyboard behavior needs a focusable control, bounds, and a non-keyboard alternative.",
  ),
);
export const formExamples = [
  browserExamples.find((e) => e.id === "form"),
  example(
    "contact-form",
    "Contact form",
    '<h1>Fictional contact form</h1><p>No delivery service is connected.</p><form id="form"><label>Name<input id="name"></label><label>Message<textarea id="message"></textarea></label><button>Review message</button></form><p id="result" role="status"></p>',
    `document.querySelector('#form').addEventListener('submit',event=>{event.preventDefault();const name=document.querySelector('#name').value.trim(),message=document.querySelector('#message').value.trim();document.querySelector('#result').textContent=!name?'Enter a fictional name':message.length<10?'Write at least 10 characters':'Message valid for this local demonstration. Nothing was sent.'});`,
    "Validate visible fields, clear old errors after a repair, and state the delivery boundary.",
    "Use textContent for the message, and explain that static validation does not send email.",
  ),
  example(
    "job-form",
    "Job application form",
    '<h1>Fictional application</h1><form id="form"><label>Display name<input id="name"></label><label>Role<select id="role"><option value="">Choose a role</option><option value="design">Design</option><option value="development">Development</option></select></label><label>Skills<textarea id="skills"></textarea></label><label><input id="confirm" type="checkbox"> Fictional information only</label><button>Review application</button></form><p id="result" role="status"></p>',
    `document.querySelector('#form').addEventListener('submit',event=>{event.preventDefault();const name=document.querySelector('#name').value.trim(),role=document.querySelector('#role').value,skills=document.querySelector('#skills').value.trim();const errors=[];if(!name)errors.push('Enter a fictional name.');if(!role)errors.push('Choose a role.');if(skills.length<5)errors.push('Describe at least one skill.');if(!document.querySelector('#confirm').checked)errors.push('Confirm the demonstration notice.');document.querySelector('#result').textContent=errors.length?errors.join(' '):'Application reviewed locally for '+role+'. Nothing was submitted.'});`,
    "Practice select values, checkboxes and a useful error summary. Add field-level error associations.",
    "A local success state does not create an application in an employer’s system.",
  ),
  example(
    "order-form",
    "Product order form",
    '<h1>Fictional order</h1><form id="form"><fieldset><legend>Product</legend><label><input type="radio" name="product" id="notebook" value="45" checked> Notebook — 45</label><label><input type="radio" name="product" id="pencil" value="12"> Pencil — 12</label></fieldset><label>Quantity<input id="quantity" inputmode="numeric"></label><button>Review total</button></form><p id="result" role="status"></p>',
    `document.querySelector('#form').addEventListener('submit',event=>{event.preventDefault();const raw=document.querySelector('#quantity').value.trim(),quantity=Number(raw);const product=[...document.querySelectorAll('input[name="product"]')].find(el=>el.checked);document.querySelector('#result').textContent=!raw||!Number.isInteger(quantity)||quantity<1?'Enter a positive whole-number quantity':!product?'Choose a product':'Illustrative total: '+Number(product.value)*quantity+'. No order or payment was sent.'});`,
    "Choose a product, validate quantity and derive a total without pretending to place an order.",
    "Read checked on radio controls; native groups normally allow one selected item.",
  ),
  example(
    "multi-form",
    "Multi-step form",
    '<h1>Two-step local review</h1><section id="step1"><label>Fictional name<input id="name"></label><button id="next">Next</button></section><section id="step2" hidden><label>Topic<select id="topic"><option value="">Choose a topic</option><option>Projects</option><option>Learning</option></select></label><button id="back">Back</button><button id="finish">Finish local review</button></section><p id="result" role="status"></p>',
    `const first=document.querySelector('#step1'),second=document.querySelector('#step2'),out=document.querySelector('#result');document.querySelector('#next').addEventListener('click',()=>{if(!document.querySelector('#name').value.trim()){out.textContent='Enter a fictional name';return}first.hidden=true;second.hidden=false;out.textContent='Step 2: choose a topic'});document.querySelector('#back').addEventListener('click',()=>{first.hidden=false;second.hidden=true;out.textContent='Step 1: review your name'});document.querySelector('#finish').addEventListener('click',()=>{const topic=document.querySelector('#topic').value;out.textContent=topic?'Local review complete. Nothing was submitted.':'Choose a topic'});`,
    "Validate before advancing and preserve values when moving back. In a native app, move focus to the next step’s heading/control.",
    "hidden controls should not remain in the active focus order. The worker bridge does not emulate programmatic focus.",
  ),
];
