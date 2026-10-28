# JS LAB — Learn JavaScript by Doing

A local classroom app built with React, TypeScript, Vite, Tailwind CSS, Lucide icons, Motion, and a Prism-highlighted editor. No accounts, API keys, or database.

## Run

Requires a current Node.js release (Node 24 recommended).

```sh
npm install
npm run dev
```

Open the local URL printed in the terminal. To produce a static build, run `npm run build`. Serve that build with `npm run preview`. `dist/` can be hosted on any static host; hash navigation needs no server rewrite.

## GitHub Pages

The included `.github/workflows/deploy.yml` tests, builds, and deploys the app whenever the `main` branch is pushed. In the repository’s **Settings → Pages**, select **GitHub Actions** as the publishing source. The Vite configuration uses relative asset URLs so the build works under a repository subpath such as `/js-lab/`.

Deployment uses GitHub’s standard Pages actions, with read-only source access in the build job and Pages publishing permissions only in the deployment job. No personal access token or other secret belongs in the project.

## Classroom flow

Use the Student / Teacher switch in the top bar. Teacher mode adds larger lesson text, a persistent timer, the 60-minute plan, fullscreen presentation, and expandable notes. Each of six chapters has Discover, Experiment, Practice, and Quick check tabs. Practice contains a prediction gate, a repair exercise, and a mini challenge. Lessons are self-marked complete; assessment answers are stored separately. The overview links to nine real-world demos and five guided mini projects.

The cheat sheet includes comparisons; Error Detective has six repair cases; revision has twelve flashcards; the challenge arena has ten questions. Scores reflect the latest checked answer per question and are not cumulative rewards for repeated clicks. Local storage keeps completion, results, and the current chapter. Reset progress asks for confirmation.

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
