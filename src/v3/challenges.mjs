const c = (id, title, brief, solution, cases) => ({
  id,
  title,
  brief,
  solution,
  cases,
  starter:
    "function solve(input) {\n  // Return a result; do not only print it.\n}\n",
  hint: "Write down the input type and expected output. Work through a normal case and an empty/boundary case before coding.",
});
export const challenges = [
  c(
    "even",
    "Even or odd",
    'Return "even" or "odd" for an integer. Throw for a noninteger.',
    'function solve(n){if(!Number.isInteger(n))throw new TypeError("Integer required");return n%2===0?"even":"odd"}',
    [
      [2, "even"],
      [-3, "odd"],
      [0, "even"],
      [1.2, null, "TypeError"],
    ],
  ),
  c(
    "sign",
    "Positive, negative or zero",
    "Return the sign label for a finite number.",
    'function solve(n){if(!Number.isFinite(n))throw new TypeError("Finite number required");return n>0?"positive":n<0?"negative":"zero"}',
    [
      [2, "positive"],
      [-1, "negative"],
      [0, "zero"],
      ["2", null, "TypeError"],
    ],
  ),
  c(
    "largest",
    "Largest of three",
    "Input is a three-number array; return its maximum.",
    "function solve(a){return Math.max(...a)}",
    [
      [[1, 9, 3], 9],
      [[-8, -2, -5], -2],
      [[4, 4, 1], 4],
    ],
  ),
  c(
    "grade",
    "Grade calculation",
    "Finite marks 0–100: A >=90, B >=75, C >=60, Pass >=40, otherwise Retry. Invalid values return Invalid.",
    'function solve(n){if(!Number.isFinite(n)||n<0||n>100)return "Invalid";return n>=90?"A":n>=75?"B":n>=60?"C":n>=40?"Pass":"Retry"}',
    [
      [90, "A"],
      [40, "Pass"],
      [39, "Retry"],
      [101, "Invalid"],
      ["75", "Invalid"],
    ],
  ),
  c(
    "table",
    "Multiplication table",
    "Return the first five positive multiples of a number.",
    "function solve(n){return Array.from({length:5},(_,i)=>n*(i+1))}",
    [
      [3, [3, 6, 9, 12, 15]],
      [0, [0, 0, 0, 0, 0]],
      [-2, [-2, -4, -6, -8, -10]],
    ],
  ),
  c(
    "factorial",
    "Factorial",
    "For integer 0–12, return factorial. Throw RangeError otherwise.",
    'function solve(n){if(!Number.isInteger(n)||n<0||n>12)throw new RangeError("Use integer 0–12");let out=1;for(let i=2;i<=n;i++)out*=i;return out}',
    [
      [0, 1],
      [5, 120],
      [-1, null, "RangeError"],
    ],
  ),
  c(
    "reverse",
    "Reverse code points",
    "Reverse a string by Unicode code points (not full grapheme clusters).",
    'function solve(s){return [...s].reverse().join("")}',
    [
      ["abc", "cba"],
      ["", ""],
      ["A🙂", "🙂A"],
    ],
  ),
  c(
    "vowels",
    "Count vowels",
    "Count English a/e/i/o/u ignoring case.",
    "function solve(s){return (s.match(/[aeiou]/gi)||[]).length}",
    [
      ["Education", 5],
      ["rhythm", 0],
      ["", 0],
    ],
  ),
  c(
    "sum",
    "Sum an array",
    "Return the sum of an array of finite numbers; empty array returns 0.",
    "function solve(a){return a.reduce((s,n)=>s+n,0)}",
    [
      [[2, 3], 5],
      [[], 0],
      [[-2, 2, 0], 0],
    ],
  ),
  c(
    "unique",
    "Remove duplicates",
    "Preserve first occurrence order for primitive numbers.",
    "function solve(a){return [...new Set(a)]}",
    [
      [
        [1, 1, 2],
        [1, 2],
      ],
      [[], []],
      [
        [0, -1, 0],
        [0, -1],
      ],
    ],
  ),
  c(
    "minmax",
    "Minimum and maximum",
    "Return {min,max} for a nonempty number array; empty array returns null.",
    "function solve(a){return a.length?{min:Math.min(...a),max:Math.max(...a)}:null}",
    [
      [[2, -1, 4], { min: -1, max: 4 }],
      [[], null],
      [[5], { min: 5, max: 5 }],
    ],
  ),
  c(
    "palindrome",
    "Palindrome",
    "Ignore case and ASCII nonletters/digits, then return whether text reads both ways.",
    'function solve(s){const x=s.toLowerCase().replace(/[^a-z0-9]/g,"");return x===[...x].reverse().join("")}',
    [
      ["A man, a plan, a canal: Panama", true],
      ["hello", false],
      ["", true],
    ],
  ),
  c(
    "frequency",
    "Frequency counter",
    "Count string tokens; return a plain record. Support keys such as __proto__.",
    "function solve(a){return Object.fromEntries([...new Set(a)].map(k=>[k,a.filter(x=>x===k).length]))}",
    [
      [["a", "b", "a"], { a: 2, b: 1 }],
      [[], {}],
      [["__proto__", "__proto__"], JSON.parse('{"__proto__":2}')],
    ],
  ),
  c(
    "group",
    "Group records",
    "Group records by category; each output value is an array of names.",
    "function solve(a){const out=new Map();for(const r of a){if(!out.has(r.category))out.set(r.category,[]);out.get(r.category).push(r.name)}return Object.fromEntries(out)}",
    [
      [
        [
          { name: "A", category: "x" },
          { name: "B", category: "x" },
          { name: "C", category: "y" },
        ],
        { x: ["A", "B"], y: ["C"] },
      ],
      [[], {}],
    ],
  ),
  c(
    "sort",
    "Sort objects",
    "Return new records sorted by ascending price without mutating input.",
    "function solve(a){return [...a].sort((x,y)=>x.price-y.price)}",
    [
      [
        [{ price: 10 }, { price: 2 }],
        [{ price: 2 }, { price: 10 }],
      ],
      [[], []],
    ],
  ),
  c(
    "filter",
    "Filter products",
    "Input {items,min}; return items whose price >= min.",
    "function solve({items,min}){return items.filter(p=>p.price>=min)}",
    [
      [{ items: [{ price: 1 }, { price: 5 }], min: 3 }, [{ price: 5 }]],
      [{ items: [], min: 0 }, []],
    ],
  ),
  c(
    "transform",
    "Transform records",
    "Return uppercase names, preserving order.",
    "function solve(a){return a.map(x=>x.name.toUpperCase())}",
    [
      [
        [{ name: "Asha" }, { name: "Dev" }],
        ["ASHA", "DEV"],
      ],
      [[], []],
    ],
  ),
  c(
    "validate",
    "Validate structured input",
    "Return true only for a record with nonblank string name and integer age 0–120.",
    'function solve(x){return !!x&&typeof x.name==="string"&&x.name.trim().length>0&&Number.isInteger(x.age)&&x.age>=0&&x.age<=120}',
    [
      [{ name: "Asha", age: 20 }, true],
      [{ name: " ", age: 20 }, false],
      [null, false],
      [{ name: "Dev", age: 121 }, false],
    ],
  ),
  c(
    "cart",
    "Shopping totals",
    "Sum price×quantity for records using nonnegative integer minor-unit prices.",
    "function solve(a){return a.reduce((n,p)=>n+p.price*p.quantity,0)}",
    [
      [
        [
          { price: 110, quantity: 2 },
          { price: 50, quantity: 3 },
        ],
        370,
      ],
      [[], 0],
    ],
  ),
  c(
    "suggest",
    "Search suggestions",
    "Input {names,q}; return case-insensitive prefix matches, up to three.",
    "function solve({names,q}){return names.filter(n=>n.toLowerCase().startsWith(q.toLowerCase())).slice(0,3)}",
    [
      [
        { names: ["Asha", "Amy", "Dev", "Al", "Ari"], q: "a" },
        ["Asha", "Amy", "Al"],
      ],
      [{ names: ["Dev"], q: "z" }, []],
    ],
  ),
  c(
    "nested",
    "Nested JSON",
    'Return user.address.city or "Unknown" using nullish fallback. Preserve an empty string.',
    'function solve(x){return x?.user?.address?.city??"Unknown"}',
    [
      [{ user: { address: { city: "Example City" } } }, "Example City"],
      [{}, "Unknown"],
      [{ user: { address: { city: "" } } }, ""],
    ],
  ),
  c(
    "merge",
    "Merge datasets",
    "Input {a,b}; merge by id with later b records replacing duplicates; preserve first id order.",
    "function solve({a,b}){return [...new Map([...a,...b].map(x=>[x.id,x])).values()]}",
    [
      [
        {
          a: [{ id: 1, n: "A" }],
          b: [
            { id: 1, n: "B" },
            { id: 2, n: "C" },
          ],
        },
        [
          { id: 1, n: "B" },
          { id: 2, n: "C" },
        ],
      ],
      [{ a: [], b: [] }, []],
    ],
  ),
  c(
    "page",
    "Pagination",
    "Input {items,page,size}; pages start at 1. Return that slice. Throw RangeError for invalid page/size.",
    'function solve({items,page,size}){if(!Number.isInteger(page)||!Number.isInteger(size)||page<1||size<1)throw new RangeError("Positive integer page and size required");return items.slice((page-1)*size,page*size)}',
    [
      [{ items: [1, 2, 3, 4, 5], page: 2, size: 2 }, [3, 4]],
      [{ items: [1], page: 3, size: 2 }, []],
      [{ items: [], page: 0, size: 2 }, null, "RangeError"],
    ],
  ),
  c(
    "state",
    "Model application state",
    'Input {state,action}; action {type:"add",value} appends immutably; {type:"clear"} returns []; otherwise preserve values.',
    'function solve({state,action}){return action.type==="add"?[...state,action.value]:action.type==="clear"?[]:[...state]}',
    [
      [{ state: [1], action: { type: "add", value: 2 } }, [1, 2]],
      [{ state: [1], action: { type: "clear" } }, []],
      [{ state: [1], action: { type: "unknown" } }, [1]],
    ],
  ),
];
export const bugPrograms = [
  [
    "Coercing calculator",
    "function solve(input) { return input[0] + input[1]; }",
    "Convert numeric strings before adding.",
    "function solve(input){return Number(input[0])+Number(input[1])}",
    [
      [["2", "3"], 5],
      [["0", "4"], 4],
    ],
  ],
  [
    "A function with no return",
    "function solve(n) { n * 2; }",
    "An expression in a function body is not an implicit return.",
    "function solve(n){return n*2}",
    [
      [3, 6],
      [0, 0],
    ],
  ],
  [
    "Off-by-one access",
    "function solve(items) { return items[items.length]; }",
    "The last valid index is length minus one. Define the empty case.",
    "function solve(items){return items.length?items[items.length-1]:null}",
    [
      [[1, 2], 2],
      [[], null],
    ],
  ],
  [
    "A loop that never ends",
    "function solve(n) { let total=0; let i=0; while(i<n){ total+=i; } return total; }",
    "Update i on every iteration. Start with n=3 and trace it.",
    "function solve(n){let total=0;for(let i=0;i<n;i++)total+=i;return total}",
    [
      [3, 3],
      [0, 0],
    ],
  ],
  [
    "Invalid JSON",
    "function solve(text) { return JSON.parse(text).name; }",
    "Catch parse failures and validate the parsed record.",
    'function solve(text){try{const x=JSON.parse(text);return typeof x?.name==="string"?x.name:"Unknown"}catch{return "Unknown"}}',
    [
      ['{"name":"Asha"}', "Asha"],
      ["bad", "Unknown"],
      ["null", "Unknown"],
    ],
  ],
  [
    "Unsafe nested access",
    "function solve(user) { return user.address.city; }",
    "An absent intermediate object cannot be read directly.",
    'function solve(user){return user?.address?.city??"Unknown"}',
    [
      [{ address: { city: "Sample" } }, "Sample"],
      [{}, "Unknown"],
      [null, "Unknown"],
    ],
  ],
  [
    "Incorrect condition",
    "function solve(age) { if (age = 18) return true; return false; }",
    "Assignment changes a binding; a comparison asks a question.",
    "function solve(age){return age>=18}",
    [
      [17, false],
      [18, true],
      [21, true],
    ],
  ],
];
