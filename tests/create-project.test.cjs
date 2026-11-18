const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.join(__dirname, '..');
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const response = (value, ok = true) => ({ ok, status: ok ? 200 : 503, text: async () => JSON.stringify(value) });

async function setup(t) {
  const requests = [];
  const errors = [];
  const streams = [];
  const console = new VirtualConsole();
  console.on('jsdomError', (error) => errors.push(error));
  const dom = new JSDOM('<div id="app"></div><div id="modal-root"></div><div id="toast-root"></div>', {
    url: 'http://localhost/#dashboard', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console
  });
  t.after(() => { dom.window.close(); assert.deepEqual(errors, []); });
  const { window: w } = dom;
  // jsdom has no top layer. Browser focus containment/geometry requires separate browser QA.
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  w.HTMLElement.prototype.getClientRects = function () { return [{ width: 100, height: 40 }]; };
  w.EventSource = class { constructor() { streams.push(this); } close() {} };
  w.fetch = async (url, config = {}) => {
    if (url === '/api/session') return response({ authenticated: true, provider: 'microsoft', user: { id: 'u-jen', name: 'Jen Lee', email: 'jen@example.test' } });
    if (url === '/api/bootstrap') return response({ user: { id: 'u-jen', name: 'Jen Lee', email: 'jen@example.test' }, workspaces: [{ id: 'ws-test', name: 'Test workspace', members: [], authProviders: {} }], projects: [], activities: [], templates: [{ id: 't-intent', name: 'Intent Classification', category: 'AI', description: 'Classify intent.' }] });
    if (url === '/api/projects' && config.method === 'POST') {
      const result = deferred(); requests.push({ body: JSON.parse(config.body), result }); return result.promise;
    }
    if (url.startsWith('/api/projects/')) return response({ id: 'p-created', name: 'Created project', structuredLanguage: '', members: [], comments: [], versions: [] });
    return response({});
  };
  w.eval(fs.readFileSync(path.join(root, 'public/vendor/empathie/empathie-dom.js'), 'utf8'));
  w.eval(fs.readFileSync(path.join(root, 'public/app.js'), 'utf8'));
  await tick(); await tick();
  const open = () => { const trigger = w.document.querySelector('[data-action="new-project"]'); trigger.focus(); trigger.click(); return w.document.querySelector('dialog'); };
  const submit = (form) => form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  return { w, requests, open, submit, streams };
}

test('required validation associates the error and does not create a project', async (t) => {
  const { w, requests, open, submit } = await setup(t);
  const dialog = open();
  const name = dialog.querySelector('[name="name"]'); name.value = '   ';
  submit(dialog.querySelector('form'));
  assert.equal(requests.length, 0);
  assert.equal(w.document.activeElement, name);
  assert.equal(name.getAttribute('aria-invalid'), 'true');
  assert.match(name.getAttribute('aria-describedby'), /new-project-name-error/);
  assert.match(w.document.getElementById('new-project-name-error').textContent, /Enter a project name/);
});

test('duplicate submissions are guarded; failure preserves inputs and permits retry', async (t) => {
  const { requests, open, submit } = await setup(t);
  const dialog = open(); const form = dialog.querySelector('form');
  form.elements.name.value = '  Empathie project  '; form.elements.description.value = 'Keep this draft';
  const region = form.querySelector('[data-e-status]'); assert.equal(region.textContent, '');
  submit(form); submit(form);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.name, 'Empathie project');
  assert.equal(form.querySelector('[type="submit"]').getAttribute('aria-busy'), 'true');
  assert.equal(form.elements.name.disabled, true);
  assert.match(region.textContent, /Creating your project/);
  assert.equal(form.querySelector('[data-action="close-modal"]').disabled, false);
  requests[0].result.resolve(response({ error: 'Service unavailable' }, false)); await tick();
  assert.equal(form.elements.name.value, '  Empathie project  ');
  assert.equal(form.elements.description.value, 'Keep this draft');
  assert.equal(form.elements.name.disabled, false);
  assert.match(form.querySelector('[data-e-error]').textContent, /input is preserved/);
  submit(form); assert.equal(requests.length, 2);
  requests[1].result.resolve(response({ id: 'p-created', name: 'Empathie project' })); await tick();
  assert.equal(dialog.isConnected, false);
});

for (const outcome of ['success', 'failure']) test(`dismissed ${outcome} cannot change a reopened form or route`, async (t) => {
  const { w, requests, open, submit } = await setup(t);
  let dialog = open(); const form = dialog.querySelector('form'); form.elements.name.value = 'Saved draft';
  submit(form);
  dialog.querySelector('[data-action="close-modal"]').click();
  assert.match(w.document.activeElement.dataset.action, /new-project/);
  dialog = open();
  assert.equal(dialog.querySelector('[name="name"]').value, 'Saved draft');
  dialog.querySelector('[name="name"]').value = 'Newer draft';
  if (outcome === 'success') requests[0].result.resolve(response({ id: 'p-old', name: 'Old result' }));
  else requests[0].result.reject(new Error('Offline'));
  await tick();
  assert.equal(w.location.hash, '#dashboard');
  assert.equal(dialog.isConnected, true);
  assert.equal(dialog.querySelector('[name="name"]').value, 'Newer draft');
  assert.equal(dialog.querySelector('[data-e-error]').textContent, '');
});

test('native cancel restores focus and a successful active submission clears its draft', async (t) => {
  const { w, requests, open, submit } = await setup(t);
  let dialog = open();
  dialog.dispatchEvent(new w.Event('cancel', { cancelable: true }));
  assert.equal(w.document.querySelector('dialog'), null);
  assert.equal(w.document.activeElement.dataset.action, 'new-project');
  dialog = open(); const form = dialog.querySelector('form'); form.elements.name.value = 'New project'; submit(form);
  requests[0].result.resolve(response({ id: 'p-created', name: 'New project' })); await tick();
  await tick();
  assert.equal(w.location.hash, '#project/p-created');
  assert.equal(w.document.activeElement.id, 'structured-editor');
  w.location.hash = '#dashboard'; await tick(); await tick();
  assert.equal(open().querySelector('[name="name"]').value, '');
});

test('template entry keeps its template and custom drafts independently', async (t) => {
  const { w, requests, open, submit } = await setup(t);
  let dialog = open(); dialog.querySelector('[name="name"]').value = 'Blank draft';
  dialog.querySelector('[data-action="close-modal"]').click();
  w.location.hash = '#templates'; await tick(); await tick();
  w.document.querySelector('[data-action="use-template"]').click();
  dialog = w.document.querySelector('dialog'); const form = dialog.querySelector('form');
  assert.equal(form.elements.name.value, 'Intent Classification workflow');
  assert.equal(form.elements.category.value, 'AI'); submit(form);
  assert.match(requests[0].body.structuredLanguage, /classifies the primary intent/);
  dialog.querySelector('[data-action="close-modal"]').click();
  w.location.hash = '#dashboard'; await tick(); await tick();
  assert.equal(open().querySelector('[name="name"]').value, 'Blank draft');
});

test('a realtime workspace refresh preserves the active pending form', async (t) => {
  const { w, requests, open, submit, streams } = await setup(t);
  const dialog = open(), form = dialog.querySelector('form');
  form.elements.name.value = 'Keep the live form'; submit(form);
  streams.at(-1).onmessage({ data: JSON.stringify({ type: 'workspace_updated', payload: {} }) });
  await tick(); await tick();
  assert.equal(w.document.querySelector('dialog'), dialog);
  assert.equal(form.elements.name.value, 'Keep the live form');
  assert.equal(form.elements.name.disabled, true);
  requests[0].result.resolve(response({ id: 'p-created', name: 'Keep the live form', members: [] }));
  await tick(); await tick();
  assert.equal(w.location.hash, '#project/p-created');
});
