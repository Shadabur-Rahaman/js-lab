const css =
  "* { box-sizing:border-box; } body { font:16px/1.7 system-ui; max-width:65rem; margin:auto; padding:20px; color:#24352b; background:#fafaf5; } button,input,select,textarea { font:inherit; padding:8px; margin:4px; max-width:100%; } label { display:block; } :focus-visible { outline:3px solid teal; outline-offset:3px; } li { margin:8px 0; } .done { text-decoration:line-through; } .grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:10px; } table { border-collapse:collapse; } td,th { padding:8px;border:1px solid #aaa; }";
const make = (id, title, body, code, requirements, tests) => ({
  id,
  title,
  requirements,
  tests,
  level: ["calculator", "quiz", "rps"].includes(id)
    ? "Beginner"
    : id === "capstone"
      ? "Independent"
      : "Developing",
  files: {
    "index.html": `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><link rel="stylesheet" href="css/style.css"></head><body><main><h1>${title}</h1>${body}</main><script type="module" src="js/app.js"></script></body></html>`,
    "css/style.css": css,
    "js/app.js": code,
    "README.md": `# ${title}\n\nFictional educational frontend. No backend, real authentication, or certified engineering/financial service. Use a local server for ES modules. Test with keyboard, narrow width, invalid and empty values. Export includes source; learning storage is separate. See JS LAB workflow for static deployment.\n`,
  },
});
export const applicationProjects = [
  make(
    "calculator",
    "Interactive calculator",
    '<label>First number<input id="a" inputmode="decimal"></label><label>Second number<input id="b" inputmode="decimal"></label><label>Operation<select id="op"><option>+</option><option>-</option><option>*</option><option>/</option></select></label><button id="calculate">Calculate</button><p id="result" role="status"></p>',
    `document.querySelector('#calculate').addEventListener('click',()=>{const rawA=document.querySelector('#a').value.trim(),rawB=document.querySelector('#b').value.trim(),a=Number(rawA),b=Number(rawB),op=document.querySelector('#op').value;let result;if(!rawA||!rawB||!Number.isFinite(a)||!Number.isFinite(b))result='Enter two finite numbers';else if(op==='/'&&b===0)result='Choose a nonzero divisor';else result=op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:a/b;document.querySelector('#result').textContent=String(result)});`,
    [
      "Convert and validate text input",
      "Four operations and zero-divisor handling",
      "Accessible result message",
    ],
    ["2 + 3 → 5", "-2 × 4 → -8", "Empty or zero divisor → useful error"],
  ),
  make(
    "marks",
    "Student marks manager",
    '<label>Name<input id="name"></label><label>Marks<input id="marks" inputmode="decimal"></label><button id="add">Add student</button><label>Search<input id="search"></label><button id="sort">Sort by marks</button><ul id="list"></ul><p id="status" role="status"></p>',
    `let students=[];const list=document.querySelector('#list');function render(){const q=document.querySelector('#search').value.toLowerCase();list.replaceChildren();for(const s of students.filter(s=>s.name.toLowerCase().includes(q))){const li=document.createElement('li');li.textContent=s.name+': '+s.marks;list.append(li)}}document.querySelector('#add').addEventListener('click',()=>{const name=document.querySelector('#name').value.trim(),raw=document.querySelector('#marks').value.trim(),marks=Number(raw);if(!name||!raw||!Number.isFinite(marks)||marks<0||marks>100){document.querySelector('#status').textContent='Name and marks 0–100 required';return}students.push({name,marks});render();document.querySelector('#status').textContent=students.length+' students'});document.querySelector('#search').addEventListener('input',render);document.querySelector('#sort').addEventListener('click',()=>{students.sort((a,b)=>b.marks-a.marks);render()});`,
    [
      "Add fictional records",
      "Filter and sort without losing records",
      "Validate marks",
    ],
    [
      "Add Asha 86, Dev 61; sort descending",
      "Search asha → one result",
      "Reject empty and 101",
    ],
  ),
  make(
    "todo",
    "Persistent to-do application",
    '<label>Task<input id="task"></label><button id="add">Add task</button><label>Filter<select id="filter"><option value="all">All</option><option value="active">Active</option><option value="done">Completed</option></select></label><ul id="list"></ul><p id="status" role="status"></p>',
    `let tasks=JSON.parse(localStorage.getItem('tasks')||'[]');let next=tasks.reduce((n,t)=>Math.max(n,t.id+1),1);const list=document.querySelector('#list');function render(){localStorage.setItem('tasks',JSON.stringify(tasks));list.replaceChildren();const filter=document.querySelector('#filter').value;for(const t of tasks.filter(t=>filter==='all'||(filter==='done'?t.done:!t.done))){const li=document.createElement('li');li.className=t.done?'done':'';const edit=document.createElement('input');edit.value=t.text;edit.setAttribute('aria-label','Edit task '+t.id);edit.addEventListener('change',()=>{if(edit.value.trim())t.text=edit.value.trim();render()});li.append(edit);for(const [label,fn] of [['Complete / reopen',()=>{t.done=!t.done}],['Remove',()=>{tasks=tasks.filter(x=>x.id!==t.id)}]]){const b=document.createElement('button');b.textContent=label;b.addEventListener('click',()=>{fn();render()});li.append(b)}list.append(li)}document.querySelector('#status').textContent=tasks.length+' tasks'}document.querySelector('#add').addEventListener('click',()=>{const input=document.querySelector('#task');if(!input.value.trim())return;tasks.push({id:next++,text:input.value.trim(),done:false});input.value='';render()});document.querySelector('#filter').addEventListener('change',render);render();`,
    [
      "Add, edit, complete, remove and filter",
      "State array drives rendering",
      "Save to project learning storage",
    ],
    [
      "Add two; complete one; Active shows one",
      "Edit and remove a task",
      "Save workspace; reopen and rerun retains data",
    ],
  ),
  make(
    "expense",
    "Fictional expense tracker",
    '<p>Educational amounts only.</p><label>Description<input id="name"></label><label>Amount<input id="amount" inputmode="decimal"></label><button id="add">Add expense</button><label>Filter descriptions<input id="filter"></label><ul id="list"></ul><p id="total" role="status"></p>',
    `let entries=JSON.parse(localStorage.getItem('expenses')||'[]');function render(){localStorage.setItem('expenses',JSON.stringify(entries));const q=document.querySelector('#filter').value.toLowerCase(),shown=entries.filter(e=>e.name.toLowerCase().includes(q)),list=document.querySelector('#list');list.replaceChildren();for(const e of shown){const li=document.createElement('li');li.textContent=e.name+': '+(e.cents/100).toFixed(2);const b=document.createElement('button');b.textContent='Remove';b.addEventListener('click',()=>{entries=entries.filter(x=>x!==e);render()});li.append(b);list.append(li)}document.querySelector('#total').textContent='Filtered total: '+(shown.reduce((n,e)=>n+e.cents,0)/100).toFixed(2)}document.querySelector('#add').addEventListener('click',()=>{const name=document.querySelector('#name').value.trim(),raw=document.querySelector('#amount').value.trim(),amount=Number(raw);if(!name||!raw||!Number.isFinite(amount)||amount<0){document.querySelector('#total').textContent='Enter a description and nonnegative amount';return}entries.push({name,cents:Math.round(amount*100)});render()});document.querySelector('#filter').addEventListener('input',render);render();`,
    [
      "Add and remove records",
      "Calculate totals using integer minor units",
      "Filter and persist fictional entries",
    ],
    [
      "1.10 plus 2.20 → 3.30",
      "Filter retains matching totals",
      "Reject invalid/negative amount",
    ],
  ),
  make(
    "weather",
    "Fictional weather dashboard",
    '<p>Bundled fictional weather, not live forecasts.</p><button id="load">Load example city</button><p id="state" role="status">Ready</p>',
    `document.querySelector('#load').addEventListener('click',async()=>{const state=document.querySelector('#state');state.textContent='Loading…';try{const response=await fetch('/api/weather');if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();state.textContent=data.length?data[0].city+': '+data[0].temperature+' °C, '+data[0].condition:'No weather records'}catch(error){state.textContent='Could not load: '+error.message}});`,
    [
      "Async fetch and JSON",
      "Loading, empty and error states",
      "Explicit fictional data label",
    ],
    [
      "Success → Example City, 26 °C",
      "Empty scenario → no records",
      "Network and HTTP error → useful message",
    ],
  ),
  make(
    "products",
    "Product search and filtering",
    '<label>Search<input id="search"></label><label>Sort<select id="sort"><option value="asc">Price low to high</option><option value="desc">Price high to low</option></select></label><ul id="list"></ul><p id="status" role="status"></p>',
    `const products=[{name:'Notebook',price:45},{name:'Lamp',price:320},{name:'Pencil',price:12}];function render(){const q=document.querySelector('#search').value.toLowerCase(),dir=document.querySelector('#sort').value,shown=products.filter(p=>p.name.toLowerCase().includes(q)).sort((a,b)=>dir==='asc'?a.price-b.price:b.price-a.price),list=document.querySelector('#list');list.replaceChildren();for(const p of shown){const li=document.createElement('li');li.textContent=p.name+' — '+p.price;list.append(li)}document.querySelector('#status').textContent=shown.length+' products'}document.querySelector('#search').addEventListener('input',render);document.querySelector('#sort').addEventListener('change',render);render();`,
    [
      "Filter fictional products",
      "Numeric sort on a derived array",
      "Show result count and empty state",
    ],
    [
      "Ascending: Pencil, Notebook, Lamp",
      "Search xyz → 0 products",
      "Clear search restores all",
    ],
  ),
  make(
    "quiz",
    "Interactive quiz application",
    '<p id="question"></p><div id="options"></div><p id="feedback" role="status"></p><button id="next">Next question</button><button id="restart">Restart</button>',
    `const questions=[{q:'Which operator avoids coercion?',options:['===','=='],answer:0},{q:'Which method returns a mapped array?',options:['forEach','map'],answer:1},{q:'What does return do?',options:['Leaves the function with a value','Always prints a value'],answer:0}];let index=0,score=0,answered=false;function render(){const root=document.querySelector('#options');root.replaceChildren();document.querySelector('#feedback').textContent='';if(index>=questions.length){document.querySelector('#question').textContent='Score: '+score+' / '+questions.length;return}const q=questions[index];document.querySelector('#question').textContent=q.q;q.options.forEach((text,i)=>{const b=document.createElement('button');b.textContent=text;b.addEventListener('click',()=>{if(answered)return;answered=true;if(i===q.answer)score++;document.querySelector('#feedback').textContent=i===q.answer?'Correct':'Review: '+q.options[q.answer]});root.append(b)})}document.querySelector('#next').addEventListener('click',()=>{if(!answered)return;index++;answered=false;render()});document.querySelector('#restart').addEventListener('click',()=>{index=0;score=0;answered=false;render()});render();`,
    [
      "Question and result states",
      "Score each question once",
      "Restart safely",
    ],
    [
      "Repeated click does not double score",
      "Next requires an answer",
      "Restart clears score",
    ],
  ),
  make(
    "rps",
    "Rock-paper-scissors",
    '<p>Random computer choices for a local game.</p><div id="choices"></div><p id="result" role="status"></p>',
    `const choices=['rock','paper','scissors'];for(const choice of choices){const b=document.createElement('button');b.textContent=choice;b.addEventListener('click',()=>{const computer=choices[Math.floor(Math.random()*3)];const win={rock:'scissors',paper:'rock',scissors:'paper'};document.querySelector('#result').textContent='Computer: '+computer+'. '+(choice===computer?'Draw':win[choice]===computer?'You win':'Computer wins')});document.querySelector('#choices').append(b)}`,
    [
      "Three labeled actions",
      "All win/draw/lose relationships",
      "Randomness used only for a game",
    ],
    [
      "Matching choices draw",
      "Rock beats scissors; paper beats rock",
      "All buttons show a result",
    ],
  ),
  make(
    "memory",
    "Memory card game",
    '<p>Find three pairs. Choose two cards.</p><button id="restart">Shuffle & restart</button><div id="cards" class="grid"></div><p id="status" role="status"></p>',
    `let values=[],open=[],matched=new Set(),locked=false,generation=0;function render(){const root=document.querySelector('#cards');root.replaceChildren();values.forEach((value,i)=>{const b=document.createElement('button');b.textContent=matched.has(i)||open.includes(i)?value:'Card '+(i+1);b.setAttribute('aria-label',b.textContent);b.addEventListener('click',()=>{if(locked||matched.has(i)||open.includes(i))return;open.push(i);render();if(open.length===2){locked=true;const turn=generation;setTimeout(()=>{if(turn!==generation)return;if(values[open[0]]===values[open[1]]){matched.add(open[0]);matched.add(open[1])}open=[];locked=false;render()},600)}});root.append(b)});document.querySelector('#status').textContent=matched.size===6?'All pairs found':matched.size/2+' pairs found'}function reset(){generation++;values=['A','A','B','B','C','C'];for(let i=values.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[values[i],values[j]]=[values[j],values[i]]}open=[];matched=new Set();locked=false;render()}document.querySelector('#restart').addEventListener('click',reset);reset();`,
    [
      "Fisher–Yates shuffle",
      "Two-card turn lock",
      "Matched state and restart timer safety",
    ],
    [
      "Same card cannot match itself",
      "Third card blocked while comparing",
      "Restart during timeout starts clean",
    ],
  ),
  make(
    "directory",
    "Mock API user directory",
    '<label>Search users<input id="search"></label><button id="load">Search</button><button id="prev">Previous</button><button id="next">Next</button><ul id="list"></ul><p id="status" role="status"></p>',
    `let page=1,sequence=0;async function load(){const ticket=++sequence,status=document.querySelector('#status');status.textContent='Loading…';try{const q=document.querySelector('#search').value,response=await fetch('/api/users?q='+encodeURIComponent(q)+'&page='+page+'&limit=2');if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();if(ticket!==sequence)return;const list=document.querySelector('#list');list.replaceChildren();for(const user of data){const li=document.createElement('li');li.textContent=user.name+' — '+user.role;list.append(li)}status.textContent='Page '+page+': '+data.length+' fictional users'}catch(error){if(ticket===sequence)status.textContent=error.message}}document.querySelector('#load').addEventListener('click',()=>{page=1;load()});document.querySelector('#prev').addEventListener('click',()=>{page=Math.max(1,page-1);load()});document.querySelector('#next').addEventListener('click',()=>{page++;load()});load();`,
    [
      "Query parameters and pagination",
      "Ignore stale responses",
      "Loading/error/empty states",
    ],
    [
      "Page 1 → first two; page 2 → next two",
      "Search Asha → one",
      "Slow prior response cannot replace newer results",
    ],
  ),
  make(
    "estimator",
    "Illustrative project estimator",
    '<p>Fictional arithmetic exercise. Not certified engineering guidance or a quotation.</p><label>Length (m)<input id="length"></label><label>Width (m)<input id="width"></label><label>Illustrative rate per m²<input id="rate"></label><button id="estimate">Calculate example</button><p id="result" role="status"></p>',
    `function positive(id){const raw=document.querySelector('#'+id).value.trim(),n=Number(raw);if(!raw||!Number.isFinite(n)||n<=0)throw Error('Enter a positive '+id);return n}document.querySelector('#estimate').addEventListener('click',()=>{try{const area=positive('length')*positive('width'),total=area*positive('rate');document.querySelector('#result').textContent='Example area '+area.toFixed(2)+' m²; illustrative total '+total.toFixed(2)}catch(error){document.querySelector('#result').textContent=error.message}});`,
    [
      "Validate positive quantities and units",
      "Separate helper and interface handler",
      "Show educational limitations",
    ],
    [
      "2m × 3m at 10 → area 6, total 60",
      "Reject zero, negative and empty",
      "Never present output as certified design",
    ],
  ),
  make(
    "dashboard",
    "Fictional business dashboard",
    '<label>Minimum price<input id="minimum" value="0"></label><button id="load">Refresh dashboard</button><ul id="rows"></ul><p id="summary" role="status"></p>',
    `import { summarize } from './summary.js';\nconst minimum=document.querySelector('#minimum');minimum.value=localStorage.getItem('minimum')||'0';document.querySelector('#load').addEventListener('click',async()=>{const out=document.querySelector('#summary');out.textContent='Loading…';try{const min=Number(minimum.value);if(!minimum.value.trim()||!Number.isFinite(min)||min<0)throw Error('Enter a nonnegative minimum');localStorage.setItem('minimum',String(min));const response=await fetch('/api/products');if(!response.ok)throw Error('HTTP '+response.status);const shown=(await response.json()).filter(p=>p.price>=min),root=document.querySelector('#rows');root.replaceChildren();for(const row of shown){const li=document.createElement('li');li.textContent=row.name+': '+row.price;root.append(li)}out.textContent=summarize(shown)}catch(error){out.textContent=error.message}});`,
    [
      "Module separates aggregation from UI",
      "Mock data, numeric filters and summary",
      "Persist a non-sensitive preference",
    ],
    [
      "Minimum 0 → 3 products, total 377",
      "Minimum 100 → Lamp only",
      "HTTP error → error state",
    ],
  ),
  make(
    "capstone",
    "Independent inventory capstone",
    '<p>Fictional inventory; no accounts or database.</p><label>Product<input id="name"></label><label>Quantity<input id="quantity"></label><button id="add">Add stock record</button><label>Search<input id="search"></label><ul id="list"></ul><p id="status" role="status"></p>',
    `let stock=JSON.parse(localStorage.getItem('stock')||'[]');function render(){localStorage.setItem('stock',JSON.stringify(stock));const q=document.querySelector('#search').value.toLowerCase(),list=document.querySelector('#list');list.replaceChildren();for(const item of stock.filter(x=>x.name.toLowerCase().includes(q))){const li=document.createElement('li');li.textContent=item.name+': '+item.quantity;const b=document.createElement('button');b.textContent='Remove '+item.name;b.addEventListener('click',()=>{stock=stock.filter(x=>x!==item);render()});li.append(b);list.append(li)}document.querySelector('#status').textContent=stock.length+' records; '+stock.reduce((n,x)=>n+x.quantity,0)+' total units'}document.querySelector('#add').addEventListener('click',()=>{const name=document.querySelector('#name').value.trim(),raw=document.querySelector('#quantity').value.trim(),quantity=Number(raw);if(!name||!raw||!Number.isInteger(quantity)||quantity<0){document.querySelector('#status').textContent='Name and nonnegative integer quantity required';return}stock.push({name,quantity});render()});document.querySelector('#search').addEventListener('input',render);render();`,
    [
      "Independently plan a useful inventory interface",
      "Validate, search, remove, summarize and persist",
      "Review accessibility, failures and deployment",
    ],
    [
      "Two records summarize correctly",
      "Search and remove affect the intended record",
      "Save/reopen retains state; invalid quantity rejected",
    ],
  ),
];
applicationProjects.find((p) => p.id === "dashboard").files["js/summary.js"] =
  'export function summarize(rows) { return rows.length + " products; total " + rows.reduce((sum,p)=>sum+p.price,0); }';
export function projectStarter(project) {
  return {
    ...project.files,
    "js/app.js":
      "// Build independently from the project requirements.\n// Select elements, validate inputs, update state, render results.\n// Keep fictional data and explicit loading/error states.\n",
  };
}
