import { useState } from 'react';
import { readProgress } from '../utils/logic.mjs';
export type Progress = {completed:number[];answers:Record<string,boolean>;current:number;concepts:string[]};
const KEY='js-lab-progress-v1';
export function useProgress(){
 const [progress,setProgress]=useState<Progress>(()=>{try{return readProgress(localStorage.getItem(KEY)) as Progress}catch{return {completed:[],answers:{},current:0,concepts:[]}}});
 const [storageError,setStorageError]=useState(false);
 function update(fn:(p:Progress)=>Progress){setProgress(p=>{const next=fn(p);try{localStorage.setItem(KEY,JSON.stringify(next));setStorageError(false)}catch{setStorageError(true)}return next})}
 return {progress,storageError,complete:(id:number)=>update(p=>({...p,completed:[...new Set([...p.completed,id])]})),completeConcept:(id:string)=>update(p=>({...p,concepts:[...new Set([...(p.concepts||[]),id])]})),answer:(id:string,correct:boolean)=>update(p=>({...p,answers:{...p.answers,[id]:correct}})),navigate:(id:number)=>update(p=>({...p,current:id})),importProgress:(input:Progress)=>update(p=>{const incoming=readProgress(JSON.stringify(input)) as Progress;return {...p,completed:[...new Set([...p.completed,...incoming.completed])],concepts:[...new Set([...p.concepts,...incoming.concepts])],answers:Object.fromEntries([...new Set([...Object.keys(p.answers),...Object.keys(incoming.answers)])].map(k=>[k,!!p.answers[k]||!!incoming.answers[k]]))}}),reset:()=>update(()=>({completed:[],answers:{},current:0,concepts:[]}))};
}
