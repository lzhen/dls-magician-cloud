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
    console, URL, AbortController,
    localStorage: { getItem() { return null; }, setItem() {} },
    navigator: {},
    window: { location: { hash: '#dashboard' }, addEventListener() {}, setTimeout(fn) { timers.push(fn); } },
    document: { documentElement: { dataset: {} }, addEventListener() {}, getElementById(id) { if (!elements.has(id)) elements.set(id, { innerHTML: '', textContent: '' }); return elements.get(id); } }
  });
  vm.runInContext(source.replace(/\nboot\(\);\s*$/, '\n'), context, { filename: 'public/app.js' });
  const state = vm.runInContext('state', context);
  const run = (code) => vm.runInContext(code, context);
  return { context, state, run, timers };
}

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
