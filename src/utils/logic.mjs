import { LESSON_IDS } from '../data/catalog.mjs';
export function grade(marks) {
  if (!Number.isFinite(marks) || marks < 0 || marks > 100) return 'Invalid';
  return marks >= 90 ? 'A' : marks >= 75 ? 'B' : marks >= 60 ? 'C' : marks >= 40 ? 'D' : 'Retry';
}
export function loopFrames(limit = 5) {
  const n = Math.max(1, Math.min(20, Math.floor(limit)));
  const frames = [{phase:'initialize',i:1,line:0,condition:null,output:[],iterations:0}];
  const output = [];
  for (let i = 1; i <= n + 1; i++) {
    frames.push({phase:'condition',i,line:0,condition:i<=n,output:[...output],iterations:output.length});
    if (i > n) { frames.push({phase:'done',i,line:-1,condition:false,output:[...output],iterations:output.length}); break; }
    output.push(i);
    frames.push({phase:'body',i,line:1,condition:true,output:[...output],iterations:output.length});
    frames.push({phase:'update',i:i+1,line:0,condition:null,output:[...output],iterations:output.length});
  }
  return frames;
}
export function calculate(a, b, op) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error('Enter two valid numbers.');
  if (op === '/' && b === 0) throw new Error('Choose a nonzero divisor.');
  return op === '+' ? a+b : op === '-' ? a-b : op === '*' ? a*b : a/b;
}
export function discounted(total) {
  if (!Number.isFinite(total) || total < 0) throw new Error('Enter a total of zero or more.');
  return total >= 1000 ? total * 0.9 : total;
}
export function readProgress(raw) {
  const fallback = {completed:[],answers:{},current:0,concepts:[]};
  try {
    const p = JSON.parse(raw || 'null');
    if (!p || typeof p !== 'object') return fallback;
    const answers = {};
    if (p.answers && typeof p.answers === 'object') for (const [key,value] of Object.entries(p.answers)) if (typeof value === 'boolean') answers[key] = value;
    return {completed:Array.isArray(p.completed) ? [...new Set(p.completed.filter(n => LESSON_IDS.includes(n)))] : [], answers, current:p.current===0||LESSON_IDS.includes(p.current) ? p.current : 0, concepts:Array.isArray(p.concepts)?[...new Set(p.concepts.filter(id=>typeof id==='string'&&id.length<120))]:[]};
  } catch { return fallback; }
}
