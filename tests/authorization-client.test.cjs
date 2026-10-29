'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function clientHarness() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  assert.match(source, /\nboot\(\);\s*$/);
  const timers = [];
  const elements = new Map();
  const context = vm.createContext({
    console, URL, AbortController, clearTimeout() {},
    localStorage: { getItem() { return null; }, setItem() {} },
    navigator: {},
    window: { location: { hash: '#dashboard' }, addEventListener() {}, setTimeout(fn) { timers.push(fn); } },
    document: { documentElement: { dataset: {} }, addEventListener() {}, getElementById(id) { if (!elements.has(id)) elements.set(id, { innerHTML: '', textContent: '', setAttribute() {} }); return elements.get(id); } }
  });
  vm.runInContext(source.replace(/\nboot\(\);\s*$/, '\n'), context, { filename: 'public/app.js' });
  const state = vm.runInContext('state', context);
  const run = (code) => vm.runInContext(code, context);
  return { context, state, run, timers };
}

test('first project asks for a workspace name and keeps template context', () => {
  const h = clientHarness();
  h.state.user = { id: 'new-user', name: 'New user' };
  const html = h.run('renderNewProjectModal({name:"Omnichannel Campaign", description:"Original description", id:"t-omni"})');
  assert.match(html, /name="workspaceName"/);
  assert.match(html, /Create workspace & project/);
  assert.match(html, /Omnichannel Campaign workflow/);
  assert.match(html, /Original description/);
  assert.doesNotMatch(html, /<select[^>]+name="workspaceId"/);
  assert.match(h.run('renderWorkspacesPage()'), /data-action="new-workspace"/);
});

test('a failed first project retains the new workspace and draft for a successful retry', async () => {
  const h = clientHarness();
  h.state.user = { id: 'new-user' };
  let workspaceCalls = 0, projectCalls = 0;
  const button = { disabled: false, innerHTML: '' };
  const select = { value: '' };
  const field = { innerHTML: '' };
  const values = { name: 'My workflow', description: 'Keep this draft', workspaceName: 'Private work', category: 'Workflow' };
  const form = { dataset: {}, querySelector(selector) {
    if (selector === '[type="submit"]') return button;
    if (selector === '[data-project-workspace]') return field;
    if (selector === '[name="workspaceId"]') return select;
    throw Error('Unexpected selector: ' + selector);
  } };
  h.context.FormData = class { get(name) { return name === 'workspaceId' ? select.value : values[name]; } };
  h.context.fixtureForm = form;
  h.context.fixtureApi = async (url, options) => {
    if (url === '/api/workspaces') {
      workspaceCalls++;
      return { id: 'new-workspace', name: 'Private work', members: [{userId:'new-user',role:'Admin'}] };
    }
    assert.equal(url, '/api/projects');
    projectCalls++;
    assert.equal(options.body.workspaceId, 'new-workspace');
    assert.equal(options.body.description, 'Keep this draft');
    if (projectCalls === 1) throw Error('Temporary project failure');
    return { id: 'new-project' };
  };
  h.run('api = fixtureApi; showToast = () => {}; closeModal = () => {}; loadBootstrap = async () => {};');
  const first = h.run('createProject(fixtureForm)');
  await h.run('createProject(fixtureForm)'); // A double submission does nothing.
  await first;
  assert.equal(select.value, 'new-workspace');
  assert.equal(button.disabled, false);
  assert.equal(form.dataset.submitting, undefined);
  await h.run('createProject(fixtureForm)');
  assert.equal(workspaceCalls, 1);
  assert.equal(projectCalls, 2);
  assert.equal(h.context.window.location.hash, '#project/new-project');
});

test('a workspace response from a previous account cannot populate the current account', async () => {
  const h = clientHarness();
  h.state.user = { id: 'previous-user' };
  let complete;
  h.context.fixtureApi = () => new Promise(resolve => { complete = resolve; });
  h.run('api = fixtureApi;');
  const pending = h.run('createWorkspace("Private work")');
  h.state.user = { id: 'current-user' };
  complete({id:'previous-workspace', members:[{userId:'previous-user',role:'Admin'}]});
  await assert.rejects(pending, /Your account changed/);
  assert.equal(h.state.workspaces.length, 0);
});

test('a project-only guest can discover the shared project with an empty workspace list', () => {
  const h = clientHarness();
  h.state.user = { id: 'guest', name: 'Guest' };
  h.state.workspaces = [];
  h.state.projects = [{ id: 'shared-fixture', name: 'Shared fixture project', description: 'Visible invitation', workspaceId: 'hidden-workspace', owner: { name: 'Owner', initials: 'OO', color: 'blue' }, status: 'Draft', category: 'Test', accent: 'blue', members: [], memberCount: 1, commentCount: 0, updatedAt: '2026-01-01' }];
  const dashboard = h.run('renderDashboardPage()');
  const projects = h.run('renderProjectsPage()');
  for (const html of [dashboard, projects]) {
    assert.match(html, /Shared fixture project/);
    assert.match(html, /#project\/shared-fixture/);
  }
  assert.deepEqual(h.state.workspaces, []);
});

test('denied project navigation clears stale content and does not render or subscribe', async () => {
  const h = clientHarness();
  h.state.user = { id: 'guest' };
  h.state.activeProject = { id: 'previous', structuredLanguage: 'stale previous text' };
  h.state.editorText = 'stale previous text';
  h.state.editorDirty = true;
  h.state.selectedVersionId = 'stale-version';
  h.context.window.location.hash = '#project/forbidden';
  h.run(`
    globalThis.calls = [];
    api = async () => { throw new Error('Project not found.'); };
    renderEditor = () => calls.push('render');
    connectStream = () => calls.push('connect');
    startPresence = () => calls.push('presence');
    disconnectStream = () => calls.push('disconnect');
    stopPresence = () => calls.push('stop');
    showToast = () => {};
  `);
  await h.run('handleRoute()');
  assert.equal(h.state.activeProject, null);
  assert.equal(h.state.editorText, '');
  assert.equal(h.state.editorDirty, false);
  assert.equal(h.state.selectedVersionId, null);
  assert.equal(h.context.window.location.hash, '#dashboard');
  assert.equal(JSON.stringify(h.context.calls), JSON.stringify(['disconnect', 'stop']));
});

test('authorized project navigation still renders and subscribes normally', async () => {
  const h = clientHarness();
  h.state.user = { id: 'guest' };
  h.context.window.location.hash = '#project/shared';
  h.run(`
    globalThis.calls = [];
    api = async () => ({ id: 'shared', structuredLanguage: 'allowed', versions: [] });
    renderEditor = () => calls.push('render');
    connectStream = (id) => calls.push('connect:' + id);
    startPresence = (id) => calls.push('presence:' + id);
  `);
  await h.run('handleRoute()');
  assert.equal(h.state.activeProject.id, 'shared');
  assert.equal(JSON.stringify(h.context.calls), JSON.stringify(['render', 'connect:shared', 'presence:shared']));
});

test('an older denied project request cannot redirect a newer successful navigation', async () => {
  const h = clientHarness();
  h.state.user = { id: 'guest' };
  let rejectOlder;
  h.context.fixtureApi = (url) => url.endsWith('/older')
    ? new Promise((resolve, reject) => { rejectOlder = reject; })
    : Promise.resolve({ id: 'newer', structuredLanguage: 'newer content', versions: [] });
  h.run(`api = fixtureApi; renderEditor = () => {}; connectStream = () => {}; startPresence = () => {};`);
  h.context.window.location.hash = '#project/older';
  const older = h.run('handleRoute()');
  h.context.window.location.hash = '#project/newer';
  await h.run('handleRoute()');
  rejectOlder(new Error('Project not found.'));
  await older;
  assert.equal(h.state.activeProject.id, 'newer');
  assert.equal(h.state.editorText, 'newer content');
  assert.equal(h.context.window.location.hash, '#project/newer');
});

test('a project response received after account switch cannot populate the new account view', async () => {
  const h = clientHarness();
  h.state.user = { id: 'old-user' };
  h.context.window.location.hash = '#project/shared';
  let resolveRequest;
  h.context.fixtureApi = () => new Promise((resolve) => { resolveRequest = resolve; });
  h.run(`api = fixtureApi; renderEditor = () => { throw new Error('Must not render'); };`);
  const request = h.run('handleRoute()');
  h.state.user = { id: 'new-user' };
  resolveRequest({ id: 'shared', structuredLanguage: 'old-user content', versions: [] });
  await request;
  assert.equal(h.state.activeProject, null);
  assert.equal(h.state.editorText, '');
});

test('token refresh reconnects after the Auth callback using the current route, and skips logout', async () => {
  const h = clientHarness();
  let authCallback;
  h.context.window.supabase = { createClient() { return { auth: { onAuthStateChange(callback) { authCallback = callback; }, async getSession() { return { data: { session: null } }; } } }; } };
  h.run(`
    globalThis.calls = [];
    api = async () => ({ supabaseUrl: 'fixture', supabasePublishableKey: 'fixture' });
    handleRoute = async () => {};
    connectStream = (id) => calls.push(id);
    logout = () => { state.user = null; };
  `);
  await h.run('boot()');
  h.state.user = { id: 'guest' };
  h.state.activeProject = { id: 'old-route' };
  authCallback('TOKEN_REFRESHED', { access_token: 'fixture-only' });
  assert.equal(h.context.calls.length, 0, 'No nested Auth call inside onAuthStateChange');
  h.state.activeProject = { id: 'new-route' };
  h.timers.shift()();
  assert.equal(h.context.calls[0], 'new-route');
  authCallback('TOKEN_REFRESHED', { access_token: 'fixture-only' });
  authCallback('SIGNED_OUT', null);
  h.timers.shift()();
  assert.equal(h.context.calls.length, 1);
});

function savingHarness() {
  const h = clientHarness();
  h.state.user = { id: 'fixture-user' };
  h.state.activeProject = { id: 'qa', updatedAt: 'A', structuredLanguage: 'original', presence: [] };
  h.state.editorText = 'draft B'; h.state.editorDirty = true;
  h.run(`globalThis.toasts = []; showToast = (text) => toasts.push(text);`);
  return h;
}
test('web saves send read revision and adopt acknowledged revision', async () => {
  const h = savingHarness();
  h.run(`globalThis.sent = []; api = async (url, options) => { sent.push(options.body); return { id: 'qa', updatedAt: 'B', structuredLanguage: options.body.structuredLanguage }; };`);
  assert.equal(await h.run('saveEditor()'), true);
  assert.equal(h.context.sent[0].expectedUpdatedAt, 'A');
  assert.equal(h.context.sent[0].structuredLanguage, 'draft B');
  assert.equal(h.state.activeProject.updatedAt, 'B'); assert.equal(h.state.editorDirty, false);
});
test('409 retains draft and read revision and pauses subsequent saves', async () => {
  const h = savingHarness();
  h.run(`globalThis.requests = 0; api = async () => { requests++; throw Object.assign(new Error('conflict'), { status: 409 }); };`);
  assert.equal(await h.run('saveEditor()'), false);
  assert.equal(h.state.editorText, 'draft B'); assert.equal(h.state.activeProject.updatedAt, 'A');
  assert.equal(h.state.editorDirty, true); assert.equal(h.state.editorConflict, true);
  h.state.editorText = 'continued draft';
  assert.equal(await h.run('saveEditor()'), false); assert.equal(h.context.requests, 1);
  assert.match(h.context.toasts[0], /Copy it before reloading/);
});
test('realtime cannot replace dirty draft regardless of focused child', async () => {
  const h = savingHarness();
  h.run(`renderEditor = () => { throw Error('must not replace draft DOM'); };`);
  await h.run(`handleRealtimeMessage({type:'project_updated',projectId:'qa',payload:{project:{id:'qa',updatedAt:'B',structuredLanguage:'remote'}}})`);
  assert.equal(h.state.editorText, 'draft B'); assert.equal(h.state.activeProject.updatedAt, 'A');
});
test('overlapping saves serialize and preserve typing during a request', async () => {
  const h = savingHarness(), pending = [];
  h.context.fixtureApi = (url, options) => new Promise(resolve => pending.push({resolve,body:options.body}));
  h.run('api = fixtureApi;');
  const first = h.run('saveEditor()'); h.state.editorText = 'draft C';
  const second = h.run('saveEditor()'); assert.equal(pending.length, 1);
  pending[0].resolve({id:'qa',updatedAt:'B',structuredLanguage:'draft B'});
  await first; await new Promise(resolve => setImmediate(resolve));
  assert.equal(pending.length, 2); assert.equal(pending[1].body.expectedUpdatedAt, 'B');
  assert.equal(pending[1].body.structuredLanguage, 'draft C');
  pending[1].resolve({id:'qa',updatedAt:'C',structuredLanguage:'draft C'});
  assert.equal(await second, true); assert.equal(h.state.editorText, 'draft C'); assert.equal(h.state.editorDirty, false);
});
test('late save response cannot replace another project', async () => {
  const h = savingHarness(); let finish;
  h.context.fixtureApi = () => new Promise(resolve => {finish=resolve;}); h.run('api = fixtureApi;');
  const save = h.run('saveEditor()'); h.state.activeProject = {id:'different',updatedAt:'X'}; h.state.editorText = 'different draft';
  finish({id:'qa',updatedAt:'B',structuredLanguage:'draft B'});
  assert.equal(await save, false); assert.equal(h.state.activeProject.id, 'different'); assert.equal(h.state.editorText, 'different draft');
});
test('missing read version never sends unconditional PATCH', async () => {
  const h = savingHarness(); delete h.state.activeProject.updatedAt;
  h.run(`api = async () => { throw Error('must not send'); };`);
  assert.equal(await h.run('saveEditor()'), false); assert.equal(h.state.editorDirty, true);
});
