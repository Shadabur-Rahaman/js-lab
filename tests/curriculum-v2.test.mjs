import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {lessons,arena} from '../src/data/lessons.ts';
import {concepts} from '../src/data/curriculum.ts';
import {appliedProjects} from '../src/data/appliedProjects.ts';
import {readProgress} from '../src/utils/logic.mjs';
import {displayValue} from '../src/utils/displayValue.mjs';
import {arrayMethod,copyExperiment,gameDecision,incrementFrames,iterationChoices,iterationCode,iterationFrames,jsonCompatibleText,literalSource,readLiteral,transformFrames} from '../src/utils/curriculum.mjs';
const legacy=JSON.parse(fs.readFileSync(new URL('./legacy-curriculum.json',import.meta.url),'utf8'));
function execute(code){const logs=[];let error;const context=vm.createContext({structuredClone,console:{log:(...args)=>logs.push(args.map(displayValue).join(' ')),warn:()=>{},error:()=>{}},prompt:()=> '20',alert:()=>{},document:{getElementById:()=>({textContent:''}),write:()=>{}}});try{vm.runInContext('(function(){\n'+code+'\n})();',context,{timeout:700});}catch(e){error=e.name}return {logs,error};}

test('published chapters, examples, assessment IDs, and original arena remain intact',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(lessons.slice(0,6))),legacy.lessons);
 assert.deepEqual(JSON.parse(JSON.stringify(arena)),legacy.arena);
 assert.deepEqual(lessons.map(l=>l.id),[1,2,3,4,5,6,7,8,9]);
 assert.deepEqual(lessons.slice(6).map(l=>l.short),['Functions','Arrays','Objects']);
});
test('legacy progress migrates additively and V2 progress survives a round trip',()=>{
 const old={completed:[1,2,3,4,5,6],answers:{'1-a':true,'arena-10':true,'3-p':false},current:6};
 assert.deepEqual(readProgress(JSON.stringify(old)),{...old,concepts:[]});
 const next={...old,completed:[...old.completed,7,8,9],current:9,concepts:['scope','array-methods'],answers:{...old.answers,'v2-copy-p2':true}};
 assert.deepEqual(readProgress(JSON.stringify(next)),next);
});
test('every expanded concept and applied project has an executable solution',()=>{
 assert.ok(concepts.length>=30);assert.equal(appliedProjects.length,15);
 for(const c of concepts){assert.ok(c.examples.length>=2,c.id);assert.ok(c.predictions.length>=2,c.id);for(const example of c.examples)assert.equal(execute(example.code).error,undefined,c.id+': '+example.title);assert.equal(execute(c.debug.solution).error,undefined,c.id+' debug solution');assert.equal(execute(c.activity.solution).error,undefined,c.id+' activity');}
 for(const p of appliedProjects)assert.equal(execute(p.solution).error,undefined,p.id);
});
test('all output predictions match actual function-wrapper JavaScript, including errors',()=>{
 for(const c of concepts)for(const q of c.predictions){const actual=execute(q.code);assert.deepEqual(actual.logs,q.expected.logs,q.id+' output');assert.equal(actual.error,q.expected.error,q.id+' error');assert.ok(q.choices[q.answer],q.id);}
 const ids=[...lessons.flatMap(l=>[l.predict,...l.quiz]),...arena,...concepts.flatMap(c=>c.predictions)].map(q=>q.id);
 assert.equal(new Set(ids).size,ids.length);
});
test('extended iteration traces agree with executing their displayed source',()=>{
 for(const kind of iterationChoices)for(const n of [0,1,3,10]){
  const frames=iterationFrames(kind,n);const last=frames.at(-1);const actual=execute(iterationCode(kind,n));
  assert.equal(actual.error,undefined,kind);assert.deepEqual(last.output,actual.logs,kind+' limit '+n);assert.equal(last.iterations,actual.logs.length);
  if(kind==='forEach')assert.equal(last.condition,null);else assert.equal(last.condition,false);
 }
});
test('array method visualizations show exact return values, mutations, and references',()=>{
 let result=arrayMethod('push',[1,2],3);assert.equal(result.returned,3);assert.deepEqual(result.after,[1,2,3]);
 result=arrayMethod('pop',[]);assert.equal(result.returned,undefined);assert.deepEqual(result.after,[]);
 result=arrayMethod('shift',[1,2]);assert.equal(result.returned,1);assert.deepEqual(result.after,[2]);
 result=arrayMethod('unshift',[2],1);assert.equal(result.returned,2);assert.deepEqual(result.after,[1,2]);
 result=arrayMethod('splice',[1,2,3],9,1,1);assert.deepEqual(result.returned,[2]);assert.deepEqual(result.after,[1,9,3]);
 result=arrayMethod('slice',[1,2,3],9,0,2);assert.deepEqual(result.returned,[1,2]);assert.deepEqual(result.after,[1,2,3]);assert.equal(result.mutates,false);
 result=arrayMethod('reverse',[1,2,3]);assert.deepEqual(result.returned,[3,2,1]);assert.equal(result.sameReference,true);
 assert.deepEqual(arrayMethod('sort',[2,10,1]).after,[1,10,2]);assert.deepEqual(arrayMethod('numeric sort',[2,10,1]).after,[1,2,10]);
});
test('map/filter/reduce traces and nested-copy diagrams use real collection semantics',()=>{
 assert.deepEqual(transformFrames('map',[1,2,3]).at(-1).output,[2,4,6]);
 assert.deepEqual(transformFrames('filter',[1,2,3,4],3).at(-1).output,[3,4]);
 assert.equal(transformFrames('reduce',[1,2,3]).at(-1).total,6);
 assert.equal(transformFrames('reduce',[]).at(-1).total,0);
 for(const mode of ['assignment','spread','Object.assign','structuredClone']){const result=copyExperiment(mode);assert.equal(result.same,mode==='assignment');assert.equal(result.nestedSame,mode!=='structuredClone');assert.equal(result.original.name,mode==='assignment'?'Mira':'Asha');assert.equal(result.original.address.city,mode==='structuredClone'?'Pune':'Delhi');}
});
test('safe value parser rejects code and serializer preserves advanced values and cycles',()=>{
 assert.throws(()=>readLiteral('(()=>42)()'));assert.equal(readLiteral('12n'),12n);assert.equal(typeof readLiteral('Symbol("id")'),'symbol');
 assert.equal(displayValue([undefined,NaN,1n]),'[undefined, NaN, 1n]');
 assert.equal(displayValue({a:undefined,n:2n}),'{"a": undefined, "n": 2n}');
 const circular={};circular.self=circular;assert.match(displayValue(circular),/Circular/);
 const serializer=vm.runInNewContext('('+displayValue.toString()+')');assert.equal(serializer([1n,undefined]),'[1n, undefined]');
 assert.throws(()=>jsonCompatibleText([undefined]));assert.throws(()=>jsonCompatibleText([12n]));assert.throws(()=>jsonCompatibleText([Infinity]));
 assert.equal(jsonCompatibleText([1,'Asha']),'[1,"Asha"]');
 assert.equal(execute('console.log(typeof '+literalSource(Symbol('id'))+');').logs[0],'symbol');
});
test('prefix/postfix and all nine rock-paper-scissors outcomes are correct',()=>{
 assert.deepEqual(incrementFrames(5,false).at(-1),{phase:'update',stored:6,returned:5,detail:'Update the binding; the expression result remains the old value.'});
 assert.equal(incrementFrames(5,true).at(-1).returned,6);
 const moves=['rock','paper','scissors'];for(const p of moves)for(const c of moves){const result=gameDecision(p,c);if(p===c)assert.equal(result,'Tie');else assert.notEqual(result,gameDecision(c,p));}
 assert.equal(gameDecision('rock','scissors'),'You win');
});
