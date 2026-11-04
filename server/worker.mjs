import {createClient} from '@supabase/supabase-js';
import {AccessError,configuration,verifyIdentity,csrf,jsonBody,secured,denial} from './access.mjs';
import {resourceAction,uploadBytes,downloadFile} from './resources.mjs';

export function createHandler(overrides={}) {
 return {async fetch(request,env) {
  try {
   const config=configuration(env,request), url=new URL(request.url);
   if(request.headers.get('sec-fetch-site')==='cross-site')throw new AccessError('origin_denied');
   const identity=await (overrides.verifyIdentity||verifyIdentity)(request,config);
   const db=overrides.db||createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(10000)})}});
   const {data:permission,error}=await db.rpc('enrollment_authorize',{verified_email:identity.email,verified_subject:identity.subject});
   if(error||!permission)throw new AccessError('service_unavailable',503);
   if(permission.allowed!==true)throw new AccessError(permission.code||'unapproved');
   const member=permission.member;
   if(!member?.id || !['student','admin'].includes(member.role))throw new AccessError('service_unavailable',503);
   const {data:allowed,error:rateError}=await db.rpc('resource_rate',{key_value:'private:'+member.id,maximum:1200,seconds:60});
   if(rateError)throw new AccessError('service_unavailable',503);
   if(!allowed)throw new AccessError('rate_limited',429);
   if (!['GET','HEAD','POST'].includes(request.method)) throw new AccessError('method_denied',405);
   if (request.method==='POST')csrf(request);
   let result;
   if(url.pathname==='/api/session' && request.method==='GET') {
    const token=request.headers.get('cookie')?.match(/(?:^|;\s*)__Host-jslab-csrf=([a-f0-9]{64})(?:;|$)/)?.[1] || [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');
    result=Response.json({...permission,csrf:token},{headers:{'Set-Cookie':`__Host-jslab-csrf=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`}});
   } else if(url.pathname==='/api/students' && request.method==='POST') {
    if(member.role!=='admin')throw new AccessError('administrator_required');
    const body=await jsonBody(request);
    if(!['list','audit','create','approve','extend','suspend','revoke','reject'].includes(body.action))throw new AccessError('invalid_request',400);
    const {data,error}=await db.rpc('enrollment_command',{admin_id:member.id,command:body.action,body:body.body||{}});
    if(error)throw new AccessError(['22023','40001','23505'].includes(error.code)?'invalid_or_changed_record':'service_unavailable',error.code==='42501'?403:400);
    result=Response.json({data,allowlist_status:'manual_configuration_required',note:'Enrollment is enforced here. Also add approved emails to the Cloudflare Access allow policy.'});
   } else if(url.pathname==='/api/resources' && request.method==='POST') {
    result=await resourceAction(await jsonBody(request),db,member);
   } else if(/^\/api\/files\/[a-f0-9-]{36}$/.test(url.pathname) && ['GET','HEAD'].includes(request.method)) {
    result=await downloadFile(url.pathname.split('/').at(-1),url.searchParams.get('preview')==='1',db,member,request.method==='HEAD');
   } else if(/^\/api\/uploads\/[a-f0-9-]{36}$/.test(url.pathname) && request.method==='POST') {
    if(member.role!=='admin')throw new AccessError('administrator_required');
    result=await uploadBytes(request,url.pathname.split('/').at(-1),db,member);
   } else if(url.pathname.startsWith('/api/'))throw new AccessError('not_found',404);
   else {
    if(!['GET','HEAD'].includes(request.method))throw new AccessError('method_denied',405);
    // ASSETS is called only after fresh JWT and database authorization. No cache
    // or static bypass path, including index, chunks, PDF worker/fonts and WASM.
    result=await env.ASSETS.fetch(request);
   }
   return secured(result);
  }catch(e){return secured(denial(e,request));}
 }};
}
export default createHandler();
