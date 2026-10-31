# Verification — 28 October 2026

## Curriculum V2 update — 29 October 2026

- Original six chapters and ten-question arena are compared in full against a pre-V2 fixture, including educational text, code, IDs, answer choices, and explanations.
- Legacy lesson completion, question results, and current chapter migrate without resetting the existing storage key. New concept completion is independently saved.
- All expanded examples, debugging solutions, applied exercises, and 15 new project reference solutions execute in tests.
- Every new prediction is checked against actual function-wrapper JavaScript, including SyntaxError, ReferenceError, and TypeError categories.
- Extended loop traces match their displayed source for all seven supported traversal views, including zero-limit do…while and callback traversal.
- Array return values/mutations, numeric sorting, nested reference sharing, deep clones, special-value logging, and safe value parsing are tested.
- Browser checks opened all initial 31 visual labs and all 15 new guided projects; the added closure lab was separately exercised with independent counters.
- The production runner executes rest/spread, callbacks, objects, optional chaining, structuredClone, and special-value console snapshots; infinite loops are still stopped after one second.
- Browser checks verify Ctrl+Enter runs only the focused editor, prediction gates unlock independently, and concept completion survives refresh.
- Student manager add/update/search/detail actions work; splice displays both removed values and the updated source array.
- Responsive visual checks cover a 1265px desktop viewport and a 375px iframe viewport; chapter navigation, wrapped controls, array boxes, and method results remain usable. This is not an exhaustive physical-device/browser audit.
- Original teacher plan and new multi-session navigation are verified. The existing teacher code unlocks the new instructor notes, and Student Mode continues to hide them.

## Teacher access update — 29 October 2026

- Eight automated test groups pass, including valid/invalid code checks and the 15-minute inactivity boundary.
- Browser checks confirm the Teacher button and homepage teaching-plan link both require the code.
- Incorrect codes leave tools locked; the correct code unlocks presenter controls and opens a pending teaching plan.
- Instructor notes are visible when unlocked and hidden in Student Mode, including on Quick check screens.
- Choosing Student and refreshing both relock teacher access.
- Five incorrect attempts trigger the 30-second local pause.
- The plaintext code is stored only in the ignored local `.deployment/teacher-access.txt` file. The published app uses a SHA-256 verifier.
- The owner selected a casual-access classroom lock after being informed it can be bypassed. This is not server-side authorization and does not make public source material confidential.

## Automated

- TypeScript type checking and Vite production build pass.
- Six Node test groups pass: exact loop execution order and final false check, grade thresholds and invalid inputs, project calculations, progress schema recovery, execution of curriculum examples and solutions, and assessment identifiers and answer indices.
- Every runnable JavaScript section, all lesson example templates, all debugging solutions, all mini-challenge solutions, and all five project reference solutions execute under a bounded test runtime.

## Browser checks performed

- All six lessons open; project, arena, cheat sheet, detective, and revision routes open.
- Runner prints multiple console messages in order.
- textContent updates the simulated HTML preview.
- Syntax errors appear inside the output panel without crashing the app.
- `while (true) {}` is stopped after one second and Run becomes available again.
- Variable visualization increments age with let and blocks reassignment with const.
- Operator lab updates arithmetic; zero divisor shows Infinity / NaN accurately; boolean controls update logic results.
- Grade 90 produces A; out-of-range input is rejected.
- Demo login accepts the documented pair of demo credentials and highlights the matching branch.
- Loop controls reach five printed values, current i = 6, condition false, and five completed iterations.
- Teacher timer runs; classroom plan opens and navigates; full-screen presentation enters successfully and can be exited.
- All ten arena answers produce correct explanatory feedback; score reaches 10/10 and achievements are earned. Arena score survives reload.
- Completed lesson and current chapter survive reload.
- Calculator demo updates numeric results; a project reference solution executes.
- Discount applies exactly at ₹1,000 (₹900 payable, ₹100 saved).
- Multiplication table shows all ten products.
- Number guessing game supplies high/low clues, counts attempts, and disables further guesses after winning.
- Revision card reveals its explanation.
- Reset requires an explicit confirmation. Test progress was cleared before handoff.
- Visual checks at 652px and 1520px wide; fullscreen and stacked responsive layouts work. This is not an exhaustive audit across physical mobile devices or all browsers.
- No application errors were present in the checked browser console log.

## Boundaries

The playground supports synchronous educational JavaScript with a limited simulated DOM, rather than a full HTML/CSS browser editor. Its limitations and supported APIs are visible beneath each editor and documented in README.md. It is intended for trusted classroom snippets; intentional extreme memory allocation and browser exploits are outside its guarantees.

No external service, authentication, deployment, or paid API is needed. The built app is in dist/. A local development preview was opened during handoff.

## V3 verification — 31 October 2026

- `npm test`: 28 groups passed, including all original tests, nine extra language units, 24 function contracts, seven repair references, mock API semantics, module compilation, ZIP round trips/rejections, and progress compatibility.
- `npm run build`: passed. The V3 academy and worker source are separate lazy-loaded chunks; no chunk-size warning. Relative GitHub Pages asset URLs retained.
- `/tests/v3-browser.html`: **31 passed, 0 failed** in the in-app Chromium browser. This executes the real opaque worker host, checking DOM updates, console/errors, native module imports, Promise/microtask/timer order, both synchronous and event-handler infinite-loop termination, isolation from parent progress, no external fetch, preview restrictions, five mock response scenarios, interactions in all 13 application references, and five form templates.
- Manual UI: edited JavaScript changes the actual preview heading; a real preview click updates a counter. The workspace saves and reopens an IndexedDB project, compiles native relative modules and updates its preview. The challenge UI displays normal/boundary/error results. Algorithm steps reorder using accessible Move controls and produce the expected result.
- All new route screens load without the React recovery view. The same teacher code unlocks new guides; Student relocks them. The verifier is unchanged, and the private code is absent from built assets.
- At 375px width, the DOM lab and workspace have no page-level horizontal overflow. Desktop and stacked editors were inspected. This is not exhaustive physical-device, assistive-technology, or cross-browser testing.
- Minified production preview: counter events and multi-file module preview work; generated module URLs are hidden from the editing flow. The original chapter 8 synchronous example prints the expected values. No application console errors in these checked flows.
- V3 limits are documented in `CURRICULUM_V3.md` and in each runner/workspace. The DOM bridge is a supported subset, not a full native browser or arbitrary step debugger. Live public API mode, binary assets, cyclic/dynamic/package imports and automated learner publication are not implemented.

Release readiness: existing public repo/Pages workflow retained; unrelated `html-lab/` is excluded from the commit. Roll back if the published old lesson route, teacher unlock, or new worker/module preview fails: revert the V3 release commit and let the same workflow republish the prior `0cfaa23` baseline. There is no backend schema migration; new progress/projects use separate keys and no existing records are deleted.

## Browser mastery follow-up — 2026-10-31

Baseline: 5e07e28. The original nine-chapter registry is byte-equivalent after removing its additive import/registration; original runner, teacher verifier, legacy styles and V2 curriculum hashes still pass. Chapters 10–14 append stable IDs without changing the existing progress key.

- npm test: **35 test groups passed**. Includes cross-platform original-source SHA fixture, new metadata, guarded loop/function execution, cookie lifecycle/request flags, origin/tab storage model and additive progress.
- Production TypeScript/Vite build passed; relative Pages assets retained. Private classroom code scan passed.
- /tests/native-browser.html: **35 passed, zero failed** in the actual in-app Chromium browser. Covers 22 native unit sources (including exact initial DOM predictions), eight project interaction sequences, native propagation/live collections/rendered text/FormData/constraint submission, opaque-origin isolation and ordinary loop interruption; explicit stopImmediatePropagation; seeded to-do/notes persistence and malformed JSON recovery; race/any/retry cleanup. Focus-dependent interactions run after initial frame layout.
- /tests/v3-browser.html: **31 passed, zero failed** for the existing worker/module runtime and prior application references.
- UI smoke: native lesson route, actual form submit with repeated and externally associated entries, authorized teacher unlock, authored unit-specific notes, existing timer/presenter controls and return to Student. Production browser-project route ran learner code and added a task with visible counts; source ZIP download completed. A 320px project preview remained operable.
- Full app mobile viewport override was requested but the browser continued reporting a desktop viewport; full-page mobile emulation is not claimed for this pass. Existing responsive styles remain intact.

Native mode is explicitly for ordinary classroom snippets, not hostile-code execution. Cooperative guards cannot guarantee handling of all native blocking calls or memory exhaustion. CSP restricts ordinary subresources/form navigation; frame self-navigation is outside its guarantees. The original restricted worker runners remain available and unchanged. Storage/cookies are explicitly labeled learning facades/models, not access to the real app origin or a backend.

Deployment uses the existing main-branch Pages workflow. Rollback for this follow-up is its single release commit; the prior working release is 5e07e28. No backend migration or old progress deletion is involved.

## V4 release verification — 2026-11-01

Baseline 7e79e25; no new dependencies.

- npm test: **49 passed, zero failed**. Exact original chapter 1–14 object preservation and protected-source hashes; closure independence; scope/TDZ and parameter/context trace outputs; strict/arrow/bound/class receivers; actual Promise ordering/adoption/recovery/combinators; CRUD/status/schema validation; exported offline adapter/abort; live allowlist/CSP boundaries; new assessment IDs and old/new progress round trips.
- /tests/v4-browser.html: **47 deterministic checks passed, zero failed**, including all 25 unit sources, eight project interaction sequences, HTTP/type/parse/network/CORS failures, stale ownership, abort/204/origin isolation, sequential/concurrent user requests, existing module top-level this/await, clone-only inspector IDs, real React concept switching/counter/trace controls and existing Quiz feedback/callbacks. Its separate live-provider action passed **3 real provider checks** (JSONPlaceholder, Open-Meteo and TVMaze).
- Preserved /tests/native-browser.html: **35 passed, zero failed**. Rendered-text test waits for initial frame layout without changing the curriculum or expected text.
- Preserved /tests/v3-browser.html: **31 passed, zero failed**, including worker termination/isolation, module and previous project/form behavior.
- Production TypeScript/Vite build passed without chunk-size warnings. Advanced data has its own chunk. Relative Pages URLs and absence of the private classroom code in built assets were checked.
- Actual UI: private teacher unlock; V4 field notes with exact source; classroom timer start and return to Student; Promise adoption pending → fulfilled; separate counter A/B updates; removal of stale visualizers after switching; real live result, cached-live label, explicit mocked fallback and correct offline-default label.
- Production preview at **375 × 812**: document client/scroll width both 360px (375px window including scrollbar), no horizontal page overflow; closure controls/lesson layout remain usable. Temporary viewport override reset afterward.
- Actual Download source produced a five-file V4 ZIP. It was extracted and served independently: user search retrieved Asha/Dev then paginated to Mira/Sam through its labeled offline adapter, without JS Lab or a server API.

Live checks confirm behavior at verification time, not future service uptime or cross-browser certification. No Firefox/Safari or physical-device claim. No telemetry/central monitoring backend is installed; no error-rate or latency guarantees are invented. Existing teacher UI lock retains its documented casual-access limitation. Native budgets remain for ordinary classroom snippets, not hostile-code guarantees.

Release rollback triggers: a legacy/new chapter fails to open, native execution/worker isolation fails, teacher access behavior changes, or a live failure crashes the app. Revert the V4 release commit to restore 7e79e25 via the same Pages workflow. Existing local storage and project database schemas have not been replaced.
