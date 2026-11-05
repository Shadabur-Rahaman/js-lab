# JS LAB — Learn JavaScript by Doing

A classroom app built with React, TypeScript, Vite, Tailwind CSS, Lucide icons, Motion, and a Prism-highlighted editor, with a persistent Supabase resource library.

The private deployment adds Cloudflare Access email-code sign-in, server-checked enrollment, administrator student management, expiry and revocation. Build it with `npm run build:private`; this creates `dist-private` with an authorization worker protecting every asset and API. Missing settings fail closed. `npm run build` preserves the legacy static deployment during migration.

See [DEPLOYMENT.md](DEPLOYMENT.md) for Cloudflare configuration, progress transfer, verification, explicit public-site retirement and rollback; [SECURITY.md](SECURITY.md) for enforcement and limitations; and [TEST_REPORT.md](TEST_REPORT.md) for executed checks. On 5 November 2026 the owner approved closing the public site while keeping existing private-site users. GitHub Pages is unpublished, automatic Pages publishing is removed, and the legacy public resource gateway is disabled.

## Run

Requires a current Node.js release (Node 24 recommended).

```sh
npm install
npm run dev
```

Open the local URL printed in the terminal. To produce a static build, run `npm run build`. Serve that build with `npm run preview`. `dist/` can be hosted on any static host; hash navigation needs no server rewrite.

## Hosting

Use https://js-lab-private.pages.dev/ with an existing approved email. The old GitHub Pages URL is closed. `.github/workflows/deploy.yml` now verifies builds and permissions only; it does not publish a site. The source repository remains public, so this change protects the hosted application and cloud resources, not the publicly available lesson source.

## Classroom flow

Teacher tools require the instructor’s classroom access code. The Teacher button and teaching-plan link open a code dialog; instructor notes do not appear in Student Mode. Choose Student or **Lock teacher tools** to relock. Refreshing the page also relocks, and an unlocked session expires after 15 minutes without activity. Unlock state and the entered code are held only in memory. Five incorrect attempts trigger a 30-second pause in that tab.

The private code is in the local, Git-ignored `.deployment/teacher-access.txt` file. Only a SHA-256 verifier is published. To generate a replacement, run `node scripts/rotate-teacher-code.mjs`, then commit and push `src/config/teacher.ts`. Do not commit the private code file or put the code in a GitHub issue, README, or commit message.

**Protection level:** this is a classroom UI lock that discourages casual access, not real authentication or server-side authorization. GitHub Pages serves public static files; a determined visitor can alter client code or read the public source and its history, including teacher material. The attempt pause can also be bypassed locally. Do not use this mechanism to protect confidential content. Strong protection requires a backend or authenticated hosting service.

Use the Student / Teacher switch in the top bar. Teacher mode adds larger lesson text, a persistent timer, the 60-minute plan, fullscreen presentation, and expandable notes. Each of nine chapters has Discover, Experiment, Practice, and Quick check tabs. Practice contains a prediction gate, a repair exercise, and a mini challenge. Lessons are self-marked complete; assessment answers are stored separately. The overview links to nine real-world demos and the five original guided mini projects, with 15 additional projects in the expanded chapters.

The cheat sheet includes comparisons; Error Detective has nine repair cases; revision has eighteen flashcards; the challenge arena has ten questions. Scores reflect the latest checked answer per question and are not cumulative rewards for repeated clicks. Local storage keeps completion, results, and the current chapter. Reset progress asks for confirmation.

## Curriculum upgrades

## V3 development academy

Open **Development academy** in the sidebar for the additive beginner, DOM/events/forms, async/API, storage, workspace, debugging/testing, project and workflow paths. See [CURRICULUM_V3.md](CURRICULUM_V3.md) for the complete scope, architecture, progress strategy and explicit supported-feature limits. V3 retains every existing chapter and the original synchronous runner; the new worker DOM bridge is a separate execution mode. Live API access and full native-browser APIs are not provided. Learners can export source and test/publish it through their own real development tools.

### Existing V2 material

See [CURRICULUM_V2.md](CURRICULUM_V2.md) for the complete chapter/concept/project map, progress compatibility, teaching guidance, and execution context. New concept completion is additive; the original six lessons and assessment IDs are retained. The course now extends through Functions, Arrays, and Objects using the same lesson tabs and design.

## Code runner boundaries

Student JavaScript is evaluated in a disposable Web Worker created inside a hidden iframe with `sandbox="allow-scripts"` and no same-origin permission. The frame supplies a CSP that denies network connections and external resources. Known network and worker-creation APIs are disabled in the worker. Parent communication checks the frame source, a per-run random token, and the result shape. Results are rendered as text. A one-second worker timeout and parent watchdog bound execution; logs are capped at 150 and message lengths are limited.

This is an educational local runner, not a service for executing hostile code. Deliberately allocating enormous memory or attempting browser exploits is outside its guarantees. Use it with your own trusted classroom code. It does not implement a complete DOM or asynchronous browser runtime. Supported lessons are synchronous JavaScript with console.log/info/warn/error, simulated alert, a preset prompt response, and a text-only document.getElementById("message").textContent preview. document.write is simulated as text. Browser-worker support is required. Do not enter secrets or real passwords in demos.

The React application’s actual interface helpers are separate from the student runner. The HTML/CSS/JS experiment and mini-project demos are real working interfaces; their editable exercises focus on beginner logic using fixed values or simulated prompt input.

## Verification

```sh
npm test
npm run build
```

Tests cover loop trace ordering and boundaries, grading thresholds, project calculations, saved-progress schema recovery, all lesson examples and reference solutions, and assessment metadata. Browser checks should additionally cover the runner, timeouts, interactive controls, teacher tools, keyboard use, and small screens.

## Organization

- `src/data`: complete lesson, assessment, and project content
- `src/components`: editor, quizzes, teacher tools, projects, and revision/reference screens
- `src/demos`: interactive learning simulations
- `src/hooks`: persistent learning progress
- `src/utils`: isolated code runner and independently tested learning logic

No external fonts or image services are required at runtime. After dependencies are installed, development and the built site work offline when served locally.

## Browser mastery path

Chapters 10–14 add native DOM, events, forms, timers and isolated storage learning. Eight editable browser application references are at #academy/browser-projects. See BROWSER_GAP_AUDIT.md and CURRICULUM_V3.md for coverage and execution limits. Native browser checks run at /tests/native-browser.html under the development server; prior V3 browser regressions remain at /tests/v3-browser.html. These harnesses are development-only and are not part of the published site.

## V4 advanced JavaScript and API development

Chapters 15–19 deepen scope/execution/closures, this/binding, async/Promises, HTTP/Fetch and API applications. Development academy includes the V4 roadmap, eight advanced projects, final challenge and optional controlled Live API Lab. Earlier runners and mock exercises retain their boundaries. See [CURRICULUM_V4.md](CURRICULUM_V4.md) and [V4_IMPLEMENTATION.md](V4_IMPLEMENTATION.md) for the additive map, provider conditions and limits.

V4 source downloads include a labeled fictional API adapter for standalone static practice. Real API mode is restricted to approved fixed requests in a separate integration; arbitrary editable student code remains offline. Private-key services and a backend are not included. Run /tests/v4-browser.html on the dev server for deterministic checks; its live-provider button is optional and separate from CI.

## V5 classroom resource library

Study Materials (`#resources`) and Manage Resources (`#teacher/resources`) add a Supabase-backed classroom file library. The existing classroom code remains separate from cloud teacher authentication. The integration includes private Storage, verified resumable uploads, metadata editing, versioned replacement, publishing, trash/restore, signed downloads, safe previews, categories, audit records and retention cleanup. All nineteen chapters and existing progress/runner boundaries are preserved.

**Cloud connection is active:** the owner’s Supabase project, private storage and teacher authorization are configured. Seventeen hosted acceptance checks passed; see [RESOURCE_LIBRARY_VERIFICATION.md](RESOURCE_LIBRARY_VERIFICATION.md). Follow [RESOURCE_LIBRARY_SETUP.md](RESOURCE_LIBRARY_SETUP.md) for migrations, teacher authorization, Edge Functions, public Pages settings, backups and hosted acceptance checks. Once configured, file changes require no frontend redeployment. Learning features remain usable independently of the resource backend.

Run `node scripts/build-resource-browser-tests.mjs` before opening `/tests/resources-browser.html` in Vite. Its explicitly labeled fixtures test the interface, not cloud persistence. `npm test` covers validation and upload coordination; the Pages workflow additionally checks the migration and permissions in disposable PostgreSQL. Hosted acceptance tests run separately with `node scripts/test-resource-cloud.mjs --confirm-disposable-tests` from an authenticated owner terminal. The script creates clearly named disposable test accounts/files and cleans up only its own fixtures.
