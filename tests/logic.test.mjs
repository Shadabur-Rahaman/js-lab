import test from 'node:test';
import assert from 'node:assert/strict';
import { loopFrames, grade, calculate, discounted, readProgress } from '../src/utils/logic.mjs';
import { lessons, arena } from '../src/data/lessons.ts';
import { projects } from '../src/data/projects.ts';
import vm from 'node:vm';

test('loop trace follows initialization, check, print, update, and final false check',()=>{
 const frames=loopFrames(5);
 assert.equal(frames[0].phase,'initialize');
 assert.deepEqual(frames.filter(f=>f.phase==='body').map(f=>f.i),[1,2,3,4,5]);
 assert.deepEqual(frames.slice(0,5).map(f=>f.phase),['initialize','condition','body','update','condition']);
 assert.equal(frames[3].i,2);
 assert.equal(frames[3].condition,null);
 assert.equal(frames.at(-2).condition,false);
 assert.equal(frames.at(-1).i,6);
 assert.deepEqual(frames.at(-1).output,[1,2,3,4,5]);
 assert.equal(frames.at(-1).iterations,5);
 assert.equal(loopFrames(999).at(-1).iterations,20);
});
test('grading validates inputs and every threshold',()=>{
 for(const [input,expected] of [[-1,'Invalid'],[NaN,'Invalid'],[101,'Invalid'],[0,'Retry'],[39,'Retry'],[40,'D'],[59,'D'],[60,'C'],[74,'C'],[75,'B'],[89,'B'],[90,'A'],[100,'A']])assert.equal(grade(input),expected);
});
test('project arithmetic and discounts validate boundaries',()=>{
 assert.equal(calculate(24,6,'+'),30);assert.equal(calculate(24,6,'-'),18);assert.equal(calculate(24,6,'*'),144);assert.equal(calculate(24,6,'/'),4);
 assert.throws(()=>calculate(3,0,'/'));assert.throws(()=>calculate(NaN,2,'+'));
 assert.equal(discounted(999),999);assert.equal(discounted(1000),900);assert.throws(()=>discounted(-1));
});
test('progress recovers from corrupt storage and validates its schema',()=>{
 assert.deepEqual(readProgress('nope'),{completed:[],answers:{},current:0});
 assert.deepEqual(readProgress('{"completed":[1,1,7,"2"],"answers":{"1-a":true,"bad":7},"current":99}'),{completed:[1],answers:{'1-a':true},current:0});
 const p={completed:[1,2],answers:{'1-a':true},current:3};assert.deepEqual(readProgress(JSON.stringify(p)),p);
});
function execute(code){
 const logs=[];const message={textContent:''};const context=vm.createContext({console:{log:(...a)=>logs.push(a),warn:()=>{},error:()=>{}},prompt:()=> '20',alert:()=>{},document:{getElementById:()=>message,write:()=>{}}});
 vm.runInContext(code,context,{timeout:500});return logs;
}
test('all lesson examples and reference solutions execute successfully',()=>{
 for(const l of lessons){assert.ok(l.examples.length>=3);assert.equal(l.quiz.length,3);for(const e of l.examples)assert.doesNotThrow(()=>execute(e.code),`Lesson ${l.id}: ${e.title}`);for(const section of l.sections)if(section.code&&!section.code.startsWith('<script'))assert.doesNotThrow(()=>execute(section.code),`Lesson ${l.id}: ${section.title}`);assert.doesNotThrow(()=>execute(l.challenge.solution));assert.doesNotThrow(()=>execute(l.debug.solution));assert.doesNotThrow(()=>execute(l.predict.code));}
 for(const p of projects)assert.doesNotThrow(()=>execute(p.solution),p.title);
});
test('question answer indices and identifiers are valid and unique',()=>{
 const questions=[...arena,...lessons.flatMap(l=>[l.predict,...l.quiz])];assert.equal(arena.length,10);assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);for(const q of questions){assert.ok(q.answer>=0&&q.answer<q.choices.length);assert.ok(q.explanation.length>20);}
});
