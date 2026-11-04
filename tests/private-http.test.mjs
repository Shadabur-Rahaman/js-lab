import test from 'node:test';
import assert from 'node:assert/strict';
import {protectedJson} from '../src/access/http.mjs';
test('an HTML Access login response never reports a successful protected mutation',async()=>{
 let checks=0;
 await assert.rejects(()=>protectedJson(new Response('<html>Sign in</html>',{headers:{'Content-Type':'text/html'}}),()=>checks++));
 assert.equal(checks,1);
 await assert.rejects(()=>protectedJson({redirected:true,headers:new Headers({'content-type':'application/json'})},()=>checks++));
 assert.equal(checks,2);
});
test('protected API denials recheck enrollment and malformed JSON is rejected',async()=>{
 let checks=0;
 await assert.rejects(()=>protectedJson(Response.json({error:'Access is unavailable.',code:'revoked'},{status:403}),()=>checks++));
 assert.equal(checks,1);
 await assert.rejects(()=>protectedJson(new Response('{',{headers:{'content-type':'application/json'}})));
 await assert.rejects(()=>protectedJson(Response.json({error:'Unsuccessful mutation'})));
});
test('successful protected list and mutation responses preserve their values',async()=>{
 assert.deepEqual(await protectedJson(Response.json([{id:'resource'}])),[{id:'resource'}]);
 assert.deepEqual(await protectedJson(Response.json({saved:true})),{saved:true});
});
