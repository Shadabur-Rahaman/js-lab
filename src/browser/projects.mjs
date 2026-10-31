const make = (
  id,
  title,
  html,
  code,
  requirements,
  tests,
  prediction,
  choices,
  answer,
  explanation,
) => ({
  id,
  title,
  html:
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' +
    title +
    "</title></head><body><main><h1>" +
    title +
    "</h1>" +
    html +
    "</main></body></html>",
  code,
  requirements,
  tests,
  question: {
    id: "browser-project-" + id + "-p",
    kind: "Predict the interface",
    prompt: prediction,
    choices,
    answer,
    explanation,
  },
  task: requirements.join(". "),
  hint: "Keep state separate from rendering. Test a normal action, an invalid/empty action, keyboard access, and persistence. Read the project’s debugging checkpoints before comparing its reference.",
  starter:
    "// Build the required behavior here.\n// Start with one selection and one event listener.\n",
});
const read = `function readList(key){try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[]}catch{return []}}\n`;
export const browserProjects = [
  make(
    "todo",
    "Complete to-do application",
    '<label>Task<input id="task" /></label><button id="add">Add task</button\n><label\n  >Filter<select id="filter">\n    <option value="all">All</option>\n    <option value="active">Active</option>\n    <option value="done">Completed</option>\n  </select></label\n>\n<ul id="list"></ul>\n<p id="status" role="status"></p>',
    read +
      "let tasks = readList(\"browser-tasks\").filter(\n  (t) => t && typeof t.text === \"string\" && typeof t.done === \"boolean\",\n);\nlet next = Math.max(0, ...tasks.map((t) => Number(t.id) || 0)) + 1;\nconst list = document.querySelector(\"#list\");\nfunction render() {\n  localStorage.setItem(\"browser-tasks\", JSON.stringify(tasks));\n  list.replaceChildren();\n  const filter = document.querySelector(\"#filter\").value;\n  for (const task of tasks.filter(\n    (t) => filter === \"all\" || (filter === \"done\" ? t.done : !t.done),\n  )) {\n    const li = document.createElement(\"li\");\n    li.dataset.id = String(task.id);\n    const input = document.createElement(\"input\");\n    input.value = task.text;\n    input.setAttribute(\"aria-label\", \"Edit task \" + task.id);\n    input.dataset.action = \"edit\";\n    li.append(input);\n    for (const [action, label] of [\n      [\"complete\", task.done ? \"Reopen\" : \"Complete\"],\n      [\"remove\", \"Delete\"],\n    ]) {\n      const b = document.createElement(\"button\");\n      b.dataset.action = action;\n      b.textContent = label;\n      li.append(b);\n    }\n    if (task.done) input.style.textDecoration = \"line-through\";\n    list.append(li);\n  }\n  document.querySelector(\"#status\").textContent =\n    tasks.length +\n    \" tasks; \" +\n    tasks.filter((t) => !t.done).length +\n    \" active\";\n}\ndocument.querySelector(\"#add\").addEventListener(\"click\", () => {\n  const input = document.querySelector(\"#task\");\n  if (!input.value.trim()) {\n    document.querySelector(\"#status\").textContent = \"Enter a task\";\n    input.focus();\n    return;\n  }\n  tasks.push({ id: next++, text: input.value.trim(), done: false });\n  input.value = \"\";\n  render();\n  input.focus();\n});\nlist.addEventListener(\"click\", (event) => {\n  const button = event.target.closest(\"button[data-action]\");\n  if (!button || !list.contains(button)) return;\n  const id = Number(button.closest(\"li\").dataset.id),\n    task = tasks.find((t) => t.id === id);\n  if (!task) return;\n  if (button.dataset.action === \"remove\")\n    tasks = tasks.filter((t) => t !== task);\n  else task.done = !task.done;\n  render();\n  document.querySelector(\"#task\").focus();\n});\nlist.addEventListener(\"change\", (event) => {\n  if (event.target.dataset.action !== \"edit\") return;\n  const task = tasks.find(\n    (t) => t.id === Number(event.target.closest(\"li\").dataset.id),\n  );\n  if (task && event.target.value.trim())\n    task.text = event.target.value.trim();\n  render();\n});\ndocument.querySelector(\"#filter\").addEventListener(\"change\", render);\nrender();",
    [
      "Add, edit, delete and complete/reopen",
      "Filter and report task/active counts",
      "Delegate actions from a stable list",
      "Save and restore non-sensitive task state",
    ],
    [
      "Add A and B; edit A; complete B; Active shows A",
      "Delete A; counts update and keyboard focus stays useful",
      "Run again / reload the lesson: saved task state restores",
      "Empty task is rejected",
    ],
    "A new task is created after listener setup. Does the delegated list listener handle it?",
    [
      "Yes, its click bubbles to the stable list",
      "No, every new button must copy a listener",
    ],
    0,
    "Delegation observes future descendants; closest and containment identify owned actions.",
  ),
  make(
    "faq",
    "Accessible accordion / FAQ",
    '<label\n  ><input id="single" type="checkbox" checked /> One section at a\n  time</label\n>\n<section id="faq">\n  <h2>\n    <button aria-expanded="false" aria-controls="answer1">\n      What is the DOM?\n    </button>\n  </h2>\n  <div id="answer1" hidden>The browser document interface.</div>\n  <h2>\n    <button aria-expanded="false" aria-controls="answer2">\n      What is an event?\n    </button>\n  </h2>\n  <div id="answer2" hidden>A signal an application can respond to.</div>\n</section>\n<details>\n  <summary>Native alternative</summary>\n  Prefer details/summary for simple disclosure when its built-in behavior\n  meets the need.\n</details>',
    'const faq = document.querySelector("#faq"),\n  buttons = [...faq.querySelectorAll("h2 button")];\nfunction show(button, open) {\n  button.setAttribute("aria-expanded", String(open));\n  document.getElementById(button.getAttribute("aria-controls")).hidden =\n    !open;\n}\nfaq.addEventListener("click", (event) => {\n  const button = event.target.closest("h2 button");\n  if (!button || !faq.contains(button)) return;\n  const open = button.getAttribute("aria-expanded") !== "true";\n  if (open && document.querySelector("#single").checked)\n    for (const other of buttons) show(other, false);\n  show(button, open);\n});\nfaq.addEventListener("keydown", (event) => {\n  const i = buttons.indexOf(event.target);\n  if (i < 0) return;\n  let next;\n  if (event.key === "ArrowDown") next = (i + 1) % buttons.length;\n  if (event.key === "ArrowUp")\n    next = (i - 1 + buttons.length) % buttons.length;\n  if (event.key === "Home") next = 0;\n  if (event.key === "End") next = buttons.length - 1;\n  if (next !== undefined) {\n    event.preventDefault();\n    buttons[next].focus();\n  }\n});',
    [
      "Open/close with native buttons",
      "Keep aria-expanded and hidden synchronized",
      "Optional one-open policy; keyboard header navigation",
      "Compare with details/summary",
    ],
    [
      "Enter or Space toggles a header",
      "Opening second in single mode closes first",
      "Arrow/Home/End move header focus",
      "Native details alternative works without custom code",
    ],
    "If a panel is hidden, what should its controlling button report?",
    ['aria-expanded="false"', 'aria-expanded="true"'],
    0,
    "Expanded state describes the currently exposed panel, not merely the last click.",
  ),
  make(
    "search",
    "Real-time search filter",
    '<label>Search products<input id="search" /></label\n><label\n  ><input id="debounce" type="checkbox" /> Debounce expensive work 250\n  ms</label\n>\n<ul id="results"></ul>\n<p id="status" role="status"></p>',
    'const products = ["Notebook", "Lamp", "Pencil", "Safety helmet"];\nlet timer = null;\nfunction render(query) {\n  const found = products.filter((p) =>\n      p.toLowerCase().includes(query.trim().toLowerCase()),\n    ),\n    list = document.querySelector("#results");\n  list.replaceChildren();\n  for (const name of found) {\n    const li = document.createElement("li");\n    li.textContent = name;\n    list.append(li);\n  }\n  document.querySelector("#status").textContent = found.length\n    ? found.length + " results"\n    : "No results";\n}\ndocument.querySelector("#search").addEventListener("input", (event) => {\n  clearTimeout(timer);\n  const query = event.target.value;\n  if (document.querySelector("#debounce").checked)\n    timer = setTimeout(() => render(query), 250);\n  else render(query);\n});\nrender("");',
    [
      "Case-insensitive input filtering",
      "Empty query restores all items; no-results state",
      "Optional trailing debounce without losing input focus",
    ],
    [
      "Type LAMP: one Lamp result",
      "Type xyz: no results",
      "Clear: four products",
      "With debounce, rapid input uses the final query",
    ],
    "Will a plain input event fire only after the field loses focus?",
    ["No; input responds during editing", "Yes; that is its defining behavior"],
    0,
    "input responds to editing. change commonly represents a committed change.",
  ),
  make(
    "dropdown",
    "Custom dropdown with a native alternative",
    '<p>Use the native select when its behavior is sufficient.</p>\n<label\n  >Native topic<select id="native">\n    <option>DOM</option>\n    <option>Events</option>\n    <option>Forms</option>\n  </select></label\n>\n<div id="picker">\n  <button\n    id="trigger"\n    aria-haspopup="listbox"\n    aria-expanded="false"\n    aria-controls="options"\n  >\n    Choose topic: DOM\n  </button>\n  <div id="options" role="listbox" aria-label="Topic" hidden>\n    <button role="option" tabindex="-1" aria-selected="true">DOM</button\n    ><button role="option" tabindex="-1" aria-selected="false">\n      Events</button\n    ><button role="option" tabindex="-1" aria-selected="false">\n      Forms\n    </button>\n  </div>\n</div>\n<p id="status" role="status"></p>',
    'const root = document.querySelector("#picker"),\n  trigger = document.querySelector("#trigger"),\n  list = document.querySelector("#options"),\n  options = [...list.querySelectorAll(\'[role="option"]\')];\nlet selected = 0;\nfunction close(focus = false) {\n  list.hidden = true;\n  trigger.setAttribute("aria-expanded", "false");\n  if (focus) trigger.focus();\n}\nfunction open(index = selected) {\n  list.hidden = false;\n  trigger.setAttribute("aria-expanded", "true");\n  options[index].focus();\n}\nfunction choose(index) {\n  selected = index;\n  options.forEach((o, i) =>\n    o.setAttribute("aria-selected", String(i === index)),\n  );\n  trigger.textContent = "Choose topic: " + options[index].textContent;\n  document.querySelector("#status").textContent =\n    "Selected " + options[index].textContent;\n  close(true);\n}\ntrigger.addEventListener("click", () => (list.hidden ? open() : close()));\ntrigger.addEventListener("keydown", (e) => {\n  if (e.key === "ArrowDown" || e.key === "ArrowUp") {\n    e.preventDefault();\n    open(e.key === "ArrowDown" ? 0 : options.length - 1);\n  }\n});\nlist.addEventListener("click", (e) => {\n  const option = e.target.closest(\'[role="option"]\');\n  if (option && list.contains(option)) choose(options.indexOf(option));\n});\nlist.addEventListener("keydown", (e) => {\n  const i = options.indexOf(document.activeElement);\n  let next;\n  if (e.key === "ArrowDown") next = (i + 1) % options.length;\n  if (e.key === "ArrowUp") next = (i - 1 + options.length) % options.length;\n  if (e.key === "Home") next = 0;\n  if (e.key === "End") next = options.length - 1;\n  if (next !== undefined) {\n    e.preventDefault();\n    options[next].focus();\n  }\n  if (e.key === "Enter" || e.key === " ") {\n    e.preventDefault();\n    choose(i);\n  }\n  if (e.key === "Escape") {\n    e.preventDefault();\n    close(true);\n  }\n  if (e.key === "Tab") close();\n});\ndocument.addEventListener("pointerdown", (e) => {\n  if (!root.contains(e.target)) close();\n});\nroot.addEventListener("focusout", (e) => {\n  if (!root.contains(e.relatedTarget)) close();\n});',
    [
      "Native select offered as simpler default",
      "Button expanded state and named listbox/options",
      "Arrow/Home/End, Enter/Space, Escape, Tab and outside-close",
      "Restore focus on selection/cancel",
    ],
    [
      "Open with pointer or ArrowDown",
      "Navigate options with arrows and select with Enter",
      "Escape closes and returns focus",
      "Tab leaves without trapping; outside pointer closes",
    ],
    'Does adding role="listbox" implement keyboard navigation automatically?',
    ["Yes", "No; the behavior and focus management must be implemented"],
    1,
    "ARIA communicates semantics/states. It does not create keyboard interaction or focus behavior.",
  ),
  make(
    "survey",
    "Interactive survey with validation",
    '<form id="survey" novalidate>\n  <label\n    >Fictional name<input\n      name="name"\n      id="name"\n      aria-describedby="name-error"\n  /></label>\n  <p id="name-error" class="error"></p>\n  <fieldset>\n    <legend>Current experience</legend>\n    <label\n      ><input type="radio" name="level" value="new" checked /> New</label\n    ><label\n      ><input type="radio" name="level" value="practice" />\n      Practicing</label\n    >\n  </fieldset>\n  <label\n    >Topic<select name="topic" id="topic">\n      <option value="">Choose topic</option>\n      <option>DOM</option>\n      <option>Events</option>\n      <option value="other">Other</option>\n    </select></label\n  ><label id="other-field" hidden\n    >Other topic<input\n      name="other"\n      id="other"\n      aria-describedby="topic-error"\n  /></label>\n  <p id="topic-error" class="error"></p>\n  <label\n    >Feedback<textarea\n      name="feedback"\n      id="feedback"\n      minlength="10"\n      maxlength="200"\n      aria-describedby="feedback-error"\n    ></textarea>\n  </label>\n  <p id="feedback-error" class="error"></p>\n  <label\n    ><input id="consent" name="fictional" type="checkbox" /> This is\n    fictional demonstration data</label\n  >\n  <p id="progress" role="status"></p>\n  <button>Review survey</button>\n</form>\n<pre id="summary" role="status"></pre>',
    'const form = document.querySelector("#survey");\nfunction validate() {\n  const name = document.querySelector("#name"),\n    topic = document.querySelector("#topic"),\n    other = document.querySelector("#other"),\n    feedback = document.querySelector("#feedback"),\n    consent = document.querySelector("#consent");\n  document.querySelector("#other-field").hidden = topic.value !== "other";\n  const checks = [\n    [\n      name,\n      name.value.trim().length > 0,\n      "name-error",\n      "Enter a fictional name.",\n    ],\n    [\n      topic,\n      !!topic.value && (topic.value !== "other" || !!other.value.trim()),\n      "topic-error",\n      "Choose and describe the topic.",\n    ],\n    [\n      feedback,\n      feedback.value.trim().length >= 10,\n      "feedback-error",\n      "Write at least 10 characters.",\n    ],\n  ];\n  for (const [node, ok, id, message] of checks) {\n    node.setAttribute("aria-invalid", String(!ok));\n    document.getElementById(id).textContent = ok ? "" : message;\n  }\n  const done = checks.filter((x) => x[1]).length + Number(consent.checked);\n  document.querySelector("#progress").textContent =\n    done +\n    " / 4 requirements complete" +\n    (!consent.checked ? " — confirm fictional data" : "");\n  return done === 4;\n}\nform.addEventListener("input", validate);\nform.addEventListener("change", validate);\nform.addEventListener("submit", (e) => {\n  e.preventDefault();\n  if (!validate()) {\n    form.querySelector(\'[aria-invalid="true"]\')?.focus();\n    return;\n  }\n  document.querySelector("#summary").textContent =\n    "Local review only — nothing sent.\\n" +\n    JSON.stringify([...new FormData(form).entries()], null, 2);\n});\nvalidate();',
    [
      "Multiple named control types and conditional field",
      "Live inline errors and completion indicator",
      "Accessible local review summary; no backend submission",
    ],
    [
      "Empty/short feedback gives field-specific errors",
      "Other requires an explanation",
      "Valid data + consent produces local summary",
      "Typing repairs clears corresponding errors",
    ],
    "Does a local successful survey review mean data was sent to a server?",
    ["Yes", "No; this frontend deliberately performs no submission"],
    1,
    "preventDefault plus local rendering is a UI review, not a backend service.",
  ),
  make(
    "notes",
    "Persistent notes manager",
    '<label>Search notes<input id="search" /></label\n><label>New note<textarea id="note"></textarea></label\n><button id="add">Add note</button>\n<ul id="list"></ul>\n<p id="status" role="status"></p>',
    read +
      "let notes = readList(\"browser-notes\").filter(\n    (n) => n && typeof n.text === \"string\",\n  ),\n  next = Math.max(0, ...notes.map((n) => Number(n.id) || 0)) + 1;\nconst list = document.querySelector(\"#list\");\nfunction render() {\n  localStorage.setItem(\"browser-notes\", JSON.stringify(notes));\n  const query = document.querySelector(\"#search\").value.toLowerCase();\n  list.replaceChildren();\n  for (const note of notes.filter((n) =>\n    n.text.toLowerCase().includes(query),\n  )) {\n    const li = document.createElement(\"li\");\n    li.dataset.id = String(note.id);\n    const editor = document.createElement(\"textarea\");\n    editor.value = note.text;\n    editor.setAttribute(\"aria-label\", \"Edit note \" + note.id);\n    const button = document.createElement(\"button\");\n    button.textContent = \"Delete note\";\n    li.append(editor, button);\n    list.append(li);\n  }\n  document.querySelector(\"#status\").textContent =\n    notes.length + \" saved notes\";\n}\ndocument.querySelector(\"#add\").addEventListener(\"click\", () => {\n  const input = document.querySelector(\"#note\");\n  if (!input.value.trim()) {\n    document.querySelector(\"#status\").textContent = \"Write a note first\";\n    return;\n  }\n  notes.push({ id: next++, text: input.value.trim() });\n  input.value = \"\";\n  render();\n});\nlist.addEventListener(\"change\", (e) => {\n  if (e.target.tagName !== \"TEXTAREA\") return;\n  const note = notes.find(\n    (n) => n.id === Number(e.target.closest(\"li\").dataset.id),\n  );\n  if (note && e.target.value.trim()) note.text = e.target.value.trim();\n  render();\n});\nlist.addEventListener(\"click\", (e) => {\n  const button = e.target.closest(\"button\");\n  if (!button || !list.contains(button)) return;\n  const id = Number(button.closest(\"li\").dataset.id);\n  notes = notes.filter((n) => n.id !== id);\n  render();\n  document.querySelector(\"#note\").focus();\n});\ndocument.querySelector(\"#search\").addEventListener(\"input\", render);\nrender();",
    [
      "Add, edit, delete and case-insensitive search",
      "Persist and restore non-sensitive notes",
      "Safe text and useful empty-input feedback",
    ],
    [
      "Add note, edit text, search for edited word",
      "Delete the intended note",
      "Run again/reload: retained notes restore",
      "Corrupt or absent JSON falls back to an empty list",
    ],
    "What should reading saved notes do when stored JSON is invalid?",
    [
      "Crash the whole learning site",
      "Handle the failure and use an explained safe fallback",
    ],
    1,
    "Parsing and storage can fail. Validate shape and recover without exposing unrelated application state.",
  ),
  make(
    "theme",
    "Persistent light / dark preference",
    '<style>\n  body {\n    background: #fafaf5;\n    color: #24352b;\n  }\n  body.dark {\n    background: #20252d;\n    color: #f6f7f2;\n  }\n  button {\n    font: inherit;\n    padding: 12px;\n  }</style\n><button id="toggle" aria-pressed="false">Toggle dark theme</button\n><button id="system">Use system default</button>\n<p id="state" role="status"></p>',
    "const media = matchMedia(\"(prefers-color-scheme: dark)\");\nlet preference = localStorage.getItem(\"browser-theme\");\nif (![\"light\", \"dark\"].includes(preference)) preference = null;\nfunction render() {\n  const dark =\n    preference === \"dark\" || (preference === null && media.matches);\n  document.body.classList.toggle(\"dark\", dark);\n  document\n    .querySelector(\"#toggle\")\n    .setAttribute(\"aria-pressed\", String(dark));\n  document.querySelector(\"#state\").textContent =\n    \"Theme: \" +\n    (dark ? \"dark\" : \"light\") +\n    (preference === null ? \" (system default)\" : \" (saved preference)\");\n}\ndocument.querySelector(\"#toggle\").addEventListener(\"click\", () => {\n  preference = document.body.classList.contains(\"dark\") ? \"light\" : \"dark\";\n  localStorage.setItem(\"browser-theme\", preference);\n  render();\n});\ndocument.querySelector(\"#system\").addEventListener(\"click\", () => {\n  preference = null;\n  localStorage.removeItem(\"browser-theme\");\n  render();\n});\nmedia.addEventListener(\"change\", render);\nrender();",
    [
      "System preference as initial fallback",
      "Toggle actual CSS class and pressed state",
      "Save explicit choice; reset to system",
    ],
    [
      "Toggle twice: light/dark classes and state agree",
      "Run again/reload restores explicit choice",
      "Use system removes saved override",
    ],
    "When should the system preference choose the initial theme?",
    [
      "When no explicit saved choice exists",
      "It should always overwrite a saved user choice",
    ],
    0,
    "Honor an explicit preference; use the system as a fallback and permit returning to it.",
  ),
  make(
    "countdown",
    "Countdown and alert system",
    '<label\n  >Seconds<input\n    id="seconds"\n    type="number"\n    min="1"\n    max="60"\n    value="3" /></label\n><button id="start">Start</button><button id="pause">Pause / resume</button\n><button id="reset">Reset / cancel</button>\n<p id="remaining" role="status">Ready</p>\n<p id="alert" role="status" hidden>\n  Time is up. This alert hides after three seconds.\n</p>',
    'let timer = null,\n  hide = null,\n  end = 0,\n  remaining = 0,\n  running = false;\nconst out = document.querySelector("#remaining"),\n  alert = document.querySelector("#alert");\nfunction cleanup() {\n  clearInterval(timer);\n  clearTimeout(hide);\n  timer = hide = null;\n}\nfunction tick() {\n  remaining = Math.max(0, end - performance.now());\n  out.textContent = (remaining / 1000).toFixed(1) + " seconds";\n  if (remaining === 0) {\n    clearInterval(timer);\n    timer = null;\n    running = false;\n    alert.hidden = false;\n    hide = setTimeout(() => {\n      alert.hidden = true;\n      hide = null;\n    }, 3000);\n  }\n}\nfunction resume() {\n  end = performance.now() + remaining;\n  running = true;\n  timer = setInterval(tick, 50);\n  tick();\n}\ndocument.querySelector("#start").addEventListener("click", () => {\n  cleanup();\n  alert.hidden = true;\n  const raw = document.querySelector("#seconds").value.trim(),\n    seconds = Number(raw);\n  if (!raw || !Number.isFinite(seconds) || seconds < 1 || seconds > 60) {\n    out.textContent = "Choose 1–60 seconds";\n    running = false;\n    return;\n  }\n  remaining = seconds * 1000;\n  resume();\n});\ndocument.querySelector("#pause").addEventListener("click", () => {\n  if (running) {\n    remaining = Math.max(0, end - performance.now());\n    clearInterval(timer);\n    timer = null;\n    running = false;\n    out.textContent = "Paused: " + (remaining / 1000).toFixed(1);\n  } else if (remaining > 0) resume();\n});\ndocument.querySelector("#reset").addEventListener("click", () => {\n  cleanup();\n  remaining = 0;\n  running = false;\n  alert.hidden = true;\n  out.textContent = "Ready";\n});',
    [
      "Timestamp-based countdown",
      "Pause/resume and reset cancellation",
      "Auto-hide alert with tracked cleanup handle",
      "No claim of actual session security",
    ],
    [
      "Start 1 second: alert appears then hides",
      "Pause preserves remaining duration",
      "Reset cancels countdown and pending dismissal",
      "Repeated Start does not create duplicate intervals",
    ],
    "Why calculate remaining time from a deadline rather than subtracting 50 on each interval?",
    [
      "Because intervals are guaranteed exact",
      "Because callbacks can be delayed; timestamps correct display drift",
    ],
    1,
    "Timers schedule tasks with minimum delays. Counting nominal ticks accumulates error.",
  ),
];
