'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

test('real HTTP create/save/conflict survives a server restart with synthetic Auth', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dls-http-'));
  const fixture = {settings:{defaultWorkspaceId:'fixture'},users:[{id:'owner',authUserId:'owner',name:'Fixture',email:'owner@example.invalid'}],workspaces:[{id:'fixture',name:'Fixture',members:[{userId:'owner',role:'Admin'}]}],projects:[],activities:[]};
  fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify(fixture));
  const auth = http.createServer((req,res) => {
    assert.equal(req.url,'/auth/v1/user');
    res.writeHead(200,{'content-type':'application/json'});
    res.end(JSON.stringify({id:'owner',email:'owner@example.invalid',email_confirmed_at:'2026-01-01',user_metadata:{full_name:'Fixture'},app_metadata:{provider:'email'}}));
  }).listen(0,'127.0.0.1');
  await once(auth,'listening');
  const reservation = net.createServer().listen(0,'127.0.0.1');
  await once(reservation,'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  let child;
  const stop = async () => {
    if(child && child.exitCode === null && child.signalCode === null) {
      const exited=once(child,'exit'); child.kill('SIGTERM'); await exited;
    }
  };
  t.after(async () => {await stop();await new Promise(resolve=>auth.close(resolve));fs.rmSync(dir,{recursive:true,force:true});});
  async function start() {
    child=spawn(process.execPath,[path.resolve(__dirname,'../server.js')],{env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DLS_DATA_DIR:dir,SUPABASE_URL:`http://127.0.0.1:${auth.address().port}`,SUPABASE_PUBLISHABLE_KEY:'synthetic-only'},stdio:['ignore','pipe','pipe']});
    let output='';
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(Error('Server startup timed out')),5000);
      child.once('exit',code=>{clearTimeout(timeout);reject(Error('Server exited: '+code));});
      child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('DLS Magician Cloud is running')){clearTimeout(timeout);resolve();}});
    });
  }
  const token='fixture.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture';
  async function request(method,url,body,extra={}) {
    const response=await fetch(`http://127.0.0.1:${port}`+url,{method,headers:{authorization:'Bearer '+token,'content-type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,body:await response.json()};
  }
  await start();
  const created=await request('POST','/api/projects',{name:'Synthetic recovery project',workspaceId:'fixture'});
  assert.equal(created.status,201);
  const id=created.body.id, version=created.body.updatedAt;
  const saved=await request('PATCH','/api/projects/'+id,{structuredLanguage:'GIVEN\nA fixture\nWHEN\nSaved\nTHEN\nPreserved',expectedUpdatedAt:version});
  assert.equal(saved.status,200);
  assert.equal(saved.body.generated.valid,true);
  assert.equal((await request('PATCH','/api/projects/'+id,{name:'stale',expectedUpdatedAt:version})).status,409);
  assert.equal((await request('PATCH','/api/projects/'+id,{name:'foreign'},{origin:'https://attacker.invalid'})).status,403);
  assert.equal((await request('POST','/api/projects/'+id+'/metrics',{event:'export',content:'must not collect'})).status,400);
  assert.equal((await request('POST','/api/projects/'+id+'/metrics',{event:'export'})).status,200);
  const comment=await request('POST','/api/projects/'+id+'/comments',{body:'Synthetic review only'});
  assert.equal(comment.status,201);
  const versionSaved=await request('POST','/api/projects/'+id+'/versions',{message:'Synthetic version'});
  assert.equal(versionSaved.status,201);
  const shared=await request('POST','/api/projects/'+id+'/share',{email:'invitee@example.invalid',role:'Viewer'});
  assert.equal(shared.status,201);
  await stop();await start();
  const recovered=await request('GET','/api/projects/'+id);
  assert.equal(recovered.status,200);assert.equal(recovered.body.structuredLanguage,saved.body.structuredLanguage);
  assert.equal(recovered.body.id,id);assert.notEqual(recovered.body.name,'stale');
  assert.equal(recovered.body.comments[0].body,'Synthetic review only');
  assert.equal(recovered.body.versions[0].id,versionSaved.body.id);
  assert.ok(recovered.body.members.some(member=>member.userId===shared.body.userId&&member.role==='Viewer'));
});
