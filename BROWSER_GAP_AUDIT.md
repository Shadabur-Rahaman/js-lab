# Browser-development gap audit

Baseline inspected: `5e07e28`. Preserve the nine published chapters, original/V2 quizzes and examples, previous V3 academy, restricted worker runner, teacher verifier, hash routes, progress keys and Pages workflow. The unrelated html-lab and css-lab checkouts are outside this change.

| Requirement group | Baseline status | Additive action / dependency |
|---|---|---|
| Core variables/types/operators/conditions/loops/functions/arrays/objects, lexical scope, closures, references, this, Set/Map, regex, JSON, exceptions, introductory modules/classes | Complete at introductory level | Retain and link; add only missing advanced extensions |
| Numbered browser-development chapters 10–14 | Missing | Append stable IDs and integrate existing Discover/Experiment/Practice/Quick check workflow; retain 1–9 verbatim |
| DOM methods/tree/collections | Partial | Existing worker DOM bridge cannot reproduce native live HTMLCollections or layout-aware innerText. Add a distinct native iframe mode, retain worker mode |
| Native form validation, FormData, requestSubmit, focus and full event phases | Partial/missing | Native execution mode first, then real examples and browser tests |
| Events and delegation | Partial | Existing examples retained; extend event taxonomy, listener identity/options, propagation controls and target/currentTarget inspection |
| Timers | Partial | Existing async examples retained; add scheduling/cancellation visualizer, recursive timeout, drift-corrected countdown/stopwatch, debounce/throttle exercises |
| Storage | Partial | Keep project-scoped facades; add faithful explicitly simulated origin/tab/session/local/cookie model with expiration and request rules. No access to real app storage |
| Cookies | Missing | Add path/domain/expiry/Max-Age/encoding/SameSite/Secure/HttpOnly teaching and a deterministic cookie explorer; no fake authentication |
| Eight specified browser projects | To-do/search exist; other projects missing or partial | Reuse/extend existing project data and add FAQ, accessible dropdown, survey, full notes, persistent theme and countdown/alerts |
| Advanced language details | Partial | Add call/apply/bind, reachability/weak collections, iterators/generators/private fields, Promise race/any and retry semantics; link completed topics |
| Async/API/tooling/debugging/testing | Working prior V3 coverage | Retain, link and extend missing details without another copy of the academy |
| Playground copy/download/fullscreen/tree selection | Missing in prior V3 BrowserLab | Extend the shared BrowserLab UI and add real native DOM snapshot/selection messages |
| Teacher notes/new assessment history | Partial | Unit-specific teaching resources and existing Quiz engine; new stable question/concept IDs, no replacement of saved records |
| Multi-file exports, progress backup, roadmap | Working prior V3 | Retain; source downloads for native examples contain real HTML/CSS/JS for learner-owned hosting |
| Live external APIs | Optional / deliberately unavailable | Keep deterministic fixtures. No unverified third-party endpoint, API secrets or paid requirement |
| Security against malicious resource exhaustion | Not guaranteed by existing browser-local tools | State ordinary classroom-snippet threat model; opaque origins/CSP, source instrumentation, bounded output, cleanup and Stop. Do not claim hostile-code hardening |

Implementation order: native execution/instrumentation → DOM/events chapters → forms/timers/storage chapters and models → required browser projects → missing advanced extensions → integration/teacher/assessments → preservation, browser, production and deployment checks.

## Implemented follow-up

The missing browser path is now appended as chapters 10–14: 22 native browser units, 44 unit questions, 15 chapter quick checks, and eight distinct working browser projects. Every browser unit has its own explanation, prediction, editable experiment, broken source, repair hint, independent task, recap and teacher field notes. The original chapter registration source is protected by a normalized baseline SHA-256 fixture; original chapter IDs, worker runner, teacher verifier and previous content remain unchanged.

The shared BrowserLab retains its worker bridge and adds an explicitly selected native mode, source copy/ZIP download/fullscreen, clickable DOM relationships and actual form/event APIs. Native mode needs allow-forms so submit events and validation work; CSP form-action none still blocks external submission. No allow-same-origin is granted. Native mode uses cooperative budgets for ordinary classroom snippets, not a hostile-code guarantee. Native self-navigation and extreme resource exhaustion remain outside that guarantee.

Advanced additions extend the existing language path with call/apply/bind, reachability/weak collections, iterators/generators and private fields/composition. A native timer unit compares allSettled/race/any, bounded retries, abort and cleanup. The existing async, modules, debugging, workflow and testing paths remain available. Live external API mode remains deliberately deferred; bundled fixtures are labeled.
