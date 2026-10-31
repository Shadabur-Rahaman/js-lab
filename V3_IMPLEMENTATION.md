# JS LAB V3 — additive implementation map

Baseline: `0cfaa23`. Preserve all nine chapters, original/V2 content, IDs, quizzes, teacher verifier, timer, presentation, synchronous runner, and `js-lab-progress-v1`.

1. Foundation: optional beginner academy, reorderable algorithms and supported flowchart/pseudocode models; language gaps reuse existing synchronous editor.
2. Browser programming: separate worker-backed DOM bridge and opaque preview; editable HTML/CSS/JS, real user events, DOM snapshots, forms, inspector, console/errors. Worker termination protects the application from ordinary infinite loops. Explicitly document supported DOM subset instead of claiming a complete browser debugger.
3. Execution: verified traces plus real timers/promises in the separate worker; event-loop model states its limits.
4. Applications: deterministic mock fetch, JSON and storage exercises; virtual multi-file projects with bounded imports, exports and local save.
5. Workflow: official tool/deployment guides, meaningful isolated function tests, security/accessibility exercises.
6. Enrichment: working project references, logic practice, curated help, expanded classroom guidance, roadmap, local progress export/import.

Do not run untrusted code in the parent or grant same-origin to either frame. Rendering and execution have distinct policies. No real API calls, credentials, uploads, or external deployment are simulated as real actions. Preserve the unrelated `html-lab/` checkout.

Verification: baseline curriculum comparisons, progress migration, runner policies, actual DOM/events/async behavior and worker termination, mock API states, multi-file resolution and ZIP safety, real project interactions, phone widths, teacher lock, tests/build, existing Pages workflow. Record limitations and unfinished scope honestly.
