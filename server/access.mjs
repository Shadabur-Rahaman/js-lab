import { createRemoteJWKSet, jwtVerify } from 'jose';

const keys = new Map();
export class AccessError extends Error {
  constructor(code, status = 403) { super(code); this.code = code; this.status = status; }
}
export function configuration(env, request) {
  let issuer, project;
  try { issuer = new URL(env.ACCESS_TEAM_DOMAIN); project = new URL(env.SUPABASE_URL); } catch { throw new AccessError('setup_required',503); }
  if (issuer.protocol!=='https:' || !issuer.hostname.endsWith('.cloudflareaccess.com') || issuer.pathname!=='/' || issuer.search || issuer.username || issuer.password || project.protocol!=='https:' || !project.hostname.endsWith('.supabase.co') || project.pathname!=='/' || project.search || project.username || project.password || !env.SUPABASE_SERVICE_ROLE_KEY || !env.ACCESS_AUD)
    throw new AccessError('setup_required',503);
  const host = new URL(request.url).host;
  if (!(env.PROTECTED_HOSTS||'').split(',').map(s=>s.trim()).includes(host)) throw new AccessError('hostname_denied');
  return {issuer:issuer.origin,audience:env.ACCESS_AUD.split(',').map(s=>s.trim()).filter(Boolean)};
}
export async function verifyIdentity(request, config, keySet) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length>16384) throw new AccessError('unauthenticated',401);
  try {
    if (!keySet) {
      if (!keys.has(config.issuer)) keys.set(config.issuer,createRemoteJWKSet(new URL(config.issuer+'/cdn-cgi/access/certs'),{timeoutDuration:5000}));
      keySet=keys.get(config.issuer);
    }
    const {payload}=await jwtVerify(token,keySet,{issuer:config.issuer,audience:config.audience,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email'],clockTolerance:0});
    if (typeof payload.email!=='string' || typeof payload.sub!=='string' || !payload.sub || payload.sub.length>255 || payload.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || typeof payload.iat!=='number' || !Number.isFinite(payload.iat) || payload.iat>Date.now()/1000+30) throw Error();
    return {email:payload.email.toLowerCase(),subject:payload.sub};
  } catch { throw new AccessError('unauthenticated',401); }
}
export function csrf(request) {
  if (request.headers.get('origin')!==new URL(request.url).origin || request.headers.get('sec-fetch-site')==='cross-site') throw new AccessError('origin_denied');
  const cookie=request.headers.get('cookie')?.match(/(?:^|;\s*)__Host-jslab-csrf=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!cookie || request.headers.get('x-jslab-csrf')!==cookie) throw new AccessError('csrf_denied');
}
export async function jsonBody(request, max=32768) {
  const reader=request.body?.getReader(); let size=0; const parts=[];
  if (reader) for(;;) { const {done,value}=await reader.read(); if(done)break; size+=value.length; if(size>max){await reader.cancel();throw new AccessError('request_too_large',413)} parts.push(value); }
  const bytes=new Uint8Array(size);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}
  try {const body=JSON.parse(new TextDecoder().decode(bytes));if(!body||Array.isArray(body)||typeof body!=='object')throw Error(); return body;} catch {throw new AccessError('invalid_request',400)}
}
export function secured(response) {
  const headers=new Headers(response.headers);
  for(const name of ['Access-Control-Allow-Origin','Access-Control-Allow-Headers','Access-Control-Allow-Methods','ETag','Last-Modified'])headers.delete(name);
  headers.set('Cache-Control','private, no-store, max-age=0');
  headers.set('CDN-Cache-Control','no-store');
  headers.set('Cloudflare-CDN-Cache-Control','no-store');
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('Referrer-Policy','no-referrer');
  headers.set('X-Frame-Options','DENY');
  headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  headers.set('Strict-Transport-Security','max-age=31536000');
  headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data: blob:; connect-src 'self' https:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  return new Response(response.body,{status:response.status,headers});
}
export function denial(error,request) {
  const code=error instanceof AccessError?error.code:'service_unavailable';
  const status=error instanceof AccessError?error.status:503;
  if(new URL(request.url).pathname.startsWith('/api/')) return Response.json({error:'Access is unavailable.',code},{status});
  const titles={expired:'Access Expired',revoked:'Access Revoked',suspended:'Access Suspended',pending:'Awaiting Approval',not_started:'Enrollment Has Not Started'};
  const title=titles[code]||'Access Required';
  return new Response(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · JS LAB</title><body style="background:#101115;color:#eee;font:18px system-ui;padding:8vw"><main><h1>${title}</h1><p>Contact your teacher to check your enrollment, or sign in with your approved email.</p><p>If the service is temporarily unavailable, please try again later.</p><a style="color:#f9e54e" href="/cdn-cgi/access/logout">Sign out</a></main></body></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8'}});
}
