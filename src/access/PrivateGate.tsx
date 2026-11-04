import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {setCsrf,type Member} from './session';
import './access.css';
const MemberContext=createContext<Member|null>(null);
export const useMember=()=>useContext(MemberContext);
type SessionData={allowed?:boolean;code?:string;member?:Member;server_time?:string;csrf?:string};
let pending:Promise<{ok:boolean;data:SessionData}>|null=null;
function sessionRequest(){
 if(!pending)pending=(async()=>{const response=await fetch('/api/session',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(10000)});return {ok:response.ok,data:await response.json()};})().finally(()=>{pending=null;});
 return pending;
}
export default function PrivateGate({children}:{children:ReactNode}){
 const [member,setMember]=useState<Member|null>(null),[code,setCode]=useState('checking');
 useEffect(()=>{
  let alive=true,busy=false,expiry:ReturnType<typeof setTimeout>|undefined;
  const check=async()=>{
   if(busy)return;busy=true;
   try{
    const {ok,data}=await sessionRequest();if(!alive)return;
    clearTimeout(expiry);
    if(!ok||data.allowed!==true){setMember(null);setCode(data.code||'unavailable');return;}
    if(!data.member||!data.csrf||!data.server_time||!Number.isFinite(Date.parse(data.server_time))){setMember(null);setCode('unavailable');return;}
    setCsrf(data.csrf);setMember(data.member);setCode('');
    if(data.member.expires_at){const remaining=Date.parse(data.member.expires_at)-Date.parse(data.server_time);if(remaining<=2147483647)expiry=setTimeout(()=>{setMember(null);setCode('expired');void check();},Math.max(0,remaining));}
   }catch{if(alive){setMember(null);setCode('unavailable');}}
   finally{busy=false;}
  };
  void check();const interval=setInterval(check,15000);
  const visible=()=>{if(document.visibilityState==='visible')void check();};
  window.addEventListener('focus',check);window.addEventListener('pageshow',check);window.addEventListener('jslab-access-check',check);document.addEventListener('visibilitychange',visible);
  return()=>{alive=false;clearInterval(interval);clearTimeout(expiry);window.removeEventListener('focus',check);window.removeEventListener('pageshow',check);window.removeEventListener('jslab-access-check',check);document.removeEventListener('visibilitychange',visible);};
 },[]);
 if(!member){const title=({checking:'Checking your access…',expired:'Access Expired',revoked:'Access Revoked',suspended:'Access Suspended',pending:'Awaiting Approval',not_started:'Enrollment Has Not Started'} as Record<string,string>)[code]||'Access Unavailable';return <main className="access-screen"><h1>{title}</h1><p>{code==='checking'?'Please wait.':'Contact your teacher to check your enrollment. If the service is temporarily unavailable, please retry.'}</p>{code!=='checking'&&<><button className="button secondary" onClick={()=>location.reload()}>Try again</button> <a className="button secondary" href="/cdn-cgi/access/logout">Sign out</a></>}</main>;}
 return <MemberContext.Provider value={member}>{children}</MemberContext.Provider>;
}
export function AccountBar(){const member=useMember();if(!member)return null;const days=member.expires_at?Math.max(0,Math.ceil((Date.parse(member.expires_at)-Date.now())/86400000)):null;return <div className="access-account"><div><strong>{member.name}</strong>{member.expires_at&&<span>Access until {new Date(member.expires_at).toLocaleDateString()} · {days} days remaining{days!==null&&days<=7?' · Your access ends soon. Ask your teacher about an extension.':''}</span>}</div><div>{member.role==='admin'&&<a className="button secondary" href="#students">Student Management</a>}<a className="button secondary" href="/cdn-cgi/access/logout">Sign out</a></div></div>;}
