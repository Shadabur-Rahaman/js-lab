import assert from 'node:assert/strict';
import fs from 'node:fs';
const origins=process.argv.slice(2);
if(!origins.length)throw Error('Supply the production and deployment-hash HTTPS origins.');
const asset=fs.readdirSync('dist-private/assets').find(x=>/^index-.*\.js$/.test(x));
let count=0;
for(const origin of origins){
 const base=new URL(origin);if(base.protocol!=='https:'||!/(^|\.)js-lab-private\.pages\.dev$/.test(base.hostname)||base.pathname!=='/'||base.search||base.hash)throw Error('Expected this project’s Pages origin.');
 for(const path of ['/','/index.html','/assets/'+asset,'/api/session','/api/files/11111111-1111-4111-8111-111111111111','/pdf-assets/LICENSE']){
  const response=await fetch(new URL(path,base),{redirect:'manual',signal:AbortSignal.timeout(20000)});
  assert.ok([301,302,303,401,403,503].includes(response.status),`Unauthorized request exposed ${base.host}${path}: ${response.status}`);
  if(response.status<400){const target=new URL(response.headers.get('location'),base);assert.ok(target.hostname.endsWith('.cloudflareaccess.com'),'Unexpected authorization redirect');}
  console.log(`PASS unsigned request denied: ${base.host}${path} (${response.status})`);count++;
 }
}
console.log(count+' hosted unsigned-request checks passed. This does not verify successful OTP login.');
