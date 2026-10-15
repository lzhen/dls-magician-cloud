'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

test('the company subpath serves the app, isolated assets, API and PWA routes', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dls-subpath-'));
  const reservation = net.createServer().listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, [path.resolve(__dirname, '../server.js')], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DLS_DATA_DIR: dir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const ended = once(child, 'exit'); child.kill('SIGTERM'); await ended;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Startup timed out')), 5000);
    child.once('exit', code => { clearTimeout(timeout); reject(Error('Server exited: ' + code)); });
    child.stdout.on('data', chunk => {
      if (String(chunk).includes('DLS Magician Cloud is running')) { clearTimeout(timeout); resolve(); }
    });
  });
  const origin = `http://127.0.0.1:${port}`;
  const html = await (await fetch(origin + '/dlsmagician/')).text();
  assert.match(html, /src="\/dlsmagician\/app\.js/);
  assert.match(html, /href="\/dlsmagician\/manifest\.webmanifest"/);
  assert.doesNotMatch(html, /(?:href|src)="\/(?!\/|dlsmagician\/)/);
  const style = await (await fetch(origin + '/dlsmagician/styles.css')).text();
  assert.match(style, /url\(['"]?\/dlsmagician\/icons\//);
  const manifest = await (await fetch(origin + '/dlsmagician/manifest.webmanifest')).json();
  assert.equal(manifest.scope, '/dlsmagician/');
  assert.equal(manifest.start_url, '/dlsmagician/#dashboard');
  assert.ok(manifest.icons.every(icon => icon.src.startsWith('/dlsmagician/')));
  const worker = await fetch(origin + '/dlsmagician/sw.js');
  assert.equal(worker.headers.get('service-worker-allowed'), '/dlsmagician/');
  assert.equal((await fetch(origin + '/dlsmagician/api/config')).status, 200);
  assert.equal((await fetch(origin + '/dlsmagician/api/bootstrap')).status, 401);
  assert.equal((await fetch(origin + '/dlsmagician/api/projects', { method: 'POST', headers: { origin: 'https://www.empathie.ai' } })).status, 401);
  assert.equal((await fetch(origin + '/dlsmagician/api/projects', { method: 'POST', headers: { origin: 'https://attacker.invalid' } })).status, 403);
  assert.equal((await fetch(origin + '/health')).status, 200);
  assert.match(await (await fetch(origin + '/')).text(), /src="\/app\.js/);
  const callback = await new Promise((resolve, reject) => {
    http.get(origin + '/?code=synthetic-code', { headers: { host: 'dlsmagician.empathie.ai' } }, response => {
      response.resume();
      response.once('end', () => resolve(response));
    }).once('error', reject);
  });
  assert.equal(callback.statusCode, 307);
  assert.equal(callback.headers.location, 'https://www.empathie.ai/dlsmagician/?code=synthetic-code');
});
