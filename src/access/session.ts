import {protectedJson} from './http.mjs';
export const privateAccess = import.meta.env?.VITE_PRIVATE_ACCESS === 'true';
export type Member = {id:string;name:string;email:string;role:'admin'|'student';expires_at:string|null};
let csrf = '';
export function setCsrf(value:string){csrf=value;}
export async function privateApi<T>(path:string,body:unknown):Promise<T>{
 const result=await fetch(path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Jslab-Csrf':csrf},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 return protectedJson(result,()=>window.dispatchEvent(new Event('jslab-access-check'))) as Promise<T>;
}
export function uploadHeaders(){return {'X-Jslab-Csrf':csrf};}
