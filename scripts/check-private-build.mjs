import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const folder='dist-private';
const routes=JSON.parse(fs.readFileSync(path.join(folder,'_routes.json'),'utf8'));
assert.deepEqual(routes,{version:1,include:['/*'],exclude:[]});
const worker=fs.readFileSync(path.join(folder,'_worker.js'),'utf8');
assert.ok(worker.includes('enrollment_authorize')&&worker.includes('Cf-Access-Jwt-Assertion'),'Missing server security checks');
let files=0;
function scan(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())scan(file);else if(file!==path.join(folder,'_worker.js')&&/\.(html|js|mjs|css|json)$/.test(file)){const text=fs.readFileSync(file,'utf8');assert.ok(!/sb_secret_[A-Za-z0-9_-]{10,}/.test(text),'Server secret in frontend artifact');for(const token of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[]){let payload;try{payload=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));}catch{continue;}assert.notEqual(payload.role,'service_role','Service-role JWT in frontend artifact');}files++;}}}
scan(folder);console.log(`Private build checks passed: all routes protected, server checks bundled, ${files} frontend assets scanned for privileged keys.`);
