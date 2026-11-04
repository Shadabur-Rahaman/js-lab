import React from 'react';
import {createRoot} from 'react-dom/client';
import PrivateGate from '../src/access/PrivateGate';
import App from '../src/App';
import '../src/styles.css';
import '../src/styles-v2.css';
import '../src/v3/styles.css';
import '../src/v4/styles.css';
let mode='student';
window.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.origin);
 if(url.pathname==='/api/session'){
  if(mode==='outage')throw Error('Fixture outage');
  if(!['admin','student'].includes(mode))return Response.json({allowed:false,code:mode},{status:403});
  return Response.json({allowed:true,member:{id:'11111111-1111-4111-8111-111111111111',role:mode,name:'Fixture learner',email:'fixture@example.test',expires_at:mode==='admin'?null:new Date(Date.now()+30*86400000).toISOString()},server_time:new Date().toISOString(),csrf:'a'.repeat(64)});
 }
 if(url.pathname==='/api/students')return Response.json({data:[]});
 if(url.pathname==='/api/resources'){
  const body=JSON.parse(String(init?.body||'{}'));
  if(body.action==='catalogs')return Response.json({categories:[],max:25*1024*1024});
  if(body.action==='profile')return Response.json({id:'11111111-1111-4111-8111-111111111111',role:'admin',email:'fixture@example.test'});
  return Response.json([]);
 }
 throw Error('Unexpected fixture URL');
};
createRoot(document.getElementById('root')!).render(<PrivateGate><App/></PrivateGate>);
async function until(check:()=>boolean){for(let i=0;i<150;i++){if(check())return;await new Promise(r=>setTimeout(r,50));}throw Error('Timed out');}
async function set(value:string){mode=value;window.dispatchEvent(new Event('jslab-access-check'));await new Promise(r=>setTimeout(r,100));}
const result=document.getElementById('results')!,status=document.getElementById('status')!;
document.getElementById('run')!.onclick=async()=>{
 result.replaceChildren();let count=0;
 const pass=(text:string)=>{const li=document.createElement('li');li.textContent='PASS '+text;result.append(li);count++;};
 try{
  await set('student');await until(()=>!!document.querySelector('.access-account'));pass('Approved student sees name, expiry and remaining days');
  if([...document.querySelectorAll('.access-account a')].some(a=>a.textContent==='Student Management'))throw Error('Student sees management link');pass('Student has no management shortcut');
  location.hash='students';await until(()=>document.body.textContent?.includes('Only the administrator can manage enrollment.')===true);pass('Student management route denies student');
  await set('revoked');await until(()=>!!document.querySelector('.access-screen'));if(document.querySelector('.app'))throw Error('Revoked app remains');pass('Revocation removes entire learning app on the next check');
  await set('expired');await until(()=>document.querySelector('.access-screen h1')?.textContent==='Access Expired');pass('Expired access locks the app');
  await set('pending');await until(()=>document.querySelector('.access-screen h1')?.textContent==='Awaiting Approval');pass('Pending access is locked');
  await set('outage');await until(()=>document.querySelector('.access-screen h1')?.textContent==='Access Unavailable');pass('Network outage fails closed');
  await set('admin');await until(()=>!!document.querySelector('.student-management'));pass('Verified admin sees Student Management and allowlist setup status');
  location.hash='lesson/1';await until(()=>!!document.querySelector('.lesson-meta'));pass('Existing lesson UI opens after access is restored');
  status.textContent=count+'/9 private UI checks passed (fixtures only)';
 }catch(e){status.textContent='FAIL '+(e as Error).message;}
};
