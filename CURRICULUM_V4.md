# JS LAB V4 — advanced JavaScript and API development

Baseline: 7e79e25. This release appends chapters 15–19 while retaining all 14 published lesson objects, IDs, questions, prior projects, routes, teacher verifier, progress keys, saved-project database and the existing Pages workflow. No dependencies were added.

## Learning map

| Chapter | Extension | Visual and practical evidence |
|---|---|---|
| 15 | Lexical scope, shadowing/TDZ, contexts, retained bindings, loop closures and configuration/private-score factories | Exact selectable lookup source, scope vs stack, reversible context/parameter/return traces, actual independent counters |
| 16 | Ordinary/strict/arrow/class/event receivers, extraction and explicit binding | Nine verified invocation cases; editable event and logger examples |
| 17 | Callback refactoring, adoption/lifecycle, chaining, await, combinators, cancellation and measured user loading | Nested-callback vs Promise source; actual settlement/delay/combinator controls; authored task/microtask trace; sequential/concurrent native requests |
| 18 | HTTP methods/statuses, type/parse/schema validation, form POST, debounced/paginated search | Offline request/response inspector; editable source, loading/empty/error/abort and stale-owner checks |
| 19 | Provider contracts, dependent weather calls, independent partial dashboards, safe JSON-to-DOM | Controlled optional live lab, dependency timings, safe cards, labeled movie fixtures and capstone |

There are 25 new progressive units, 50 unit questions, 15 chapter checks, five chapter predictions, eight project predictions and ten final-challenge questions. They use the existing Quiz component and answer record. Each unit supplies why/what/analogy/how, code, prediction, broken source, repair guidance, independent practice, recap, related concepts and teacher field notes including exact source. Learners can revisit every route freely.

V4 paths in Development academy: #academy/advanced, #academy/advanced-projects, #academy/live-api and #academy/v4-final. Existing #academy/roadmap includes the new ten-stage progression and retains export/import. Stage/project review remains explicitly self-reported; it is not certification or centralized grading. The instructor planner offers all 18 suggested sessions; existing timer, code lock and presentation workflow remain unchanged.

## Eight application references

Private counters/configuration; multiple-receiver logger; asynchronous task dashboard; user search with pagination/ownership; dependent weather/current/forecast; searchable/sortable fictional movie cards; partial-success dashboard with selective retry/cache; independent users/products explorer capstone. Each has starter/reference modes, editable HTML/CSS/JS, requirements, prediction, debugging checkpoints, test cases, independent extensions, accessibility review, instructor rubric and deployment guidance.

V4 source ZIPs contain index.html, style.css, app.js, mock-api.js and README.md. The explicit fictional adapter makes the exported API projects usable on static hosting without JS Lab or a backend. It has its own per-document fixture state and is not authentication or permanent shared storage. Source exports exclude app progress, teacher information and preview saved data. To connect a real provider, replace/remove the adapter and follow that provider’s current schema, CORS, attribution and credential requirements. V3 exports retain their previous behavior.

## Five separate execution/integration modes

1. Original synchronous worker: unchanged.
2. Previous V3 worker DOM/async/module bridge: unchanged.
3. Native browser exercises: opaque origin, cooperative source budgets, restrictive CSP, no same-origin grant; existing limits retained.
4. Offline Fetch: V3 defaults unchanged; explicitly selected V4 fixtures extend status/type/CORS/network/invalid/empty/slow and per-run CRUD scenarios.
5. Optional live lab: a separate opaque-origin frame runs only a fixed trusted controller. It never evaluates editable student code, accepts arbitrary destinations/headers/credentials, or provides an open proxy.

The native inspector now keeps its IDs in a WeakMap and places identifiers only on serialized clones. It no longer changes learner-visible DOM attributes/innerHTML. Frame/token message checks remain intact. Native selection resolves IDs through a bounded live-node map.

Engine/environment and event-loop frames are authored conceptual traces verified against their exact source. They are not arbitrary engine stepping, literal implementation passes or memory-address inspection. Ordinary native classroom snippets retain cooperative guard limits: native blocking calls, pathological allocations, iframe self-navigation and browser exploits are outside their guarantee. The unchanged worker runners remain available for more restricted exercises.

## Controlled live data

Verified in an actual opaque-origin browser frame on 2026-11-01:

- JSONPlaceholder users: a real HTTP request for explicitly fictional online REST records. Mutation examples are taught offline; no permanent-write claim. [Provider guide](https://jsonplaceholder.typicode.com/).
- Open-Meteo: geocoding → validated coordinates → current conditions and three-day forecast. Source attribution and CC BY 4.0/free non-commercial educational-use conditions are visible. [Documentation](https://open-meteo.com/en/docs), [terms](https://open-meteo.com/en/terms).
- TVMaze: television search, safe text descriptions and source links; explicitly not movie data. Credit and CC BY-SA/ShareAlike conditions are shown. [API, CORS, rate and license documentation](https://www.tvmaze.com/api).

Allowlisted connect origins are jsonplaceholder.typicode.com, geocoding-api.open-meteo.com, api.open-meteo.com and api.tvmaze.com. The controller permits fixed GET operations, omits credentials/referrer, rejects redirects, validates response formats/fields, bounds output, times out/cancels, caches for 60 seconds, spaces starts by 1.5 seconds and permits six operations per minute. These local courtesy limits are not shared server-side enforcement. No background polling occurs.

Labels distinguish Live response, Cached live response, Mocked offline practice, Live unavailable and an explicitly selected offline fallback. Failure never silently substitutes a fixture labeled live. Editable student Fetch remains offline; live access is limited to these controlled exercises.

Deferred by design: arbitrary learner-code live networking; private TMDB/OpenWeather credentials; authenticated proxy/backends; live movie/poster integration; durable/shared server data; generic engine debugging and hostile-code containment. No API availability or quota guarantee is made. Movie cards use clearly labeled fictional TMDB-style learning fixtures; TVMaze results remain television data.

## References

[MDN closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures), [this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this), [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises), [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch), [ECMAScript](https://tc39.es/ecma262/). Closures retain binding access at function definition; ordinary receivers depend on invocation with arrow/bound/strict exceptions; choosing an aggregate Promise outcome does not cancel unrelated work; HTTP error responses normally require explicit status checks before parsing/validating data.

## Verification and rollback

See VERIFICATION.md for actual test/browser/build evidence. CI uses deterministic fixtures and does not depend on third-party uptime. Public provider checks are a separate opt-in browser action. If homepage/legacy routes, native execution or teacher access regresses after deployment, revert the V4 release commit and let the same workflow republish baseline 7e79e25. No backend migration or student-record deletion is needed.
