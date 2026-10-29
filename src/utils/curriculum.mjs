import { displayValue } from './displayValue.mjs';
// These are bounded, trusted teaching models. Student-written code only runs in sandbox.ts.
export function jsonCompatibleText(value) {
  return JSON.stringify(value,(_key,v)=>{
    if (typeof v==='undefined'||typeof v==='bigint'||typeof v==='symbol'||typeof v==='function'||(typeof v==='number'&&!Number.isFinite(v))) throw new Error('This value cannot round-trip through the JSON input without losing information. Use the playground for this value.');
    return v;
  });
}
export function literalSource(value) {return typeof value==='string'?JSON.stringify(value):typeof value==='symbol'?'Symbol('+JSON.stringify(value.description??'')+')':displayValue(value);}
export function readLiteral(text) {
  const source = text.trim();
  if (source.length > 3000) throw new Error('Keep the value under 3,000 characters.');
  const fixed = { undefined:undefined, NaN:NaN, Infinity:Infinity, '-Infinity':-Infinity, '-0':-0 };
  if (Object.hasOwn(fixed,source)) return fixed[source];
  if (/^-?\d+n$/.test(source)) return BigInt(source.slice(0,-1));
  const symbol = /^Symbol\("([^"\n]{0,60})"\)$/.exec(source);
  if (symbol) return Symbol(symbol[1]);
  try { return JSON.parse(source); } catch { throw new Error('Use a JSON value (double-quoted text, number, array, or object), undefined, NaN, Infinity, a BigInt such as 12n, or Symbol("id"). Expressions run in the playground below.'); }
}
export function inspectValue(value) {
  return { type:typeof value, array:Array.isArray(value), null:value===null, nan:typeof value==='number'&&Number.isNaN(value), truthy:Boolean(value) };
}
export const declarationRules = [
 {kind:'var',initializer:'Optional; begins as undefined',reassign:'Yes',redeclare:'Yes, with var',scope:'Function / classic-script context',early:'undefined before assignment'},
 {kind:'let',initializer:'Optional; undefined when declaration executes',reassign:'Yes',redeclare:'No in the same scope',scope:'Block',early:'ReferenceError in TDZ'},
 {kind:'const',initializer:'Required in an ordinary declaration',reassign:'No',redeclare:'No in the same scope',scope:'Block',early:'ReferenceError in TDZ'}
];
export function incrementFrames(start=5,prefix=false) {
  return [
   {phase:'read',stored:start,returned:'Not yet',detail:'Read the current numeric value.'},
   {phase:prefix?'update':'return old',stored:prefix?start+1:start,returned:prefix?'Not yet':start,detail:prefix?'Prefix updates the stored value first.':'Postfix selects the old value as the expression result.'},
   {phase:prefix?'return new':'update',stored:start+1,returned:prefix?start+1:start,detail:prefix?'Return the new value.':'Update the binding; the expression result remains the old value.'}
  ];
}
export function arrayMethod(method,source,insert=9,start=1,count=1) {
  if(!Array.isArray(source)||source.length>20)throw new Error('Use an array with at most 20 elements.');
  const working=structuredClone(source),before=structuredClone(source);
  let returned;
  switch(method){
   case 'push':returned=working.push(insert);break;
   case 'pop':returned=working.pop();break;
   case 'shift':returned=working.shift();break;
   case 'unshift':returned=working.unshift(insert);break;
   case 'splice':returned=working.splice(start,count,insert);break;
   case 'slice':returned=working.slice(start,count);break;
   case 'reverse':returned=working.reverse();break;
   case 'sort':returned=working.sort();break;
   case 'numeric sort':returned=working.sort((a,b)=>Number(a)-Number(b));break;
   default:throw new Error('Select a supported method.');
  }
  return {before,after:working,returned,sameReference:returned===working,mutates:!['slice'].includes(method),changed:JSON.stringify(before)!==JSON.stringify(working)};
}
export function transformFrames(method,values,threshold=3) {
  if(!Array.isArray(values)||values.length>20||!values.every(Number.isFinite))throw new Error('Use up to 20 finite numbers.');
  let total=0;const output=[];
  const frames=[{phase:'initialize',index:-1,value:null,result:null,total:0,output:[],detail:'Initialize output and accumulator before visiting elements.'}];
  values.forEach((value,index)=>{
   const result=method==='map'?value*2:method==='filter'?value>=threshold:total+value;
   if(method==='map')output.push(result);
   else if(method==='filter'){if(result)output.push(value);}
   else total=result;
   frames.push({phase:'body',index,value,result,total,output:[...output],detail:method==='reduce'?`${total-value} + ${value} → ${total}`:method==='map'?`${value} × 2 → ${result}`:`${value} >= ${threshold} → ${result}; ${result?'keep':'skip'}`});
  });
  frames.push({...frames.at(-1),phase:'done',detail:'Traversal complete. The source array was not mutated.'});
  return frames;
}
export const iterationChoices=['for','while','do…while','for…of','for…in','forEach','Object.entries'];
export function iterationFrames(kind,limit=3) {
  const n=Math.max(0,Math.min(10,Math.floor(limit)));
  const values=['Apple','Mango','Banana','Pear','Orange','Plum','Kiwi','Peach','Lime','Fig'].slice(0,n);
  const output=[],frames=[];
  const push=(phase,i,condition,element,property,detail)=>frames.push({phase,i,condition,element,property,iterations:output.length,output:[...output],detail});
  push('initialize',1,null,'—','—','Set up the traversal once.');
  if(['for','while','do…while'].includes(kind)) {
   let i=1;
   if(kind==='do…while'){
    do {output.push(String(i));push('body',i,null,i,'—','The body runs before the first check.');i++;push('update',i,null,'—','—','Increment i.');push('condition',i,i<=n,'—','—',`Check ${i} <= ${n}.`);}while(i<=n);
   } else {
    while(true){push('condition',i,i<=n,'—','—',`Check ${i} <= ${n}.`);if(i>n)break;output.push(String(i));push('body',i,true,i,'—','Print the counter.');i++;push('update',i,null,'—','—','Increment i before the next check.');}
   }
   push('done',i,false,'—','—','The false condition ends this loop.');
  } else {
   const entries=kind==='Object.entries'?Object.entries({name:'Asha',marks:82}):values.map((v,i)=>[String(i),v]);
   entries.forEach(([key,value],index)=>{
    push('condition',index,kind==='forEach'?null:true,value,key,kind==='forEach'?'The method calls the callback for this present element.':'The iterator / key enumeration has another entry.');
    output.push(kind==='for…in'?key:kind==='Object.entries'?`${key}: ${value}`:String(value));
    push('body',index,kind==='forEach'?null:true,value,key,'Run the body or callback for this item.');
   });
   push('done',entries.length,kind==='forEach'?null:false,'—','—',kind==='forEach'?'forEach returns undefined after the final callback.':'No more items. Traversal complete.');
  }
  return frames;
}
export function iterationCode(kind,n=3) {
 const fruit='const fruits = '+JSON.stringify(['Apple','Mango','Banana','Pear','Orange','Plum','Kiwi','Peach','Lime','Fig'].slice(0,n))+';\n';
 return kind==='for'?`for (let i = 1; i <= ${n}; i++) {\n console.log(i);\n}`:kind==='while'?`let i = 1;\nwhile (i <= ${n}) {\n console.log(i);\n i++;\n}`:kind==='do…while'?`let i = 1;\ndo {\n console.log(i);\n i++;\n} while (i <= ${n});`:kind==='for…of'?fruit+'for (const fruit of fruits) console.log(fruit);':kind==='for…in'?fruit+'for (const key in fruits) console.log(key);':kind==='forEach'?fruit+'fruits.forEach((fruit, index) => console.log(fruit));':'const student = { name: "Asha", marks: 82 };\nfor (const [key, value] of Object.entries(student)) {\n console.log(key + ": " + value);\n}';
}
export function copyExperiment(mode) {
  const original={name:'Asha',address:{city:'Pune'}};
  const copy=mode==='assignment'?original:mode==='spread'?{...original}:mode==='Object.assign'?Object.assign({},original):structuredClone(original);
  copy.name='Mira';copy.address.city='Delhi';
  return {original,copy,same:original===copy,nestedSame:original.address===copy.address};
}
export function gameDecision(player,computer) {
 if(!['rock','paper','scissors'].includes(player)||!['rock','paper','scissors'].includes(computer))throw new Error('Select a valid move.');
 return player===computer?'Tie':[['rock','scissors'],['paper','rock'],['scissors','paper']].some(([a,b])=>a===player&&b===computer)?'You win':'Computer wins';
}
