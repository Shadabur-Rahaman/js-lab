// Owner-terminal deployment helper. Server credentials stay in process memory,
// are passed over child stdin and never written to disk or command arguments.
import {execFileSync} from 'node:child_process';
import {publicSettings,serverKey} from './resource-cloud-tools.mjs';
const team=process.argv[2],audience=process.argv[3];
if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team||'')||!/^[a-f0-9]{64}(,[a-f0-9]{64})*$/.test(audience||''))throw Error('Supply the public team domain and exact Access AUD tag. Never pass a private token.');
const {url,ref}=publicSettings();
const values={ACCESS_TEAM_DOMAIN:'https://'+team,ACCESS_AUD:audience,PROTECTED_HOSTS:'js-lab-private.pages.dev',SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:serverKey(ref)};
for(const environment of ['production','preview']){
 try{execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','pages','secret','bulk','--project-name','js-lab-private','--env',environment],{input:JSON.stringify(values),encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:120000});}
 catch{throw Error('Cloudflare secret setup failed for '+environment+'. Private tool output was suppressed. Check Wrangler sign-in and project permissions.');}
 console.log('Configured encrypted server bindings for '+environment+'. Values were not printed or saved.');
}
