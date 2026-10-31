# V4 additive implementation map

Baseline: `7e79e25`. Chapters 1–14, legacy assessments, worker runners, native isolation, teacher verifier, progress keys, project database and GitHub Pages workflow are preserved. The sibling html-lab and css-lab checkouts are outside this upgrade.

| Area | V3 audit | V4 work |
|---|---|---|
| Basic scope/TDZ/closures, call/apply/bind, Promise ordering | Complete introductions; partial advanced practice | Link earlier material; add chapters 15–17 with retained environments, receiver comparisons, adoption, chaining and recovery |
| Scope lookup vs call stack; creation/initialization | Partial authored traces | Selectable lexical lookup, reversible execution-context trace, independent actual closure instances |
| Async internals | Partial event-loop explorer | Verified authored task/microtask and Promise-state traces, editable native source and combinator scenarios |
| Fetch/HTTP/JSON | Working fictional fixtures; needs production-style practice | Chapter 18, separate extended fixtures, inspector, status/content-type/schema validation, abort/timeouts and stale-request ownership |
| Real providers and dependent requests | Missing | Chapter 19; default offline practice and an optional controlled, opaque-origin live-request frame with fixed allowlist, no arbitrary learner code or credentials |
| Application evidence | Existing projects retained | Eight advanced projects, source ZIPs, starter/reference, tests, debugging and instructor rubrics |
| Assessment/teacher/roadmap | Existing infrastructure complete | Stable additive IDs, existing Quiz component/progress export, final assessment and advanced stages |

Implementation order: preservation fixture → standalone runtime/model additions → chapters and editable projects → controlled live integration → existing-route/quiz/teacher integration → deterministic tests, actual browser checks and production release.

No new dependencies are planned. Engine-state diagrams are authored teaching models with source/output checks, not arbitrary memory inspection. The optional live lab executes fixed trusted requests only. Editable student code continues to use offline fetch. Native mode retains its ordinary-classroom threat model and cooperative limits.

## Implemented result

All five chapters are integrated with the existing course layout, progress and quizzes. Twenty-five units and eight working project references cover the audited gaps. Exact scope cases and authored context/queue traces are source-verified. Real controlled live calls to all three selected providers passed actual browser checks. Existing synchronous/worker source, V3 fixtures, 14 lesson objects and previous project content remain protected by preservation fixtures.

Two integration regressions found during QA were corrected: duplicate sibling keys could retain an old visualizer after concept changes; inspector IDs could appear in learner innerHTML. Unique tool keys and WeakMap/clone-only inspection now have browser regression coverage. Native rendered-text tests wait for frame layout, while retaining exact expected text.

The release has 49 passing deterministic test groups, 47 deterministic V4 browser checks plus three actual-provider checks, 35 preserved native checks and 31 preserved worker checks. Production build and private-code/relative-asset scan pass. Phone-width production preview, teacher gate/notes/timer, explicit source/fallback labels, actual ZIP download and standalone exported API pagination were verified. See CURRICULUM_V4.md for limits/deferred integrations.
