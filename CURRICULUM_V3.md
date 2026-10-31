# JS LAB V3 — implementation and supported scope

V3 extends baseline `0cfaa23`. All nine original/V2 chapters, IDs, examples, assessments, 32 concept sections, 20 projects, synchronous runner, teacher verifier, styling and existing routes are preserved. One sidebar entry and one additional homepage callout lead to a lazy-loaded development academy. No new repository or hosting service is introduced.

## Working additions

| Route | Working experience |
|---|---|
| `#academy/zero` | Optional starting choices/assessment, keyboard and drag reordering of an examination algorithm, input validation, two supported flowchart/pseudocode models, editable equivalent code |
| `#academy/language` | Nine extra language units: strict statements/expressions, strings/templates, numbers/Math/Date, Set/Map, regular expressions, exceptions, JSON, optional prototypes/classes, nested loops. Each includes purpose, analogy, prediction/feedback, runnable example, repair/reference, independent task, recap and gated instructor notes |
| `#academy/dom` | Editable HTML/CSS/JS; selectors, text, classes/styles, hide/show, create/append/remove, counter, delegated task list, character/key input, profile/notification, fictional visibility toggle, keyboard-controlled marker |
| `#academy/forms` | Five separate editable forms: registration, contact, job application, order and two-step local review. Required data checks, select/checkbox/radio handling and status messages; no backend submission |
| `#academy/xray` | Verified authored call-stack/binding/reference/error traces, event-loop ordering model, and native click capture/target/bubble explorer |
| `#academy/async` | Real worker timers/intervals, clearing timers, Promises, rejection/cleanup, async/await, all/allSettled, JSON and mock API exercise with cancellation and loading/empty/error states |
| `#academy/storage` | Explicitly labeled memory/session/local teaching model plus editable project-storage exercise |
| `#academy/workspace` | Multiple text files, folders represented by paths, tabs, highlighted editing, rename, confirmed deletion/restore, HTML entry selection, CSS linking, native relative module graph, preview, errors/console, IndexedDB save/resume, source ZIP import/export |
| `#academy/gym` | 24 function challenges with parent-side comparison of independently executed normal/edge/type/error cases; published contracts and alternative solutions accepted |
| `#academy/debug` | Seven executable repair challenges, staged hints, test feedback, browser debugger guidance and editable broken async/API handling |
| `#academy/projects` | Thirteen additional application briefs with starter/reference modes, working references, requirements, walkthrough, tests, debugging tasks, accessibility review, source ZIPs and deployment guidance |
| `#academy/workflow` | Editor, Node/npm/Vite, native modules, responsibility/data-flow explanation, selectable workflow/failure model, Git/GitHub and official static-hosting instructions |
| `#academy/quality` | Security predictions, safe text rendering, frontend/backend boundaries, keyboard/focus/error/status/menu/dialog exercises and manual review guidance |
| `#academy/reference` | Searchable curated explanations, examples, analogies, prerequisite links, runnable synchronous entries and interview/revision predictions linked to existing reference tools |
| `#academy/roadmap` | Eleven-stage journey, attempts/revision recommendations, current V3 activity, evidence list, progress backup/merge and separately confirmed V3 reset |

Teacher Mode retains the same access code, refresh/Student/idle relocking, timer and presentation controls. New paths expose a field guide, an 18-session selector and downloadable practice/rubric sheet. Existing lesson notes/plans remain intact.

## Application academy references

1. Calculator: validation, four operations, zero divisor.
2. Student marks manager: add, search, sort, validation.
3. To-do: add, edit, complete/reopen, remove, filter, learning-storage persistence.
4. Fictional expenses: add/remove, filtering, integer-minor-unit totals, persistence.
5. Fictional weather: mock fetch and loading/empty/error results; no live forecasts.
6. Products: search and numeric sorting.
7. Quiz: question/result states, single score per question, restart.
8. Rock-paper-scissors: random computer selection and all outcome rules.
9. Memory cards: Fisher–Yates shuffle, turn lock, match state, generation-safe restart.
10. Mock user directory: search, pagination, stale-result guard.
11. Illustrative estimator: positive quantities, units, non-certified arithmetic.
12. Fictional dashboard: aggregation module, API data, filtering, summary and preference persistence.
13. Independent inventory: validation, add/remove/search, totals, persistence; learner may choose a different domain from the brief.

Review-complete markers are self-reported, not automated certification. Function tests supply correctness evidence for their published cases. There is no actual authentication, payment, messaging, shared database, attendance, or centralized grading service in learner projects.

## Execution architecture

The existing synchronous `src/utils/sandbox.ts` is unchanged.

The separate V3 runtime creates a disposable Worker **inside an opaque-origin host iframe**. LinkeDOM supplies a supported document API in that worker. Actual student JavaScript mutates this document, not parent React state. Serialized changes render into a second opaque-origin browser iframe, with real user events forwarded through a fixed nonce-bearing bridge. Neither frame has `allow-same-origin`. Parent listeners check the frame identity, per-session token, expected types and bounded output.

The worker host has a no-network CSP. Native network/storage/worker-creation APIs are unavailable or blocked; fetch is an offline fixture implementation. Rendering has its own no-network/default-deny CSP: only the fixed bridge script receives a nonce. Learner scripts, inline handlers, frames, remote resources, submissions and navigation are disabled in the visual frame. This is an isolation design, **not** a general-purpose HTML sanitizer to reuse in production.

A host heartbeat terminates a worker unresponsive for approximately 1.4 seconds, including event callbacks. A session ends after 60 seconds. Output is bounded to 150 console entries, 600 DOM elements and a 120,000-character snapshot. Timer creation is capped; intervals have a 100ms floor. Ordinary infinite loops are tested. Extreme memory allocation and browser exploits are outside the guarantees of a browser-local educational tool.

## Important limits and deferred capabilities

- The worker DOM bridge is **not a complete native browser document**. Select/checked behavior is provided for supported single-select/checkbox/radio exercises. Layout/computed styles, native focus/dialog/validation APIs, canvas, custom elements, file controls and exact browser event phases are unsupported. Test the exported application in a real browser for those behaviors. The separate event propagation explorer uses trusted native UI handlers.
- The inspector shows serialized resulting/previous DOM states. It is not an arbitrary single-step debugger, operation-level mutation history, computed-style inspector, or engine memory viewer. X-Ray supports the specified authored traces only.
- Async syntax uses the actual JavaScript engine. Browser environment semantics outside the documented bridge remain unsupported; this is not a generic Node runtime.
- All API data is bundled and fictional. GET supports q/page/limit; POST/PUT/PATCH/DELETE update only the current mock session. Network/HTTP/empty/malformed/rate/slow scenarios are deterministic. **Live public API mode is deferred**; no endpoint availability/CORS/usage promise is made.
- Workspace imports support static relative native JavaScript modules in acyclic graphs, including named/default/re-exports and top-level await. No npm imports, import maps, dynamic source imports, circular graphs, binary asset imports or in-preview page navigation. Choose a different HTML entry explicitly. CSS/JS source links resolve locally; embedded data images can be used. Module URL expansion is bounded.
- ZIP limits: 1 MB compressed input, 40 supported text files, 80 KB/file and 800 KB total. Unsafe/hidden/absolute/traversal paths, unsupported types, duplicates, incomplete and oversized archives reject. Source exports exclude project learning-storage contents.
- Project learning localStorage is a bounded facade, separate from the app origin, saved when the learner clicks Save project. sessionStorage lasts for one run, unlike native sessionStorage’s tab-session behavior; the difference is stated in the lab. Native storage semantics are explained by the separate model and must be verified on a learner-owned origin. Nothing can read JS LAB’s actual progress through these facades.
- Installation, terminal commands, Git operations and learner publication remain explicit actions outside the teaching simulations. The app never claims a simulated deployment is real.
- This release has course-level teacher guidance and nine unit-specific guides, not a separate fully authored lecture script for every individual API/member. Forms/projects provide guided requirements and references; independent extensions still require learner work.

## Progress and preservation

`js-lab-progress-v1` retains its original schema and semantics. Import merges sanitized completions, concepts and successful answer evidence rather than erasing records. V3 activity uses `js-lab-academy-v3`; its current path, completion evidence and attempt counters are independent. Project files and learning storage use `js-lab-projects-v3` IndexedDB. Progress JSON includes legacy/V3 records; project source ZIPs are a separate backup.

Baseline source SHA-256 fixtures in `tests/v3-preservation.json` verify original curriculum, runner, teacher verifier and styling without requiring full Git history in CI. The unrelated `html-lab/` checkout is excluded from development watching and is not part of this deployment.

## Verification

Run `npm test` and `npm run build`. Open `/tests/v3-browser.html` on the development server and press Run browser checks for the real opaque-worker/DOM/module/async/project/form suite. Results and manual checks are recorded in `VERIFICATION.md`; do not infer physical-device coverage or exhaustive security assurance from these tests.

## Primary references

- [MDN workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [LinkeDOM implementation and limitations](https://github.com/WebReflection/linkedom)
- [MDN modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [ECMAScript](https://tc39.es/ecma262/)
- [Node.js introduction](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)
- [npm](https://docs.npmjs.com/about-npm/), [Vite](https://vite.dev/guide/), [Vitest](https://vitest.dev/guide/)
- [Chrome debugging](https://developer.chrome.com/docs/devtools/javascript/)
- Official editor, GitHub and hosting guides are linked within the workflow lesson. No pricing or availability guarantees are made.
