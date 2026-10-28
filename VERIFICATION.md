# Verification — 28 October 2026

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
