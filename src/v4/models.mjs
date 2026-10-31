export function createCounter(start = 0, step = 1) {
  if (!Number.isFinite(start) || !Number.isFinite(step))
    throw new TypeError("Use finite numbers");
  let count = start;
  return {
    increment() {
      count += step;
      return count;
    },
    decrement() {
      count -= step;
      return count;
    },
    getValue() {
      return count;
    },
  };
}
export function lookupCase(which) {
  const global = { id: "global", bindings: { label: "Workshop", shared: 7 } };
  const outer = {
    id: "outer lexical environment",
    bindings: { label: "Outer", factor: 2 },
    parent: global,
  };
  const inner = {
    id: "inner lexical environment",
    bindings: { label: "Inner" },
    parent: outer,
  };
  const cases = {
    shadow: { scope: inner, name: "label", expected: "Inner" },
    outer: { scope: inner, name: "factor", expected: 2 },
    global: { scope: inner, name: "shared", expected: 7 },
    missing: { scope: inner, name: "absent", error: "ReferenceError" },
    tdz: {
      scope: {
        id: "block before initialization",
        bindings: { label: "<uninitialized>" },
        parent: global,
      },
      name: "label",
      error: "ReferenceError",
    },
  };
  const selected = cases[which] || cases.shadow,
    path = [];
  let scope = selected.scope,
    found;
  while (scope) {
    path.push({
      id: scope.id,
      bindings: scope.bindings,
      hit: Object.hasOwn(scope.bindings, selected.name),
    });
    if (Object.hasOwn(scope.bindings, selected.name)) {
      found = scope.bindings[selected.name];
      break;
    }
    scope = scope.parent;
  }
  return {
    ...selected,
    path,
    result:
      found === "<uninitialized>"
        ? "ReferenceError"
        : found === undefined
          ? "ReferenceError"
          : found,
    shadowed: selected.name === "label" ? ["Outer", "Workshop"] : [],
    code:
      which === "tdz"
        ? `let label='Workshop';try{{console.log(label);let label='Later'}}catch(error){console.log(error.name)}`
        : `const label='Workshop',shared=7;function outer(){const label='Outer',factor=2;function inner(){const label='Inner';return ${selected.name}}return inner()}try{console.log(outer())}catch(error){console.log(error.name)}`,
  };
}
const state = (line, note, stack, bindings = {}, output = [], extra = {}) => ({
  line,
  note,
  stack,
  bindings,
  output,
  ...extra,
});
export const contextSource =
  'const label = "Global";\nfunction read() { return label; }\nfunction caller() {\n  const label = "Caller";\n  return read();\n}\nconsole.log(caller());';
export const contextTrace = [
  state(
    1,
    "Conceptual initialization: lexical binding exists but is uninitialized; functions are available. This is a teaching model, not literal engine passes.",
    ["script"],
    { label: "<uninitialized>", read: "function", caller: "function" },
  ),
  state(1, "Initialize the outer label.", ["script"], { label: "Global" }),
  state(
    7,
    "Invoke caller. The call stack records who is active.",
    ["script", "caller"],
    { globalLabel: "Global", callerLabel: "<uninitialized>" },
  ),
  state(
    4,
    "Initialize caller’s local label; it shadows only within caller’s lexical region.",
    ["script", "caller"],
    { globalLabel: "Global", callerLabel: "Caller" },
  ),
  state(
    2,
    "Invoke read. Its definition is outside caller: lexical lookup skips caller’s local label.",
    ["script", "caller", "read"],
    { globalLabel: "Global", callerLabel: "Caller", lookup: "read → script" },
    [],
    { returned: "Global" },
  ),
  state(
    5,
    "read completes; its return value goes to caller.",
    ["script", "caller"],
    { globalLabel: "Global", callerLabel: "Caller" },
    [],
    { returned: "Global" },
  ),
  state(
    7,
    "caller completes; console receives the returned value.",
    ["script"],
    { label: "Global" },
    ["Global"],
    { returned: "Global" },
  ),
  state(
    7,
    "Script completes. The call stack and lexical lookup chain describe different relationships.",
    [],
    {},
    ["Global"],
  ),
];
export const parameterSource =
  "function add(a,b) {\n const sum=a+b;\n return sum;\n}\nfunction twice(n) { return add(n,n); }\nconsole.log(twice(4));";
export const parameterTrace = [
  state(
    1,
    "Initialize the function declarations in the conceptual script environment.",
    ["script"],
    { add: "function", twice: "function" },
  ),
  state(
    6,
    "Invoke twice with argument 4; initialize parameter n.",
    ["script", "twice"],
    { n: 4 },
  ),
  state(
    1,
    "twice invokes add with its local n as both arguments.",
    ["script", "twice", "add"],
    { n: 4, a: 4, b: 4, sum: "<uninitialized>" },
  ),
  state(2, "Initialize the local sum from a + b.", ["script", "twice", "add"], {
    n: 4,
    a: 4,
    b: 4,
    sum: 8,
  }),
  state(
    3,
    "Complete add and deliver its result to twice.",
    ["script", "twice"],
    { n: 4 },
    [],
    { returned: 8 },
  ),
  state(
    5,
    "Complete twice and supply its result to console.log.",
    ["script"],
    {},
    [],
    { returned: 8 },
  ),
  state(6, "Print the result; script then completes.", [], {}, ["8"]),
];
export const asyncSource =
  'console.log("A");\nsetTimeout(() => console.log("T"), 0);\nPromise.resolve().then(() => {\n console.log("P");\n queueMicrotask(() => console.log("Q"));\n});\nconsole.log("B");';
export const asyncTrace = [
  state(1, "Run synchronous script.", ["script"], {}, ["A"], {
    tasks: [],
    microtasks: [],
    promises: "pending reaction registration",
  }),
  state(
    2,
    "Schedule a minimum-delay timer; it cannot interrupt this stack.",
    ["script"],
    {},
    ["A"],
    {
      tasks: ["timer T (eligible after delay)"],
      microtasks: [],
      promises: "fulfilled input",
    },
  ),
  state(
    3,
    "A fulfilled Promise queues its reaction as a microtask.",
    ["script"],
    {},
    ["A"],
    {
      tasks: ["timer T"],
      microtasks: ["reaction P"],
      promises: "reaction result pending",
    },
  ),
  state(
    7,
    "Continue synchronous code before either queued callback.",
    ["script"],
    {},
    ["A", "B"],
    {
      tasks: ["timer T"],
      microtasks: ["reaction P"],
      promises: "reaction result pending",
    },
  ),
  state(
    4,
    "At the microtask checkpoint, run P; it queues Q.",
    ["reaction P"],
    {},
    ["A", "B", "P"],
    {
      tasks: ["timer T"],
      microtasks: ["Q"],
      promises: "reaction result fulfills undefined",
    },
  ),
  state(
    5,
    "Drain the added microtask before moving to the timer task.",
    ["microtask Q"],
    {},
    ["A", "B", "P", "Q"],
    { tasks: ["timer T"], microtasks: [], promises: "fulfilled" },
  ),
  state(
    2,
    "Run the eligible timer task after the checkpoint.",
    ["timer T"],
    {},
    ["A", "B", "P", "Q", "T"],
    { tasks: [], microtasks: [], promises: "fulfilled" },
  ),
];
export const bindingCases = [
  {
    id: "standalone",
    title: "Standalone (strict)",
    definition: 'function who(){"use strict";return this}',
    invocation: "who()",
    expected: "undefined",
    code: 'function who(){"use strict";return this} console.log(who()===undefined);',
    verify: () => {
      function who() {
        "use strict";
        return this;
      }
      return who() === undefined;
    },
  },
  {
    id: "method",
    title: "Object method",
    definition: 'const item={name:"Asha",who(){return this.name}}',
    invocation: "item.who()",
    expected: "Asha",
    code: 'const item={name:"Asha",who(){return this.name}};console.log(item.who());',
    verify: () =>
      ({
        name: "Asha",
        who() {
          return this.name;
        },
      }).who(),
  },
  {
    id: "extract",
    title: "Extracted method",
    definition: 'function who(){"use strict";return this.name}',
    invocation: "const detached=item.who; detached()",
    expected: "TypeError",
    code: 'function who(){"use strict";return this.name}const item={name:"Asha",who};try{const detached=item.who;detached()}catch(e){console.log(e.name)}',
    verify: () => {
      function who() {
        "use strict";
        return this.name;
      }
      try {
        const item = { name: "Asha", who };
        const detached = item.who;
        return detached();
      } catch (e) {
        return e.name;
      }
    },
  },
  ...["call", "apply", "bind"].map((id) => ({
    id,
    title: id + "()",
    definition: "function greet(prefix){return prefix+this.name}",
    invocation:
      id === "call"
        ? 'greet.call(item,"Hi ")'
        : id === "apply"
          ? 'greet.apply(item,["Hi "])'
          : 'greet.bind(item,"Hi ")()',
    expected: "Hi Asha",
    code: `function greet(prefix){return prefix+this.name}const item={name:"Asha"};console.log(${id === "call" ? 'greet.call(item,"Hi ")' : id === "apply" ? 'greet.apply(item,["Hi "])' : 'greet.bind(item,"Hi ")()'});`,
    verify: () => {
      function greet(prefix) {
        return prefix + this.name;
      }
      const item = { name: "Asha" };
      return id === "call"
        ? greet.call(item, "Hi ")
        : id === "apply"
          ? greet.apply(item, ["Hi "])
          : greet.bind(item, "Hi ")();
    },
  })),
  {
    id: "arrow",
    title: "Arrow property (lexical this)",
    definition: "function factory(){return {read:()=>this.name}}",
    invocation: 'factory.call({name:"Outer"}).read.call({name:"Other"})',
    expected: "Outer",
    code: 'function factory(){return {read:()=>this.name}}const item=factory.call({name:"Outer"});console.log(item.read.call({name:"Other"}));',
    verify: () => {
      function factory() {
        return { read: () => this.name };
      }
      return factory.call({ name: "Outer" }).read.call({ name: "Other" });
    },
  },
  {
    id: "class",
    title: "Class method / construction",
    definition:
      "class Person{constructor(name){this.name=name}read(){return this.name}}",
    invocation: 'new Person("Asha").read()',
    expected: "Asha",
    code: 'class Person{constructor(name){this.name=name}read(){return this.name}}console.log(new Person("Asha").read());',
    verify: () => {
      class Person {
        constructor(name) {
          this.name = name;
        }
        read() {
          return this.name;
        }
      }
      return new Person("Asha").read();
    },
  },
  {
    id: "event",
    title: "Regular event listener",
    definition: 'button.addEventListener("click",function(e){...})',
    invocation: "button.click()",
    expected: "this === event.currentTarget",
    code: 'const button=document.querySelector("#act");button.addEventListener("click",function(event){console.log(this===event.currentTarget)});button.click();',
  },
];
export const advancedStages = [
  "Scope and execution context",
  "Closures and encapsulation",
  "this and binding",
  "Callbacks and Promises",
  "Async/await and event loop",
  "HTTP, Fetch and JSON",
  "Real APIs and request chaining",
  "Data-driven DOM applications",
  "Testing and debugging",
  "Independent API capstone",
];
