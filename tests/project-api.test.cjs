const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

test('the real project API validates, persists, and serves the adapter in an isolated database', async (t) => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'dls-system-api-'));
  const probe = net.createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port; await new Promise((resolve) => probe.close(resolve));
  const child = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), DLS_DATA_DIR: data }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { child.kill('SIGTERM'); await once(child, 'exit'); fs.rmSync(data, { recursive: true, force: true }); });
  await once(child.stdout, 'data');
  const base = `http://127.0.0.1:${port}`;
  let result = await fetch(`${base}/api/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Unauthenticated' }) });
  assert.equal(result.status, 401);
  result = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'microsoft' }) });
  assert.equal(result.status, 200);
  const cookie = result.headers.get('set-cookie').split(';')[0];
  const create = (name) => fetch(`${base}/api/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ name, workspaceId: 'ws-growth', category: 'AI' }) });
  assert.equal((await create('   ')).status, 400);
  result = await create('  Adapter API test  '); assert.equal(result.status, 201);
  const project = await result.json(); assert.equal(project.name, 'Adapter API test');
  const stored = JSON.parse(fs.readFileSync(path.join(data, 'db.json'), 'utf8'));
  assert.equal(stored.projects.filter((item) => item.name === 'Adapter API test').length, 1);
  result = await fetch(`${base}/api/projects/${encodeURIComponent(project.id)}`, { headers: { cookie } });
  assert.equal((await result.json()).id, project.id);
  for (const filename of ['empathie-dom.js', 'empathie-dom.css', 'contract.json']) {
    result = await fetch(`${base}/vendor/empathie/${filename}`); assert.equal(result.status, 200);
    if (filename.endsWith('.js')) assert.match(result.headers.get('content-type'), /javascript/);
    else if (filename.endsWith('.css')) assert.match(result.headers.get('content-type'), /text\/css/);
    else assert.equal((await result.json()).runtime, 'native-dom');
  }
});
