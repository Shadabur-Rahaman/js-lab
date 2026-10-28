import { useState } from 'react';
import { readProgress } from '../utils/logic.mjs';
export type Progress = {completed:number[];answers:Record<string,boolean>;current:number};
const KEY='js-lab-progress-v1';
export function useProgress(){
 const [progress,setProgress]=useState<Progress>(()=>{try{return readProgress(localStorage.getItem(KEY)) as Progress}catch{return {completed:[],answers:{},current:0}}});
 const [storageError,setStorageError]=useState(false);
 function update(fn:(p:Progress)=>Progress){setProgress(p=>{const next=fn(p);try{localStorage.setItem(KEY,JSON.stringify(next));setStorageError(false)}catch{setStorageError(true)}return next})}
 return {progress,storageError,complete:(id:number)=>update(p=>({...p,completed:[...new Set([...p.completed,id])]})),answer:(id:string,correct:boolean)=>update(p=>({...p,answers:{...p.answers,[id]:correct}})),navigate:(id:number)=>update(p=>({...p,current:id})),reset:()=>update(()=>({completed:[],answers:{},current:0}))};
}
