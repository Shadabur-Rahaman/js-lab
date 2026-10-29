# JS LAB V2 — curriculum map

The existing application is extended in place. Chapters 1–6, their IDs, original text/code/assessments, the original ten-question arena, five original projects, theme, sidebar layout, and teacher code are retained. Functions, Arrays, and Objects use IDs 7, 8, and 9.

V2 adds 32 progressive concept sections, 68 prediction/classification exercises, and 15 guided projects. Every concept includes definition, purpose, real-world connection, analogy, technical explanation, a visual lab, two runnable examples, predictions, debugging, application, instructor notes, and a takeaway.

## Where the material lives

| Chapter / unchanged route | Expanded material | Visual lab | Suggested minutes |
|---|---|---|---|
| 2 · #lesson/2 | Words, keywords, identifiers & literals | microscope | 8 |
| 3 · #lesson/3 | Declaration, initialization, assignment & redeclaration | declarations | 10 |
| 3 · #lesson/3 | Global, function, block & lexical scope | scope | 14 (optional deeper) |
| 3 · #lesson/3 | Hoisting without moving source code | hoisting | 12 (optional deeper) |
| 3 · #lesson/3 | The Temporal Dead Zone | tdz | 8 (optional deeper) |
| 3 · #lesson/3 | All seven primitive types & dynamic typing | types | 12 |
| 3 · #lesson/3 | Explicit conversion, coercion & equality | coercion | 12 |
| 3 · #lesson/3 | Truthy, falsy & double negation | truthiness | 8 |
| 3 · #lesson/3 | Primitive copies, object references & const | references | 10 |
| 4 · #lesson/4 | Unary, compound assignment & prefix/postfix | prefix | 9 |
| 4 · #lesson/4 | Logical operands & short-circuit evaluation | logical | 10 |
| 4 · #lesson/4 | Ternary decisions, typeof & instanceof | ternary | 10 |
| 5 · #lesson/5 | switch matching & fallthrough | switch | 10 |
| 5 · #lesson/5 | Practical decisions: games, discounts & validation | rps | 15 |
| 5 · #lesson/5 | Early returns: a bridge to functions | early-return | 9 |
| 6 · #lesson/6 | for…of, for…in, forEach & Object.entries | iteration | 15 |
| 6 · #lesson/6 | A loop workshop: strings, numbers & records | loop-workshop | 16 |
| 7 · #lesson/7 | Functions: reusable behavior, parameters & arguments | function | 12 |
| 7 · #lesson/7 | Return values, printing & guard clauses | returns | 10 |
| 7 · #lesson/7 | Declarations, expressions, arrows & callbacks | function-forms | 12 |
| 7 · #lesson/7 | Default parameters & rest parameters | parameters | 10 |
| 7 · #lesson/7 | Optional deeper dive: regular this & lexical this | this | 14 (optional deeper) |
| 8 · #lesson/8 | Arrays: indexed collections & memory boxes | array | 10 |
| 8 · #lesson/8 | push, pop, shift, unshift, splice, slice & reverse | array-methods | 16 |
| 8 · #lesson/8 | map, filter, reduce, find, some, every & forEach | transform | 20 |
| 8 · #lesson/8 | Default sorting, numeric comparators & top products | sort | 10 |
| 8 · #lesson/8 | Array destructuring, spread & shallow copies | destructure | 10 |
| 9 · #lesson/9 | Objects, properties, methods & nested access | object | 12 |
| 9 · #lesson/9 | Object destructuring, keys, values & entries | object-iteration | 12 |
| 9 · #lesson/9 | Reference equality, spread, Object.assign & structuredClone | copy | 16 (optional deeper) |
| 9 · #lesson/9 | Optional chaining, computed keys & safe data access | properties | 12 |
| 7 · #lesson/7 | Optional deeper dive: closures & binding lifetime | closure | 12 (optional deeper) |

Open **Discover → Explore the next layer** for the complete sequence, or **Experiment** for the visual labs. **Practice → More predictions** collects the chapter’s questions using the same quiz engine. Each expanded concept has its own explored marker; these do not erase lesson completion. New chapter projects are in Experiment and also under the original Build something real page.

## Applied projects

| Chapter | Project | Problem |
|---|---|---|
| 7 | BMI arithmetic calculator | Return a reusable numeric result from weight in kilograms and height in meters. This is a units-and-functions exercise, without health categories or medical advice. |
| 7 | Largest number finder | Reuse one helper to find the largest number in different lists, including all-negative lists. |
| 7 | Reusable discount helper | Apply a caller-selected discount with a sensible default instead of duplicating arithmetic. |
| 7 | Temperature converter | Convert Celsius to Fahrenheit using one named, reusable function. |
| 7 | Input validation function | Reject missing or invalid marks before an interface uses them. |
| 8 | User filtering logic | Select active fictional users who meet a minimum age. |
| 8 | Salary total & average | Summarize a small fictional salary dataset with an explicit initial accumulator. |
| 8 | Top three rated products | Select the three highest-rated fictional products while preserving the source order. |
| 8 | Student marks analyzer | Turn a list of marks into an average, highest score, and pass count using threshold 40. |
| 8 | Shopping-cart total | Calculate a bill from a collection of product prices and quantities. |
| 8 | Remove tasks from a list | Remove one task without leaving a sparse-array hole. |
| 9 | Student manager | Add fictional students, update marks, inspect details, search records, and show results with an array of objects. |
| 9 | Address book | Manage a small local collection of fictional contacts and search by name. |
| 9 | Product inventory | Track named products with quantities and prices, then derive total inventory value. |
| 9 | User profile inspector | Read a nested profile safely and unpack the fields needed by an interface. |

Each new project has a working local demo, prerequisites, a four-step guide, editable starter, hint, reference solution, and extension challenge. Data is fictional and browser-local.

## Progress compatibility

The storage key remains `js-lab-progress-v1`. Existing `completed`, `answers`, and `current` values are retained. Valid lesson IDs now include 7–9, and a new `concepts` array stores independently explored concept IDs. Missing concepts defaults to an empty array. Existing question IDs and achievement rules are unchanged. A six-of-six learner becomes six-of-nine, not zero-of-nine.

## Teaching

The original 60-minute plan is retained exactly. A new expandable multi-session guide offers eight suggested sessions. Every concept’s detailed teaching notes remain inside Teacher Mode and use the existing code lock, fullscreen, timer, and navigation. The teacher code has not been rotated or added to any public file.

## Execution environment

The same isolated iframe and disposable Worker run synchronous JavaScript. A snippet is a fresh function body, not a browser classic script or ES module; scope and `this` examples state this context and use explicit functions or strict mode as needed. All new syntax is handled by the JavaScript engine without a custom interpreter. The one-second timeout, 150-line cap, no-network CSP, message validation, and limited simulated DOM are retained. Value snapshots now preserve undefined, NaN, BigInt, symbols, and circular references instead of losing them through JSON-only formatting. Ctrl+Enter only runs the focused playground.

## Verification strategy

The legacy curriculum fixture was captured from commit `ba19764`, before V2. Tests compare original content and assessment IDs against that fixture, migrate legacy progress without erasure, execute all runnable examples and solutions, compare every new prediction with actual JavaScript output/error categories, match loop traces to their displayed source, and verify array mutations, return values, references, copying, serialization, and teacher-access expiry. Browser checks cover component interaction and the minified production runner as well.

## Technical reference sources

- [MDN: let, TDZ, and scope](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)
- [MDN: hoisting and binding setup](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting)
- [MDN: array methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
- [MDN: arrow functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [MDN: structured clone](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)
