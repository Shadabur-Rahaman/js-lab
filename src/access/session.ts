export const privateAccess = import.meta.env.VITE_PRIVATE_ACCESS === 'true';
export type Member = {id:string;name:string;email:string;role:'admin'|'student';expires_at:string|null};
let csrf = '';
export function setCsrf(value:string){csrf=value;}
export async function privateApi<T>(path:string,body:unknown):Promise<T>{
 const result=await fetch(path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Jslab-Csrf':csrf},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 const data=await result.json().catch(()=>({error:'Service unavailable.'}));
 if(result.status===401||result.status===403)window.dispatchEvent(new Event('jslab-access-check'));
 if(!result.ok)throw Error(data.code==='invalid_or_changed_record'?'Check the details, email uniqueness and dates, then refresh and retry.':data.error||'The operation failed.');
 return data as T;
}
export function uploadHeaders(){return {'X-Jslab-Csrf':csrf};}
