const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { spawn } = require('node:child_process');

// Execute the exact inspected production server in an isolated temporary directory.
// The local identity fixture is confined to tests; the app contains no demo auth.
test('native DTO and save contract against actual production server source', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dls-native-contract-'));
  const source = path.resolve(__dirname, '../../production');
  for (const name of ['server.js', 'storage.js']) fs.copyFileSync(path.join(source, name), path.join(directory, name));
  const fixtureAuth = http.createServer((req, res) => {
    if (req.url !== '/auth/v1/user' || req.headers.authorization !== 'Bearer LOCAL_TEST_TOKEN') {
      res.writeHead(401, { 'Content-Type': 'application/json' }); res.end('{"error":"unauthorized"}'); return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id:'fixture-native-user', email:'fixture@example.test', user_metadata:{name:'Native fixture'}, app_metadata:{provider:'google'} }));
  });
  await new Promise(resolve => fixtureAuth.listen(0, '127.0.0.1', resolve));
  // The production logger prints configured 0 rather than assigned port, so discover
  // the ephemeral listener from an isolated test-only source adaptation.
  const testServer = fs.readFileSync(path.join(directory,'server.js'),'utf8').replace('http://localhost:${PORT}', 'http://127.0.0.1:${server.address().port}');
  fs.writeFileSync(path.join(directory,'server.js'),testServer);
  const run = spawn(process.execPath,['server.js'],{cwd:directory,env:{...process.env,PORT:'0',HOST:'127.0.0.1',SUPABASE_URL:`http://127.0.0.1:${fixtureAuth.address().port}`,SUPABASE_PUBLISHABLE_KEY:'LOCAL_TEST_KEY'},stdio:['ignore','pipe','pipe']});
  t.after(async()=>{run.kill('SIGTERM');fixtureAuth.close();fs.rmSync(directory,{recursive:true,force:true});});
  const base = await new Promise((resolve,reject) => {
    let errors = '';
    run.stderr.on('data', chunk => { errors += chunk.toString(); });
    const timeout = setTimeout(()=>reject(new Error('Local test server startup timed out')),5000);
    run.stdout.on('data', chunk => { const match=chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/); if(match){ clearTimeout(timeout);resolve(match[0]); }});
    run.once('error',reject);
    run.once('exit', code => { clearTimeout(timeout); reject(new Error(`Local server exited ${code}: ${errors}`)); });
  });
  const headers={Authorization:'Bearer LOCAL_TEST_TOKEN','Content-Type':'application/json'};
  assert.deepEqual(await (await fetch(`${base}/api/session`)).json(),{authenticated:false});
  assert.equal((await fetch(`${base}/api/bootstrap`)).status,401);
  const session=await (await fetch(`${base}/api/session`,{headers})).json();
  assert.equal(session.authenticated,true);assert.equal(session.user.id,'fixture-native-user');
  const bootstrap=await (await fetch(`${base}/api/bootstrap`,{headers})).json();
  assert.equal(bootstrap.user.id,session.user.id);assert.ok(Array.isArray(bootstrap.workspaces));assert.ok(Array.isArray(bootstrap.projects));
  const summary=bootstrap.projects[0];
  for(const key of ['id','name','description','workspaceId','status','updatedAt']) assert.equal(typeof summary[key],'string',key);
  const project=await (await fetch(`${base}/api/projects/${summary.id}`,{headers})).json();
  for(const key of ['id','name','description','workspaceId','ownerId','status','structuredLanguage','updatedAt']) assert.equal(typeof project[key],'string',key);
  assert.ok(Array.isArray(project.members));assert.equal(typeof project.generated.valid,'boolean');
  for(const step of project.generated.steps) { assert.equal(typeof step.id,'string');assert.equal(typeof step.text,'string');assert.ok(Array.isArray(step.entities)); }
  const text='GIVEN\nA designer edits a native workflow\n\nWHEN\nThey explicitly save\n\nTHEN\nThe existing API persists the workflow';
  const response=await fetch(`${base}/api/projects/${project.id}`,{method:'PATCH',headers,body:JSON.stringify({structuredLanguage:text,expectedUpdatedAt:project.updatedAt})});
  assert.equal(response.status,200);
  const saved=await response.json();assert.equal(saved.structuredLanguage,text);assert.equal(saved.generated.valid,true);
  assert.deepEqual(saved.generated.steps.map(s=>s.type),['GIVEN','WHEN','THEN']);
  const reloaded=await (await fetch(`${base}/api/projects/${project.id}`,{headers})).json();
  assert.equal(reloaded.structuredLanguage,text);
  const denied=await fetch(`${base}/api/projects/${project.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({structuredLanguage:'must not save'})});
  assert.equal(denied.status,401);
  assert.equal((await fetch(`${base}/api/account`,{method:'DELETE',headers})).status,404);
});
