// Explicit owner-run acceptance test. Uses only newly created disposable records
// and objects; no real student's enrollment or classroom file is changed.
import {createClient} from '@supabase/supabase-js';
import {publicSettings,serverKey} from './resource-cloud-tools.mjs';
import {resourceAction,uploadBytes,downloadFile} from '../server/resources.mjs';
import {createHandler} from '../server/worker.mjs';
import {sha256} from '../supabase/functions/_shared/validation.mjs';
import assert from 'node:assert/strict';
const {url,key:publicKey,ref}=publicSettings(),secret=serverKey(ref);
const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const anon=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
const owner=await db.from('student_enrollments').select('*').eq('role','admin').eq('status','approved').single();
if(owner.error)throw Error('Expected one previously authorized administrator.');
const admin=owner.data,id=crypto.randomUUID(),email='private-check-'+id+'@example.test',subject='test-'+id;
let student,resource,upload;
const checks=[];
const pass=(name)=>{checks.push(name);console.log('PASS '+name);};
async function command(action,body){const {data,error}=await db.rpc('enrollment_command',{admin_id:admin.id,command:action,body});if(error)throw Error('Enrollment command failed: '+action);return data;}
async function permission(){const {data,error}=await db.rpc('enrollment_authorize',{verified_email:email,verified_subject:subject});if(error)throw Error('Authorization RPC failed');return data;}
async function action(action,body={}){const r=await resourceAction({action,...body},db,admin);if(!r.ok)throw Error('Resource action failed: '+action);return r.json();}
try{
 student=await command('create',{name:'Disposable private acceptance fixture',email});
 assert.equal((await permission()).code,'pending');pass('Cloud database denies pending enrollment');
 student=await command('approve',{id:student.id,revision:student.revision,days:7});
 let allowed=await permission();assert.equal(allowed.allowed,true);pass('Cloud database accepts approved verified fixture identity');
 const denied=await anon.from('student_enrollments').select('*');assert.ok(denied.error);pass('Anonymous client cannot read enrollment records');
 const forged=await anon.rpc('enrollment_command',{admin_id:admin.id,command:'list',body:{}});assert.ok(forged.error);pass('Anonymous client cannot call privileged enrollment commands');
 const text=new TextEncoder().encode('JS Lab disposable private integration fixture '+id+'\n'),name='private-fixture.txt';
 const metadata={title:'Disposable private access check '+id,description:'Automated test; removed after verification',category_id:null,chapter_id:null,lesson_id:null,tags:[],status:'draft',display_order:0};
 upload=await action('prepare',{request_id:crypto.randomUUID(),original_filename:name,file_size:text.length,mime_type:'text/plain',sha256:await sha256(text),metadata});
 resource={id:upload.resource_id};
 const uploadResponse=await uploadBytes(new Request('https://fixture.test/api/uploads/'+upload.id,{method:'POST',body:text}),upload.id,db,admin);assert.equal(uploadResponse.status,200);pass('Private server uploads validated bytes to persistent Storage');
 resource=await action('finalize',{upload_id:upload.id});
 assert.ok((await action('list',{page:0})).some(r=>r.id===resource.id));pass('Private server lists finalized resource');
 await assert.rejects(()=>downloadFile(resource.id,true,db,allowed.member));pass('Student cannot download an unpublished resource');
 resource=await action('edit',{id:resource.id,version:resource.version,metadata:{...metadata,status:'published'}});
 const downloaded=await downloadFile(resource.id,true,db,allowed.member);assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()),text);pass('Published resource returns original persisted bytes through private server');
 const link=await resourceAction({action:'link',id:resource.id},db,allowed.member);assert.equal((await link.json()).url,'/api/files/'+resource.id);pass('Private API returns only an authenticated endpoint, not a Storage URL');
 const env={ACCESS_TEAM_DOMAIN:'https://broad-dew-2065.cloudflareaccess.com',ACCESS_AUD:'test-aud',SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:secret,PROTECTED_HOSTS:'fixture.test',ASSETS:{fetch:()=>{throw Error('Unexpected asset access');}}};
 const handler=createHandler({db,verifyIdentity:async()=>({email,subject})});
 student=await command('revoke',{id:student.id,revision:student.revision});
 const revoked=await handler.fetch(new Request('https://fixture.test/api/files/'+resource.id),env);assert.equal(revoked.status,403);assert.equal((await revoked.json()).code,'revoked');pass('Revocation blocks next gateway file request with the same fixture identity');
 student=await command('approve',{id:student.id,revision:student.revision,days:7});
 const serverNow=Date.parse((await permission()).server_time);
 const expiredFixture=await db.from('student_enrollments').update({starts_at:new Date(serverNow-86400000).toISOString(),expires_at:new Date(serverNow-1000).toISOString()}).eq('id',student.id);
 if(expiredFixture.error)throw Error('Expired fixture setup failed');
 assert.equal((await permission()).code,'expired');pass('Cloud server timestamps enforce expiry');
 resource=await action('edit',{id:resource.id,version:resource.version,metadata:{...metadata,status:'deleted'}});
 await assert.rejects(()=>downloadFile(resource.id,true,db,admin));pass('Trashed resource cannot be downloaded');
 console.log(checks.length+'/12 real Supabase private-backend checks passed. Cloudflare OTP itself is not tested by this script.');
} catch(e) { console.error('Private acceptance failure: '+e.message);throw e;} finally {
 // Only exact IDs generated above. Never purge a real classroom record.
 if(upload?.storage_path){const result=await db.storage.from('learning-resources').remove([upload.storage_path]);if(result.error)throw Error('Disposable object cleanup failed');}
 if(resource?.id){await db.from('learning_resources').update({status:'deleted',current_version_id:null,storage_path:null}).eq('id',resource.id);await db.from('resource_versions').delete().eq('resource_id',resource.id);await db.from('resource_audit_log').delete().eq('resource_id',resource.id);const result=await db.from('learning_resources').delete().eq('id',resource.id);if(result.error)throw Error('Disposable resource cleanup failed');}
 if(student?.id){await db.from('enrollment_audit_log').delete().eq('student_id',student.id);const result=await db.from('student_enrollments').delete().eq('id',student.id);if(result.error)throw Error('Disposable enrollment cleanup failed');}
 console.log('Disposable fixture cleanup completed. Existing students and classroom resources were not modified.');
}
