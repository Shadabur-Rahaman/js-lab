import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT,createLocalJWKSet,exportJWK} from 'jose';
import {verifyIdentity,configuration,csrf,jsonBody,secured} from '../server/access.mjs';
import {createHandler} from '../server/worker.mjs';
const env={ACCESS_TEAM_DOMAIN:'https://classroom.cloudflareaccess.com',ACCESS_AUD:'real-app-audience',PROTECTED_HOSTS:'js-lab-private.pages.dev',SUPABASE_URL:'https://dacvuxwlowdgrdhukryj.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only-not-a-key'};
const origin='https://js-lab-private.pages.dev';
const {privateKey,publicKey}=await generateKeyPair('RS256');
const jwk=await exportJWK(publicKey);jwk.kid='test';
const keySet=createLocalJWKSet({keys:[jwk]});
const sign=(changes={},key=privateKey)=>new SignJWT({email:'student@example.test',...changes}).setProtectedHeader({alg:'RS256',kid:'test'}).setSubject('verified-subject').setIssuer(env.ACCESS_TEAM_DOMAIN).setAudience(env.ACCESS_AUD).setIssuedAt().setExpirationTime('5m').sign(key);
const request=(path='/',init={})=>new Request(origin+path,init);
test('Access validates RSA signature, issuer, audience, expiry, required claims and email',async()=>{
 const token=await sign();assert.equal((await verifyIdentity(request('/',{headers:{'Cf-Access-Jwt-Assertion':token}}),{issuer:env.ACCESS_TEAM_DOMAIN,audience:[env.ACCESS_AUD]},keySet)).email,'student@example.test');
 const bad=[];
 bad.push(new SignJWT({email:'student@example.test'}).setProtectedHeader({alg:'RS256',kid:'test'}).setSubject('s').setIssuer('https://attacker.cloudflareaccess.com').setAudience(env.ACCESS_AUD).setIssuedAt().setExpirationTime('5m').sign(privateKey));
 bad.push(new SignJWT({email:'student@example.test'}).setProtectedHeader({alg:'RS256',kid:'test'}).setSubject('s').setIssuer(env.ACCESS_TEAM_DOMAIN).setAudience('wrong').setIssuedAt().setExpirationTime('5m').sign(privateKey));
 bad.push(new SignJWT({email:'student@example.test'}).setProtectedHeader({alg:'RS256',kid:'test'}).setSubject('s').setIssuer(env.ACCESS_TEAM_DOMAIN).setAudience(env.ACCESS_AUD).setIssuedAt().setExpirationTime(1).sign(privateKey));
 bad.push(sign({email:'invalid'}));bad.push(sign({},(await generateKeyPair('RS256')).privateKey));
 for(const t of await Promise.all(bad))await assert.rejects(()=>verifyIdentity(request('/',{headers:{'Cf-Access-Jwt-Assertion':t}}),{issuer:env.ACCESS_TEAM_DOMAIN,audience:[env.ACCESS_AUD]},keySet));
 await assert.rejects(()=>verifyIdentity(request(),{issuer:env.ACCESS_TEAM_DOMAIN,audience:[env.ACCESS_AUD]},keySet));
});
test('configuration fails closed for missing settings, unapproved aliases and previews',()=>{
 assert.throws(()=>configuration({},request()));
 assert.throws(()=>configuration(env,new Request('https://hash.js-lab-private.pages.dev/assets/main.js')));
 assert.throws(()=>configuration({...env,ACCESS_TEAM_DOMAIN:'https://attacker.example'},request()));
 assert.ok(configuration(env,request()));
});
test('CSRF requires same origin and matching secure host cookie',()=>{
 const token='a'.repeat(64),headers={origin,'X-Jslab-Csrf':token,cookie:'__Host-jslab-csrf='+token};
 assert.doesNotThrow(()=>csrf(request('/api/students',{method:'POST',headers})));
 for(const change of [{origin:'https://other.test'},{'X-Jslab-Csrf':'wrong'},{cookie:''},{'sec-fetch-site':'cross-site'}])assert.throws(()=>csrf(request('/api/students',{method:'POST',headers:{...headers,...change}})));
});
function fixture({code,role='student',dbError=false}={}){
 let assets=0;const commands=[];
 const db={rpc:async(name,args)=>{commands.push([name,args]);if(name==='enrollment_authorize')return {data:code?{allowed:false,code}:{allowed:true,member:{id:'11111111-1111-4111-8111-111111111111',role,name:'Student',email:'student@example.test'},server_time:new Date().toISOString()},error:dbError?{}:null};if(name==='resource_rate')return {data:true,error:null};return {data:[],error:null};}};
 return {handler:createHandler({db,verifyIdentity:async()=>({email:'student@example.test',subject:'verified'})}),env:{...env,ASSETS:{fetch:async()=>{assets++;return new Response('PRIVATE_LESSON',{headers:{etag:'cached'}})}}},assets:()=>assets,commands};
}
test('every static path rechecks enrollment, including cached assets, PDF assets and alternatives',async()=>{
 for(const code of ['pending','expired','revoked','suspended','unapproved','not_started','identity_mismatch'])for(const path of ['/','/index.html','/assets/chapter.js','/pdf-assets/wasm/openjpeg.wasm','/api/files/11111111-1111-4111-8111-111111111111']){const f=fixture({code});const r=await f.handler.fetch(request(path),f.env);assert.equal(r.status,403);assert.equal(f.assets(),0);assert.ok(!(await r.text()).includes('PRIVATE_LESSON'));}
 const f=fixture();for(const path of ['/','/assets/chapter.js']){const r=await f.handler.fetch(request(path,{headers:{'if-none-match':'cached'}}),f.env);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store, max-age=0');assert.equal(r.headers.get('etag'),null);}assert.equal(f.commands.filter(([n])=>n==='enrollment_authorize').length,2);
});
test('database outage and absent identity never call static assets',async()=>{
 const f=fixture({dbError:true});assert.equal((await f.handler.fetch(request(),f.env)).status,503);assert.equal(f.assets(),0);
 const r=await createHandler().fetch(request(),f.env);assert.equal(r.status,401);
});
test('students cannot manage enrollment, resources or uploads even with CSRF',async()=>{
 const token='a'.repeat(64),headers={origin,'X-Jslab-Csrf':token,cookie:'__Host-jslab-csrf='+token,'Content-Type':'application/json'};
 for(const [path,body] of [['/api/students',{action:'approve',body:{role:'admin'}}],['/api/resources',{action:'prepare'}],['/api/uploads/11111111-1111-4111-8111-111111111111',{}]]){const f=fixture();const r=await f.handler.fetch(request(path,{method:'POST',headers,body:JSON.stringify(body)}),f.env);assert.equal(r.status,403);assert.equal(f.commands.filter(([n])=>n==='enrollment_command').length,0);}
});
test('administrator operations use verified server identity, no caller-supplied actor',async()=>{
 const f=fixture({role:'admin'}),token='a'.repeat(64);const r=await f.handler.fetch(request('/api/students',{method:'POST',headers:{origin,cookie:'__Host-jslab-csrf='+token,'X-Jslab-Csrf':token},body:JSON.stringify({action:'revoke',body:{id:'student',admin_id:'forged'}})}),f.env);assert.equal(r.status,200);assert.equal(f.commands.find(([n])=>n==='enrollment_command')[1].admin_id,'11111111-1111-4111-8111-111111111111');
});
test('oversized JSON and malformed body are rejected; security headers disallow storage and framing',async()=>{
 await assert.rejects(()=>jsonBody(request('/api/students',{method:'POST',body:'x'.repeat(32769)})));
 await assert.rejects(()=>jsonBody(request('/api/students',{method:'POST',body:'[]'})));
 const r=secured(new Response('ok'));assert.equal(r.headers.get('X-Frame-Options'),'DENY');assert.match(r.headers.get('Content-Security-Policy'),/object-src 'none'/);assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);
});
