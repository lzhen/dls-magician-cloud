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
  const listeners = new Map();
  const windowListeners = new Map();
  const elements = new Map();
  const context = vm.createContext({
    console, URL, AbortController, clearTimeout() {},
    localStorage: { getItem() { return null; }, setItem() {} },
    navigator: {},
    window: {
      location: { hash: '#dashboard' },
      history: { state: null, length: 1, replaceState(state) { this.state = state; } },
      addEventListener(type, listener) { windowListeners.set(type, listener); },
      setTimeout(fn) { timers.push(fn); }
    },
    document: { documentElement: { dataset: {} }, addEventListener(type, listener) { listeners.set(type, listener); }, getElementById(id) { if (!elements.has(id)) elements.set(id, { innerHTML: '', textContent: '', setAttribute() {} }); return elements.get(id); } }
  });
  vm.runInContext(source.replace(/\nboot\(\);\s*$/, '\n'), context, { filename: 'public/app.js' });
  const state = vm.runInContext('state', context);
  const run = (code) => vm.runInContext(code, context);
  return { context, state, run, timers, listeners, windowListeners };
}

test('switching theme keeps the sign-in email and Projects filter mounted', async (t) => {
  for (const page of ['login', 'projects']) {
    await t.test(page, async () => {
      const h = clientHarness();
      const { document, window, localStorage } = h.context;
      window.location.hash = '#' + page;
      if (page === 'login') {
        h.state.magicOpen = true;
        h.run('renderLogin()');
      } else {
        h.state.user = { id: 'designer', name: 'Fixture Designer', initials: 'FD', color: 'violet' };
        h.run('renderShell("projects")');
      }
      h.run('globalThis.streamChanges = 0; connectStream = disconnectStream = () => { streamChanges++; };');
      const app = document.getElementById('app');
      const html = app.innerHTML;
      assert.match(html, /data-action="toggle-theme"/);
      assert.match(html, page === 'login' ? /name="email"/ : /id="project-filter"/);
      let redraws = 0;
      Object.defineProperty(app, 'innerHTML', { get: () => html, set: () => { redraws++; } });
      const labels = new Map();
      const toggle = { dataset: {action: 'toggle-theme'}, setAttribute(name, value) { labels.set(name, value); } };
      const rows = ['alpha design', 'beta design'].map(projectName => ({ dataset: { projectName }, style: {} }));
      document.querySelectorAll = (selector) => {
        if (selector === '#project-table-body tr') return rows;
        assert.equal(selector, '[data-action="toggle-theme"]');
        return [toggle];
      };
      if (page === 'projects') {
        const target = { id: 'project-filter', value: 'alpha', matches: () => false };
        h.listeners.get('input')({ target });
        assert.deepEqual(rows.map(row => row.style.display), ['', 'none']);
      }
      const preferences = [];
      localStorage.setItem = (key, value) => preferences.push([key, value]);
      const click = () => h.listeners.get('click')({ target: { closest: () => toggle } });

      await click();
      assert.equal(redraws, 0);
      assert.equal(document.documentElement.dataset.theme, 'light');
      assert.equal(labels.get('aria-label'), 'Switch to dark mode');
      assert.equal(toggle.title, 'Dark mode');
      assert.equal(toggle.innerHTML, h.run('icon("moon")'));

      await click();
      assert.equal(redraws, 0);
      assert.equal(document.documentElement.dataset.theme, 'dark');
      assert.equal(labels.get('aria-label'), 'Switch to light mode');
      assert.equal(toggle.title, 'Light mode');
      assert.equal(toggle.innerHTML, h.run('icon("sun")'));
      assert.deepEqual(preferences, [['dls-theme', 'light'], ['dls-theme', 'dark']]);
      assert.equal(window.location.hash, '#' + page);
      assert.equal(h.context.streamChanges, 0);
      if (page === 'projects') assert.deepEqual(rows.map(row => row.style.display), ['', 'none']);
    });
  }
});

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
test('realtime cannot replace dirty draft regardless of focused child', async t => {
  const h = editorStreamHarness();
  t.after(h.close);
  await h.open();
  await h.receive({
    type: 'project_updated', projectId: 'qa',
    payload: { project: { ...h.state.activeProject, updatedAt: h.updated, structuredLanguage: 'remote' } }
  });
  assert.equal(h.state.editorText, 'draft B');
  assert.equal(h.state.activeProject.updatedAt, h.original);
  assert.match(h.context.toasts[0], /Your local changes are still active/);
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

test('reconnecting resumes autosave for the current mounted draft', async (t) => {
  async function openEditor() {
    const h = savingHarness();
    h.context.window.location.hash = '#project/qa';
    const patches = [];
    h.context.fixtureApi = (url, options) => {
      assert.equal(url, '/api/projects/qa');
      if (!options) return h.state.activeProject;
      assert.equal(options.method, 'PATCH');
      return new Promise((resolve, reject) => patches.push({ body: options.body, resolve, reject }));
    };
    h.run(`
      api = fixtureApi;
      renderLoading = renderEditor = connectStream = startPresence = () => {};
    `);
    await h.run('handleRoute()');
    return { ...h, patches, online: () => h.windowListeners.get('online')?.() };
  }

  for (const settlesBeforeOnline of [true, false]) {
    await t.test(settlesBeforeOnline ? 'after offline rejection' : 'while offline request is pending', async () => {
      const h = await openEditor();
      Object.assign(h.state, { editorDirty: true, editorText: 'draft B' });
      h.run('scheduleAutosave()');
      const saving = h.timers.shift()();
      if (settlesBeforeOnline) {
        h.patches[0].reject(new TypeError('Network unavailable'));
        assert.equal(await saving, false);
      }
      h.state.editorText = 'draft C';
      const recovering = h.online();
      const duplicate = h.online();
      if (!settlesBeforeOnline) {
        assert.equal(h.patches.length, 1);
        h.patches[0].reject(new TypeError('Network unavailable'));
        assert.equal(await saving, false);
      }
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(h.patches.length, 2);
      assert.equal(h.patches[1].body.structuredLanguage, 'draft C');
      assert.equal(h.patches[1].body.expectedUpdatedAt, 'A');
      h.patches[1].resolve({ id: 'qa', updatedAt: 'C', structuredLanguage: 'draft C' });
      await Promise.all([recovering, duplicate]);
      assert.equal(h.state.editorDirty, false);
      assert.equal(h.state.activeProject.structuredLanguage, 'draft C');
      assert.equal(h.context.document.getElementById('editor-save-state').textContent, 'Saved just now');
    });
  }

  await t.test('conflict, new route, and new account stop the reconnect retry', async () => {
    for (const reason of ['conflict', 'route', 'account']) {
      const h = await openEditor();
      Object.assign(h.state, { editorDirty: true, editorText: 'draft B' });
      const saving = h.run('saveEditor()');
      const recovering = h.online();
      if (reason === 'route') h.context.window.location.hash = '#dashboard';
      if (reason === 'account') h.state.user = { id: 'other-user' };
      h.patches[0].reject(reason === 'conflict'
        ? Object.assign(new Error('conflict'), { status: 409 })
        : new TypeError('Network unavailable'));
      await Promise.all([saving, recovering]);
      assert.equal(h.patches.length, 1, reason);
      assert.equal(h.state.editorText, 'draft B', reason);
      assert.equal(h.state.editorDirty, true, reason);
      assert.equal(h.state.editorConflict, reason === 'conflict', reason);
    }
  });
});

test('switching Output views keeps the mounted autosave status in sync', async (t) => {
  const success = { id: 'qa', updatedAt: '2026-11-25T00:00:00Z', structuredLanguage: 'draft B', name: 'Fixture', members: [], comments: [] };
  const outcomes = [
    { name: 'save succeeds', value: success, message: 'Saved just now', dirty: false },
    { name: 'newer edit waits to save', value: success, edit: 'draft C', message: 'Unsaved changes…', dirty: true },
    { name: 'network error', code: 503, message: /Save failed/, dirty: true, retry: true },
    { name: 'editing after a network error', code: 503, message: /Save failed/, dirty: true, editAfterFailure: true },
    { name: 'changing accounts after a network error', code: 503, message: /Save failed/, dirty: true, switchAccount: true },
    { name: 'loading another project after a network error', code: 503, message: /Save failed/, dirty: true, switchProject: true },
    { name: 'network error for earlier draft', code: 503, edit: 'draft C', message: 'Unsaved changes…', dirty: true },
    { name: 'missing revision', unavailable: true, message: /Save unavailable/, dirty: true },
    { name: 'revision conflict', code: 409, message: /Save conflict/, dirty: true },
  ];
  for (const scenario of outcomes) {
    await t.test(scenario.name, async () => {
      const h = savingHarness();
      Object.assign(h.state.activeProject, { name: 'Fixture', members: [], comments: [] });
      if (scenario.unavailable) delete h.state.activeProject.updatedAt;
      const { document, window } = h.context;
      window.location.hash = '#project/qa';
      window.requestAnimationFrame = () => {};
      const app = document.getElementById('app');
      const getElementById = document.getElementById;
      let attachedStatus;
      Object.defineProperty(app, 'innerHTML', {
        set(html) {
          const match = html.match(/id="editor-save-state"[^>]*>([^<]*)<\/div>/);
          assert.ok(match);
          attachedStatus = { textContent: match[1], setAttribute(name, value) { this[name] = value; } };
          assert.match(html, /id="output-panel" role="tabpanel" aria-labelledby="output-tab-/);
        },
      });
      document.getElementById = id => id === 'editor-save-state' ? attachedStatus : getElementById(id);
      let resolveSave, rejectSave;
      h.context.fixtureApi = (url, options) => {
        assert.equal(url, '/api/projects/qa');
        assert.equal(options.method, 'PATCH');
        assert.equal(options.body.expectedUpdatedAt, 'A');
        assert.equal(options.body.structuredLanguage, 'draft B');
        return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; });
      };
      h.run('api = fixtureApi; renderEditor();');
      const firstStatus = attachedStatus;
      const saving = h.run('saveEditor()');
      if (!scenario.unavailable) assert.equal(firstStatus.textContent, 'Saving…');
      if (scenario.edit) {
        h.state.editorText = scenario.edit;
        h.run('updateEditorOutputs()');
      }
      const switchView = mode => h.listeners.get('click')({ target: { closest: () => ({ dataset: { action: 'preview-mode', mode } }) } });
      for (const mode of ['json', 'flow']) {
        await switchView(mode);
        assert.equal(h.state.previewMode, mode);
      }
      const statusWhilePending = attachedStatus.textContent;
      assert.notEqual(attachedStatus, firstStatus);
      if (scenario.code) rejectSave(Object.assign(new Error('Fixture save failed'), { status: scenario.code }));
      else if (!scenario.unavailable) resolveSave(scenario.value);
      assert.equal(await saving, !scenario.code && !scenario.unavailable);
      if (typeof scenario.message === 'string') assert.equal(attachedStatus.textContent, scenario.message);
      else assert.match(attachedStatus.textContent, scenario.message);
      if (!scenario.unavailable) assert.equal(statusWhilePending, scenario.edit ? 'Unsaved changes…' : 'Saving…');
      assert.equal(h.state.editorText, scenario.edit ?? 'draft B');
      assert.equal(h.state.editorDirty, scenario.dirty);
      assert.equal(attachedStatus['data-http-status'], scenario.code === 409 ? '409' : undefined);

      if (scenario.dirty) {
        await switchView('interface');
        if (typeof scenario.message === 'string') assert.equal(attachedStatus.textContent, scenario.message);
        else assert.match(attachedStatus.textContent, scenario.message);
      }
      if (scenario.retry) {
        const retrying = h.run('saveEditor()');
        assert.equal(attachedStatus.textContent, 'Saving…');
        resolveSave(success);
        assert.equal(await retrying, true);
        assert.equal(attachedStatus.textContent, 'Saved just now');
        h.run('renderEditor()');
        assert.match(attachedStatus.textContent, /^Saved /);
      }
      if (scenario.editAfterFailure) {
        for (const text of ['draft C', 'draft B']) {
          h.state.editorText = text;
          h.run('updateEditorOutputs()');
          assert.equal(attachedStatus.textContent, 'Unsaved changes…');
        }
        await switchView('json');
        assert.equal(attachedStatus.textContent, 'Unsaved changes…');
      }
      if (scenario.switchAccount) {
        h.state.user = { id: 'another-user' };
        await switchView('json');
        assert.equal(attachedStatus.textContent, 'Unsaved changes…');
      }
      if (scenario.switchProject) {
        window.location.hash = '#project/other';
        h.context.nextProject = { ...success, id: 'other' };
        h.run('api = async () => nextProject;');
        assert.equal(await h.run('loadProject("other", { silent: true })'), true);
        h.state.editorDirty = true;
        await switchView('json');
        assert.equal(attachedStatus.textContent, 'Unsaved changes…');
      }
    });
  }
});

function inviteHarness() {
  const h = savingHarness();
  h.state.activeProject.members = [];
  h.context.window.location.hash = '#project/qa';
  h.context.fixtureMember = { userId: 'guest', role: 'Viewer', user: { name: 'Guest' } };
  h.context.inviteForm = {
    dataset: {}, isConnected: true,
    elements: { email: { value: 'guest@example.invalid' }, role: { value: 'Viewer' } },
    reset() { this.elements.email.value = ''; this.elements.role.value = 'Editor'; }
  };
  h.run(`
    globalThis.inviteRenderCount = 0;
    globalThis.FormData = class {
      constructor(form) { this.values = { email: form.elements.email.value, role: form.elements.role.value }; }
      get(name) { return this.values[name]; }
    };
    renderModal = () => { inviteRenderCount++; };
  `);
  return h;
}

test('a role change receipt advances autosave while keeping the draft', async () => {
  const h = inviteHarness();
  const before = '2026-11-24T00:00:00.000Z';
  const after = '2026-11-24T00:00:01.000Z';
  h.state.activeProject.updatedAt = before;
  h.state.activeProject.members.push(h.context.fixtureMember);
  const receipt = { ...h.context.fixtureMember, role: 'Commenter', previousUpdatedAt: before, updatedAt: after };
  const calls = [];
  h.context.fixtureApi = async (url, options) => {
    calls.push({ url, ...options });
    if (url.endsWith('/members/guest')) return receipt;
    if (options.body.expectedUpdatedAt !== after) throw Object.assign(new Error('conflict'), { status: 409 });
    return { id: 'qa', updatedAt: 'saved', structuredLanguage: options.body.structuredLanguage };
  };
  h.run('api = fixtureApi;');
  await h.run('updateMemberRole("guest", "Commenter")');
  assert.equal(calls[0].url, '/api/projects/qa/members/guest');
  assert.equal(calls[0].body.role, 'Commenter');
  assert.equal(h.state.editorText, 'draft B');
  assert.equal(h.state.editorDirty, true);
  assert.deepEqual(JSON.parse(JSON.stringify(h.state.activeProject.members)), [{ ...h.context.fixtureMember, role: 'Commenter' }]);
  assert.equal(await h.run('saveEditor()'), true);
  assert.equal(calls[1].body.expectedUpdatedAt, after);
});

test('a delayed role receipt or error cannot update a replaced editor', async t => {
  for (const response of ['success', 'error']) {
    await t.test(response, async () => {
      const h = inviteHarness();
      h.state.activeProject.members.push(h.context.fixtureMember);
      h.run(`
        api = () => new Promise((resolve, reject) => {
          globalThis.finishRole = resolve;
          globalThis.failRole = reject;
        });
      `);
      const pending = h.run('updateMemberRole("guest", "Commenter")');
      h.state.projectLoadRevision += 1;
      if (response === 'success') h.context.finishRole({ ...h.context.fixtureMember, role: 'Commenter' });
      else h.context.failRole(new Error('Role update failed'));
      await pending;
      assert.equal(h.state.activeProject.members[0].role, 'Viewer');
      assert.equal(h.state.activeProject.updatedAt, 'A');
      assert.equal(h.context.inviteRenderCount, 0);
      assert.equal(h.context.toasts.length, 0);
    });
  }
});

test('a successful invite acknowledges its revision for the next editor save', async () => {
  const h = inviteHarness();
  h.run(`
    globalThis.sent = [];
    api = async (url, options) => {
      sent.push({ url, ...options });
      if (options.method === 'POST') return { ...fixtureMember, previousUpdatedAt: 'A', updatedAt: 'B' };
      return { id: 'qa', updatedAt: 'C', structuredLanguage: options.body.structuredLanguage };
    };
  `);
  await h.run('inviteMember(inviteForm)');
  assert.equal(h.context.sent[0].url, '/api/projects/qa/share');
  assert.deepEqual(JSON.parse(JSON.stringify(h.state.activeProject.members)), [h.context.fixtureMember]);
  assert.equal(h.state.activeProject.updatedAt, 'B');
  assert.equal(await h.run('saveEditor()'), true);
  assert.equal(h.context.sent[1].body.expectedUpdatedAt, 'B');
});

test('an invite cannot adopt a revision that includes an unseen edit', async () => {
  const h = inviteHarness();
  h.run(`
    globalThis.sent = [];
    api = async (url, options) => {
      if (options.method === 'POST') return { ...fixtureMember, previousUpdatedAt: 'B', updatedAt: 'C' };
      sent.push(options.body);
      throw Object.assign(new Error('conflict'), { status: 409 });
    };
  `);
  await h.run('inviteMember(inviteForm)');
  assert.equal(h.state.activeProject.members[0].userId, 'guest');
  assert.equal(h.state.activeProject.updatedAt, 'A');
  assert.equal(await h.run('saveEditor()'), false);
  assert.equal(h.context.sent[0].expectedUpdatedAt, 'A');
  assert.equal(h.state.editorConflict, true);
  assert.equal(h.state.editorText, 'draft B');
});

test('a late invite response cannot update a different editor context', async () => {
  const h = inviteHarness();
  h.run(`
    api = () => new Promise(resolve => { globalThis.completeInvite = resolve; });
  `);
  const invitation = h.run('inviteMember(inviteForm)');
  h.context.window.location.hash = '#project/elsewhere';
  h.context.completeInvite({ ...h.context.fixtureMember, previousUpdatedAt: 'A', updatedAt: 'B' });
  await invitation;
  assert.equal(h.state.activeProject.updatedAt, 'A');
  assert.deepEqual(h.state.activeProject.members, []);
  assert.equal(h.context.inviteRenderCount, 0);
  assert.equal(h.context.toasts.length, 0);
});

test('an invitation receipt updates the member list without erasing a newer invite draft', async t => {
  for (const scenario of ['unchanged', 'email changed', 'role changed', 'form reopened', 'request failed']) {
    await t.test(scenario, async () => {
      const h = inviteHarness();
      const { document, inviteForm } = h.context;
      const { email, role } = inviteForm.elements;
      const list = document.getElementById('share-member-list');
      list.contains = () => false;
      h.state.modal = { type: 'share' };
      h.state.shareTab = 'invite';
      document.activeElement = email;
      h.run(`
        globalThis.requests = [];
        api = (url, { body }) => new Promise((resolve, reject) => requests.push({ body, resolve, reject }));
      `);

      const pending = h.run('inviteMember(inviteForm)');
      assert.deepEqual({ ...h.context.requests[0].body }, { email: 'guest@example.invalid', role: 'Viewer' });
      if (scenario === 'email changed') email.value = 'next@example.invalid';
      if (scenario === 'role changed') role.value = 'Commenter';
      if (scenario === 'form reopened') {
        inviteForm.isConnected = false;
        document.activeElement = { value: 'new-dialog@example.invalid' };
      }
      const focused = document.activeElement;
      if (scenario === 'request failed') h.context.requests[0].reject(new Error('Invitation unavailable'));
      else h.context.requests[0].resolve(h.context.fixtureMember);
      await pending;

      assert.equal(h.context.inviteRenderCount, 0);
      assert.equal(document.activeElement, focused);
      if (scenario === 'request failed') {
        assert.equal(list.innerHTML, '');
        assert.equal(h.context.toasts[0], 'Invitation unavailable');
      } else {
        assert.match(list.innerHTML, /Guest/);
      }
      assert.equal(email.value, scenario === 'unchanged' ? '' : scenario === 'email changed' ? 'next@example.invalid' : 'guest@example.invalid');
      assert.equal(role.value, scenario === 'unchanged' ? 'Editor' : scenario === 'role changed' ? 'Commenter' : 'Viewer');
    });
  }
});

test('the same invite form submits one request at a time and can retry after failure', async () => {
  const h = inviteHarness();
  h.run(`
    globalThis.requests = [];
    api = () => new Promise((resolve, reject) => requests.push({ resolve, reject }));
  `);
  const pending = h.run('inviteMember(inviteForm)');
  const duplicate = h.run('inviteMember(inviteForm)');
  for (const request of h.context.requests) request.reject(new Error('Invitation unavailable'));
  await Promise.all([pending, duplicate]);
  assert.equal(h.context.requests.length, 1);
  assert.equal(h.context.inviteForm.elements.email.value, 'guest@example.invalid');

  const retry = h.run('inviteMember(inviteForm)');
  assert.equal(h.context.requests.length, 2);
  h.context.requests[1].resolve(h.context.fixtureMember);
  await retry;
  assert.equal(h.context.inviteForm.elements.email.value, '');
});

function editorActionHarness(action) {
  const h = savingHarness();
  const pending = [];
  h.context.window.location.hash = '#project/qa';
  h.context.fixtureApi = (url, options) => new Promise((resolve, reject) => {
    assert.equal(url, '/api/projects/qa');
    assert.equal(options.method, 'PATCH');
    pending.push({ resolve, reject, body: options.body });
  });
  h.run('api = fixtureApi;');
  h.run('renderModal = () => {};');
  const click = (clickedAction = action) => h.listeners.get('click')({
    target: { closest: () => ({ dataset: { action: clickedAction } }) },
  });
  return { ...h, pending, click };
}
test('leaving the editor waits for edits made while the first save is in flight', async () => {
  const h = editorActionHarness('back-dashboard');
  const leaving = h.click();
  assert.equal(h.pending.length, 1);
  assert.equal(h.pending[0].body.structuredLanguage, 'draft B');
  h.state.editorText = 'draft C';
  h.pending[0].resolve({ id: 'qa', updatedAt: 'B', structuredLanguage: 'draft B' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.context.window.location.hash, '#project/qa');
  assert.equal(h.pending.length, 2);
  assert.equal(h.pending[1].body.expectedUpdatedAt, 'B');
  assert.equal(h.pending[1].body.structuredLanguage, 'draft C');
  h.pending[1].resolve({ id: 'qa', updatedAt: 'C', structuredLanguage: 'draft C' });
  await leaving;
  assert.equal(h.context.window.location.hash, '#dashboard');
  assert.equal(h.state.editorDirty, false);
});
test('a failed follow-up save keeps the editor and unsaved draft open', async () => {
  const h = editorActionHarness('back-dashboard');
  const leaving = h.click();
  h.state.editorText = 'draft C';
  h.pending[0].resolve({ id: 'qa', updatedAt: 'B', structuredLanguage: 'draft B' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.pending.length, 2);
  h.pending[1].reject(Object.assign(new Error('conflict'), { status: 409 }));
  await leaving;
  assert.equal(h.context.window.location.hash, '#project/qa');
  assert.equal(h.state.editorText, 'draft C');
  assert.equal(h.state.editorDirty, true);
  assert.equal(h.state.editorConflict, true);
});
test('a late save cannot redirect over a newer route before the editor reloads', async () => {
  const h = editorActionHarness('back-dashboard');
  const leaving = h.click();
  h.context.window.location.hash = '#project/another';
  h.pending[0].resolve({ id: 'qa', updatedAt: 'B', structuredLanguage: 'draft B' });
  await leaving;
  assert.equal(h.context.window.location.hash, '#project/another');
  assert.equal(h.pending.length, 1);
});

test('browser history waits for the draft, preserves its entry on error, and follows the latest route', async (t) => {
  async function historyHarness({ indexed = false, rapid = false, unmarked = false } = {}) {
    const h = clientHarness();
    const { window } = h.context;
    const entries = ['#projects', '#dashboard', '#project/qa']
      .map((hash, index) => ({ hash, state: null, browserEntry: { index } }));
    const restorations = [];
    const pending = [];
    const subscriptions = [];
    let index = 0;
    let length = 1;
    let project = { id: 'qa', updatedAt: 'A', structuredLanguage: 'original' };
    window.history = {
      get state() { return entries[index].state; },
      get length() { return length; },
      replaceState(state) { entries[index].state = state; },
      go(distance) { restorations.push(distance); },
      pushState(state, _title, hash) {
        const previous = index++;
        entries.splice(index, length, { hash, state });
        length = index + 1;
        window.location.hash = hash;
        assert.equal(entries[previous].hash, '#dashboard');
      }
    };
    if (indexed) window.navigation = { get currentEntry() { return entries[index].browserEntry; } };
    const traverse = (next) => {
      length = Math.max(length, next + 1);
      index = next;
      window.location.hash = entries[index].hash;
      return h.windowListeners.get('hashchange')();
    };
    h.state.user = { id: 'fixture-user' };
    h.context.subscriptions = subscriptions;
    h.context.fixtureApi = (url, options) => {
      assert.equal(url, '/api/projects/qa');
      if (!options) return project;
      assert.equal(options.method, 'PATCH');
      return new Promise((resolve, reject) => pending.push({ resolve, reject, body: options.body }));
    };
    h.run(`
      globalThis.pages = [];
      api = fixtureApi;
      renderShell = page => pages.push(page);
      renderEditor = () => pages.push('editor');
      connectStream = projectId => subscriptions.push(projectId);
      startPresence = () => {};
      showToast = () => {};
    `);
    await traverse(0);
    if (!rapid) await traverse(1);
    await traverse(2);
    if (unmarked) entries[1].state = null;
    h.state.editorText = 'draft B';
    h.state.editorDirty = true;
    const accept = (request, updatedAt) => {
      project = { ...project, updatedAt, structuredLanguage: request.body.structuredLanguage };
      request.resolve(project);
    };
    return { ...h, accept, pending, restorations, subscriptions, traverse };
  }

  await t.test('multiple Back navigations wait for the latest edit and preserve Forward', async () => {
    const h = await historyHarness();
    const leaving = h.traverse(1);
    assert.equal(h.pending[0].body.structuredLanguage, 'draft B');
    h.state.editorText = 'draft C';
    await h.traverse(0);
    h.accept(h.pending[0], 'B');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.pending.length, 2);
    assert.equal(h.pending[1].body.structuredLanguage, 'draft C');
    assert.equal(h.pending[1].body.expectedUpdatedAt, 'B');
    assert.equal(h.context.pages.at(-1), 'editor');
    h.accept(h.pending[1], 'C');
    await leaving;
    assert.equal(h.context.pages.at(-1), 'projects');
    assert.deepEqual(h.restorations, []);
    await h.traverse(1);
    assert.equal(h.context.pages.at(-1), 'dashboard');
    await h.traverse(2);
    assert.equal(h.context.pages.at(-1), 'editor');
    assert.equal(h.state.editorText, 'draft C');
  });

  for (const status of [500, 409]) {
    await t.test(`a ${status} response keeps the draft and returns to the original entry`, async () => {
      const h = await historyHarness();
      const leaving = h.traverse(1);
      await h.traverse(0);
      h.state.editorText = 'keep my latest draft';
      const beforeReturn = h.subscriptions.length;
      h.pending[0].reject(Object.assign(new Error('Save failed'), { status }));
      await leaving;
      assert.deepEqual(h.restorations, [2]);
      await h.traverse(2);
      assert.deepEqual(Array.from(h.context.pages), ['projects', 'dashboard', 'editor']);
      assert.equal(h.state.editorDirty, true);
      assert.equal(h.state.editorConflict, status === 409);
      assert.equal(h.state.editorText, 'keep my latest draft');
      assert.deepEqual(h.subscriptions.slice(beforeReturn), ['qa']);
    });
  }

  await t.test('a failed Back accounts for an intermediate hash that never rendered', async () => {
    const h = await historyHarness({ rapid: true });
    const leaving = h.traverse(1);
    await h.traverse(0);
    h.pending[0].reject(new Error('Save failed'));
    await leaving;
    assert.deepEqual(h.restorations, [2]);
    assert.equal(h.pending.length, 1);
  });

  await t.test('a recovery traversal that misses the editor never retries the failed save', async () => {
    const h = await historyHarness({ rapid: true });
    const leaving = h.traverse(0);
    h.pending[0].reject(new Error('Save failed'));
    await leaving;
    assert.deepEqual(h.restorations, [2]);
    await h.traverse(1);
    assert.equal(h.pending.length, 1);
    assert.equal(h.context.window.location.hash, '#project/qa');
    assert.equal(h.state.editorText, 'draft B');
  });

  await t.test('a browser history index can restore the editor from an unmarked destination', async () => {
    const h = await historyHarness({ indexed: true, unmarked: true });
    const leaving = h.traverse(1);
    h.pending[0].reject(new Error('Save failed'));
    await leaving;
    assert.deepEqual(h.restorations, [1]);
    assert.equal(h.context.window.location.hash, '#dashboard');
    await h.traverse(2);
    assert.equal(h.state.editorText, 'draft B');
  });

  await t.test('an older browser recovers from unmarked history without overwriting the destination', async () => {
    const h = await historyHarness({ unmarked: true });
    const leaving = h.traverse(1);
    const beforeReturn = h.subscriptions.length;
    h.pending[0].reject(new Error('Save failed'));
    await leaving;
    assert.deepEqual(h.restorations, []);
    assert.equal(h.context.window.location.hash, '#project/qa');
    assert.equal(h.state.editorText, 'draft B');
    assert.deepEqual(h.subscriptions.slice(beforeReturn), ['qa']);
    const retry = h.traverse(1);
    h.accept(h.pending[1], 'B');
    await retry;
    assert.equal(h.context.pages.at(-1), 'dashboard');
  });

  await t.test('Forward during a pending save returns to the same mounted editor', async () => {
    const h = await historyHarness();
    const leaving = h.traverse(1);
    await h.traverse(2);
    h.pending[0].reject(new Error('Save failed'));
    await leaving;
    assert.equal(h.pending.length, 1);
    assert.deepEqual(h.restorations, []);
    assert.deepEqual(Array.from(h.context.pages), ['projects', 'dashboard', 'editor']);
    assert.equal(h.state.editorText, 'draft B');
    assert.equal(h.state.editorDirty, true);
  });
});

test('Share opens only after edits made during the current save are acknowledged', async () => {
  const h = editorActionHarness('share');
  const sharing = h.click();
  h.state.editorText = 'Latest draft';
  h.pending[0].resolve({ id: 'qa', updatedAt: 'B', structuredLanguage: 'draft B' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.state.modal, null);
  assert.equal(h.pending.length, 2);
  assert.equal(h.pending[1].body.expectedUpdatedAt, 'B');
  assert.equal(h.pending[1].body.structuredLanguage, 'Latest draft');
  h.pending[1].resolve({ id: 'qa', updatedAt: 'C', structuredLanguage: 'Latest draft' });
  await sharing;
  assert.equal(h.state.modal.type, 'share');
  assert.equal(h.state.activeProject.structuredLanguage, 'Latest draft');
});

function workflowSaveHarness() {
  const h = editorActionHarness();
  Object.assign(h.state.activeProject, { name: 'Fixture workflow', status: 'Draft', members: [], comments: [] });
  h.run('renderEditor()');
  const button = h.context.document.getElementById('app').innerHTML.match(/<button[^>]+class="[^"]*editor-publish[^"]*"[^>]*>(.*?)<\/button>/)?.[0];
  assert.ok(button);
  const action = button.match(/data-action="([^"]+)"/)?.[1];
  assert.ok(action);
  return { ...h, button, click: () => h.click(action) };
}

test('the editor workflow save button confirms only after the latest draft is acknowledged', async () => {
  const h = workflowSaveHarness();
  const saving = h.click();
  h.state.editorText = 'Latest draft';
  h.pending[0].resolve({ id: 'qa', updatedAt: 'B', structuredLanguage: 'draft B' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.context.toasts.length, 0);
  assert.equal(h.pending.length, 2);
  assert.equal(h.pending[1].body.expectedUpdatedAt, 'B');
  assert.equal(h.pending[1].body.structuredLanguage, 'Latest draft');
  h.pending[1].resolve({ id: 'qa', updatedAt: 'C', structuredLanguage: 'Latest draft' });
  await saving;

  assert.match(h.button, /<span>Save workflow<\/span>/);
  assert.equal(h.state.editorDirty, false);
  assert.equal(h.state.activeProject.structuredLanguage, 'Latest draft');
  assert.deepEqual(Array.from(h.context.toasts), ['Workflow saved.']);
});

test('the editor workflow save button preserves the draft when the follow-up write fails', async () => {
  const h = workflowSaveHarness();
  const saving = h.click();
  h.state.editorText = 'Unsaved update';
  h.pending[0].resolve({ id: 'qa', updatedAt: 'B', structuredLanguage: 'draft B' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.pending.length, 2);
  h.pending[1].reject(new Error('Write failed'));
  await saving;

  assert.equal(h.state.editorDirty, true);
  assert.equal(h.state.editorText, 'Unsaved update');
  assert.deepEqual(Array.from(h.context.toasts), ['Write failed']);
});

test('the editor workflow save button does not confirm a save after navigating to a different route', async () => {
  const h = workflowSaveHarness();
  const saving = h.click();
  h.context.window.location.hash = '#project/another';
  h.pending[0].resolve({ id: 'qa', updatedAt: 'B', structuredLanguage: 'draft B' });
  await saving;

  assert.equal(h.pending.length, 1);
  assert.equal(h.context.toasts.length, 0);
  assert.equal(h.context.window.location.hash, '#project/another');
});

test('Share stays closed when the newest save fails', async () => {
  const h = editorActionHarness('share');
  const sharing = h.click();
  h.state.editorText = 'Keep this draft';
  h.pending[0].resolve({ id: 'qa', updatedAt: 'B', structuredLanguage: 'draft B' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.pending.length, 2);
  h.pending[1].reject(Object.assign(new Error('conflict'), { status: 409 }));
  await sharing;
  assert.equal(h.state.modal, null);
  assert.equal(h.state.editorConflict, true);
  assert.equal(h.state.editorText, 'Keep this draft');
});
test('A late save cannot open Share on a newer editor route', async () => {
  const h = editorActionHarness('share');
  const sharing = h.click();
  h.context.window.location.hash = '#project/another';
  h.pending[0].resolve({ id: 'qa', updatedAt: 'B', structuredLanguage: 'draft B' });
  await sharing;
  assert.equal(h.state.modal, null);
  assert.equal(h.context.window.location.hash, '#project/another');
});
test('Comments waits for all current editor changes to save before opening', async () => {
  const h = editorActionHarness('comments');
  const opening = h.click();
  h.state.editorText = 'Latest workflow';
  h.pending[0].resolve({ id: 'qa', updatedAt: 'B', structuredLanguage: 'draft B' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.state.modal, null);
  assert.equal(h.pending.length, 2);
  assert.equal(h.pending[1].body.structuredLanguage, 'Latest workflow');
  h.pending[1].resolve({ id: 'qa', updatedAt: 'C', structuredLanguage: 'Latest workflow' });
  await opening;
  assert.equal(h.state.modal.type, 'comments');
});

function commentHarness() {
  const h = savingHarness();
  h.context.window.location.hash = '#project/qa';
  h.state.activeProject.comments = [];
  h.state.editorDirty = false;
  h.context.FormData = class {
    constructor(form) { this.form = form; }
    get(name) { return this.form.elements[name].value; }
  };
  h.context.fixtureForm = {
    isConnected: true,
    dataset: { form: 'new-comment' },
    elements: { body: { value: 'Review note' }, anchor: { value: 'WHEN' } },
    reset() {
      this.elements.body.value = '';
      this.elements.anchor.value = 'General';
    }
  };
  h.run('renderModal = () => {};');
  return h;
}

test('an edit while posting a comment saves once the comment revision arrives', async () => {
  const h = commentHarness();
  const pending = [];
  h.context.fixtureApi = (url, options) => new Promise(resolve => pending.push({ resolve, url, ...options }));
  h.run('api = fixtureApi;');
  h.state.modal = { type: 'comments' };
  const posting = h.listeners.get('submit')({ target: h.context.fixtureForm, preventDefault() {} });
  assert.equal(pending[0].url, '/api/projects/qa/comments');
  h.state.modal = null;
  h.context.fixtureForm.isConnected = false;
  h.state.editorText = 'Edit made while posting';
  h.state.editorDirty = true;
  const saving = h.run('saveEditor()');
  assert.equal(pending.length, 1);
  pending[0].resolve({ id: 'note', body: 'Review note', previousUpdatedAt: 'A', updatedAt: 'B' });
  await posting;
  assert.equal(h.state.activeProject.comments[0].id, 'note');
  assert.equal(typeof h.state.activeProject.comments[0].updatedAt, 'undefined');
  assert.equal(h.state.modal, null);
  assert.equal(pending[1].body.expectedUpdatedAt, 'B');
  assert.equal(pending[1].body.structuredLanguage, 'Edit made while posting');
  pending[1].resolve({ id: 'qa', updatedAt: 'C', structuredLanguage: pending[1].body.structuredLanguage });
  assert.equal(await saving, true);
});

test('realtime comments refresh the visible discussion without replacing the drawer', async t => {
  const h = editorStreamHarness();
  t.after(h.close);
  await h.open();
  const { document } = h.context;
  const modal = document.getElementById('modal-root');
  const list = document.getElementById('comment-list');
  const badge = document.getElementById('comments-open-count');
  const toolbar = document.getElementById('comments-button-label');
  h.state.modal = { type: 'comments' };
  modal.innerHTML = h.run('renderCommentsDrawer()');
  const originalDrawer = modal.innerHTML;
  h.run('renderModal = () => { throw new Error("Must keep the mounted Comments drawer"); };');
  await h.commentAdded();
  assert.equal(modal.innerHTML, originalDrawer);
  assert.match(list.innerHTML, /&lt;Review&gt;/);
  assert.equal(badge.textContent, '1 open');
  assert.equal(toolbar.textContent, 'Comments · 1');

  await h.commentUpdated();
  assert.match(list.innerHTML, /Reopen/);
  assert.equal(badge.textContent, '0 open');
  assert.equal(toolbar.textContent, 'Comments');

  const currentList = list.innerHTML;
  await h.commentAdded(undefined, 'old-project');
  h.state.streamController = new AbortController();
  await h.commentAdded();
  assert.equal(h.state.activeProject.comments.length, 1);
  assert.equal(list.innerHTML, currentList);
  assert.deepEqual(Array.from(h.context.toasts), ['Reviewer added a comment']);
});

test('a successful comment clears only the submitted draft still in the composer', async () => {
  const h = commentHarness();
  const form = h.context.fixtureForm;
  h.run('api = () => new Promise(resolve => { globalThis.completeComment = resolve; });');
  const first = h.run('addComment(fixtureForm)');
  form.elements.body.value = 'Next review';
  form.elements.anchor.value = 'THEN';
  await h.run('addComment(fixtureForm)');
  h.context.completeComment({ id: 'first', body: 'Review note', anchor: 'WHEN' });
  await first;
  assert.equal(form.elements.body.value, 'Next review');
  assert.equal(form.elements.anchor.value, 'THEN');
  assert.equal(h.state.activeProject.comments.length, 1);

  const second = h.run('addComment(fixtureForm)');
  h.context.completeComment({ id: 'second', body: 'Next review', anchor: 'THEN' });
  await second;
  assert.equal(form.elements.body.value, '');
  assert.equal(form.elements.anchor.value, 'General');
  assert.equal(h.state.activeProject.comments.length, 2);
});

test('resolving a comment cannot adopt a revision with an unseen collaborator edit', async () => {
  const h = commentHarness();
  h.state.activeProject.comments = [{ id: 'note', resolved: false }];
  h.run(`
    globalThis.sent = [];
    api = async (url, { method, body }) => {
      sent.push({ url, method, body });
      if (url.endsWith('/comments/note')) return { id: 'note', resolved: true, previousUpdatedAt: 'B', updatedAt: 'C' };
      throw Object.assign(new Error('conflict'), { status: 409 });
    };
  `);
  await h.listeners.get('click')({
    target: { closest: () => ({ dataset: { action: 'resolve-comment', commentId: 'note', resolved: 'false' } }) },
  });
  assert.equal(h.state.activeProject.comments[0].resolved, true);
  assert.equal(h.state.activeProject.updatedAt, 'A');
  h.state.editorText = 'Local draft';
  h.state.editorDirty = true;
  assert.equal(await h.run('saveEditor()'), false);
  assert.equal(h.context.sent[1].body.expectedUpdatedAt, 'A');
  assert.equal(h.state.editorText, 'Local draft');
});

test('an earlier Comments response cannot update a newly opened editor', async () => {
  const h = commentHarness();
  h.run('api = () => new Promise(resolve => { globalThis.completeComment = resolve; });');
  const posting = h.run('addComment(fixtureForm)');
  h.context.window.location.hash = '#project/other';
  h.state.projectLoadRevision++;
  h.state.activeProject = { id: 'other', updatedAt: 'Z', comments: [] };
  h.context.completeComment({ id: 'note', previousUpdatedAt: 'A', updatedAt: 'B' });
  await posting;
  assert.deepEqual(h.state.activeProject.comments, []);
  assert.equal(h.state.activeProject.updatedAt, 'Z');
  assert.equal(h.context.toasts.length, 0);
});

test('Version history waits for the latest draft even if typing continues during the initial save', async () => {
  const h = editorActionHarness('versions');
  const opening = h.click();
  h.state.editorText = 'Latest workflow';
  h.pending[0].resolve({ id: 'qa', updatedAt: 'B', structuredLanguage: 'draft B' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.state.modal, null);
  assert.equal(h.pending.length, 2);
  assert.equal(h.pending[1].body.structuredLanguage, 'Latest workflow');
  h.pending[1].resolve({ id: 'qa', updatedAt: 'C', structuredLanguage: 'Latest workflow' });
  await opening;
  assert.equal(h.state.modal.type, 'versions');
});

test('saving a named checkpoint advances the revision for the next edit', async () => {
  const h = savingHarness();
  h.state.activeProject.versions = [];
  h.state.editorDirty = false;
  h.context.window.location.hash = '#project/qa';
  h.context.window.prompt = () => 'My review';
  h.run(`
    globalThis.sent = [];
    renderModal = () => {};
    api = async (url, { method, body }) => {
      sent.push({ url, method, body });
      if (method === 'POST') return { id: 'checkpoint', number: '1.0.1', previousUpdatedAt: 'A', updatedAt: 'B' };
      return { id: 'qa', updatedAt: 'C', structuredLanguage: body.structuredLanguage };
    };
  `);
  await h.run('createVersion()');
  assert.equal(h.context.sent[0].url, '/api/projects/qa/versions');
  assert.equal(h.context.sent[0].body.expectedUpdatedAt, 'A');
  assert.equal(h.context.sent[0].body.message, 'My review');
  assert.equal(h.state.activeProject.versions[0].id, 'checkpoint');
  assert.equal(h.state.activeProject.updatedAt, 'B');
  h.state.editorText = 'Edit since checkpoint';
  h.state.editorDirty = true;
  assert.equal(await h.run('saveEditor()'), true);
  assert.equal(h.context.sent[1].body.expectedUpdatedAt, 'B');
});

test('a delayed checkpoint response respects the current editor dialog and selection', async t => {
  const cases = [
    { name: 'Share has been opened', modal: 'share', renders: 0 },
    { name: 'Comments has been opened', modal: 'comments', renders: 0 },
    { name: 'Version history has been closed', modal: null, renders: 0 },
    { name: 'Version history and selection still match', modal: 'versions', sameModal: true, autoSelect: true, renders: 1 },
    { name: 'another version has been selected', modal: 'versions', sameModal: true, selection: 'older', renders: 1 },
    { name: 'Version history has been reopened', modal: 'versions', renders: 1 }
  ];
  for (const { name, modal, sameModal, selection = 'latest', autoSelect, renders } of cases) {
    await t.test(name, async () => {
      const h = savingHarness();
      h.state.activeProject.versions = [{ id: 'latest' }, { id: 'older' }];
      h.state.editorDirty = false;
      h.state.modal = { type: 'versions' };
      h.state.selectedVersionId = 'latest';
      h.context.window.location.hash = '#project/qa';
      h.context.window.prompt = () => 'My review';
      let pending;
      h.context.fixtureApi = (url, options) => {
        assert.equal(url, '/api/projects/qa/versions');
        assert.equal(options.method, 'POST');
        return new Promise(resolve => { pending = resolve; });
      };
      h.run('api = fixtureApi; globalThis.modalRenders = 0; renderModal = () => { modalRenders++; };');

      const saving = h.run('createVersion()');
      await new Promise(resolve => setImmediate(resolve));
      const currentModal = sameModal ? h.state.modal : modal && { type: modal };
      h.state.modal = currentModal;
      h.state.selectedVersionId = selection;
      pending({ id: 'checkpoint', number: '1.0.1', previousUpdatedAt: 'A', updatedAt: 'B' });
      await saving;

      assert.equal(h.state.modal, currentModal);
      assert.equal(h.state.activeProject.versions[0].id, 'checkpoint');
      assert.equal(h.state.activeProject.updatedAt, 'B');
      assert.equal(h.context.modalRenders, renders);
      assert.equal(h.state.selectedVersionId, autoSelect ? 'checkpoint' : selection);
      assert.equal(h.context.toasts[0], 'Version 1.0.1 saved');
    });
  }
});

function editorStreamHarness({ renderEditor = false } = {}) {
  const h = savingHarness();
  const original = '2026-11-24T00:00:00.000Z';
  const updated = '2026-11-24T00:00:01.000Z';
  const version = { id: 'checkpoint', number: '1.0.1', user: { name: 'Collaborator' } };
  const note = { id: 'note', body: '<Review>', anchor: 'WHEN', user: { name: 'Reviewer' }, resolved: false };
  h.context.window.location.hash = '#project/qa';
  h.state.activeProject.updatedAt = original;
  h.state.activeProject.versions = [];
  h.state.activeProject.members = [];
  h.state.activeProject.comments = [];
  h.context.TextDecoder = TextDecoder;
  let stream;
  h.context.fetch = async (url) => {
    assert.equal(url, '/api/events?projectId=qa');
    return { ok: true, body: new ReadableStream({
      start(controller) { stream = controller; },
      cancel() { stream = null; }
    }) };
  };
  h.run(`
    supabaseClient = { auth: { getSession: async () => ({ data: { session: { access_token: 'fixture' } } }) } };
  `);
  if (!renderEditor) h.run(`renderEditor = () => { throw new Error('Metadata event must keep the mounted editor'); };`);
  async function receive(message) {
    stream?.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(message)}\n\n`));
    await new Promise(resolve => setImmediate(resolve));
  }
  async function open(userId = h.state.user.id) {
    h.run('connectStream("qa")');
    await new Promise(resolve => setImmediate(resolve));
    await receive({ type: 'connected', payload: { userId } });
  }
  function checkpoint(revision = { previousUpdatedAt: original, updatedAt: updated }, projectId = 'qa') {
    return receive({ type: 'version_created', projectId, payload: { version, ...revision } });
  }
  function invitation(revision = { previousUpdatedAt: original, updatedAt: updated }, projectId = 'qa') {
    const member = { userId: 'invitee', role: 'Viewer', user: { name: 'New member' } };
    return receive({ type: 'member_invited', projectId, payload: { member, ...revision } });
  }
  function memberUpdate(revision = { previousUpdatedAt: original, updatedAt: updated }, projectId = 'qa') {
    const member = { userId: 'invitee', role: 'Commenter', user: { name: 'New member' } };
    return receive({ type: 'member_updated', projectId, payload: { member, ...revision } });
  }
  function commentAdded(revision = { previousUpdatedAt: original, updatedAt: updated }, projectId = 'qa') {
    return receive({ type: 'comment_added', projectId, payload: { comment: note, ...revision } });
  }
  function commentUpdated(revision = { previousUpdatedAt: original, updatedAt: updated }, projectId = 'qa') {
    return receive({ type: 'comment_updated', projectId, payload: { comment: { ...note, resolved: true }, ...revision } });
  }
  return { ...h, original, updated, note, open, receive, checkpoint, invitation, memberUpdate, commentAdded, commentUpdated, close: () => stream?.close() };
}

test('realtime reconnects after EOF and transient failure without remounting the editor', async () => {
  const h = savingHarness();
  h.context.window.location.hash = '#project/qa';
  h.context.TextDecoder = TextDecoder;
  h.state.activeProject.versions = [];
  const pendingTimers = [];
  h.context.window.setTimeout = (retry, delay) => pendingTimers.push({ retry, delay });
  const attempts = [];
  h.context.fetch = async (url, { signal }) => {
    assert.equal(url, '/api/events?projectId=qa');
    const attempt = { signal };
    attempts.push(attempt);
    if (attempts.length === 2) return { ok: false, status: 503 };
    return { ok: true, body: new ReadableStream({ start(stream) { attempt.stream = stream; } }) };
  };
  h.run(`
    supabaseClient = { auth: { getSession: async () => ({ data: { session: { access_token: 'fixture' } } }) } };
    renderEditor = () => { throw new Error('Retry must keep the mounted editor'); };
  `);
  const focus = {};
  h.context.document.activeElement = focus;
  const tick = () => new Promise(resolve => setImmediate(resolve));
  const send = (attempt, message) => attempt.stream.enqueue(
    new TextEncoder().encode(`data: ${JSON.stringify(message)}\n\n`));

  h.run('connectStream("qa")');
  await tick();
  send(attempts[0], { type: 'connected', payload: { userId: h.state.user.id } });
  attempts[0].stream.close();
  await tick();
  assert.equal(pendingTimers.length, 1);
  assert.equal(pendingTimers[0].delay, 1000);
  pendingTimers.shift().retry();
  await tick();
  assert.equal(pendingTimers.length, 1);
  assert.equal(pendingTimers[0].delay, 2000);
  pendingTimers.shift().retry();
  await tick();
  assert.equal(attempts.length, 3);
  assert.notEqual(attempts[0].signal, attempts[2].signal);
  send(attempts[2], { type: 'connected', payload: { userId: h.state.user.id } });
  send(attempts[2], { type: 'version_created', projectId: 'qa', payload: {
    version: { id: 'checkpoint', user: { name: 'Collaborator' } }
  } });
  await tick();
  assert.equal(h.state.activeProject.versions[0]?.id, 'checkpoint');
  assert.equal(h.state.editorText, 'draft B');
  assert.equal(h.context.document.activeElement, focus);
  h.run('disconnectStream()');
  attempts[2].stream.close();
  await tick();
  assert.equal(pendingTimers.length, 0);
});

test('realtime backs off during repeated errors and stops on project refusal', async () => {
  const h = savingHarness();
  h.context.window.location.hash = '#project/qa';
  const timers = [];
  h.context.window.setTimeout = (retry, delay) => timers.push({ retry, delay });
  const delays = [1000, 2000, 4000, 8000, 16_000, 30_000, 30_000];
  let attempts = 0;
  h.context.fetch = async () => {
    if (++attempts <= delays.length) throw new TypeError('Temporary network failure');
    return { ok: false, status: 404 };
  };
  h.run(`
    supabaseClient = { auth: { getSession: async () => ({ data: { session: { access_token: 'fixture' } } }) } };
    connectStream('qa');
  `);

  const tick = () => new Promise(resolve => setImmediate(resolve));
  for (const delay of delays) {
    await tick();
    assert.equal(timers.length, 1);
    assert.equal(timers[0].delay, delay);
    timers.shift().retry();
  }
  await tick();
  assert.equal(attempts, delays.length + 1);
  assert.equal(timers.length, 0);
  assert.equal(h.state.streamController, null);
});

test('a clean editor accepts only newer workflow snapshots from its current stream', async t => {
  const h = editorStreamHarness();
  t.after(h.close);
  const renders = [];
  h.context.renders = renders;
  h.run('renderEditor = (options) => renders.push(options);');
  h.state.editorDirty = false;
  h.state.activeProject.updatedAt = h.updated;
  h.state.editorText = h.state.activeProject.structuredLanguage;
  const presence = [{ id: 'local-presence' }];
  h.state.activeProject.presence = presence;
  const latest = '2026-11-24T00:00:02.000Z';
  const publish = (project, projectId = 'qa') => h.receive({
    type: 'project_updated', projectId,
    payload: { project: { ...h.state.activeProject, updatedAt: latest, structuredLanguage: 'new workflow', ...project } }
  });

  await h.open('other-user');
  await publish();
  h.close();
  await h.open();
  h.state.streamController = new AbortController();
  await publish();
  await h.open();
  await publish({ updatedAt: h.original });
  await publish({ updatedAt: h.updated });
  await publish({ updatedAt: 'invalid' });
  await publish({ id: 'other-project' });
  await publish({}, 'other-project');
  await publish({ comments: undefined });

  assert.equal(h.state.activeProject.updatedAt, h.updated);
  assert.equal(h.state.editorText, 'original');
  assert.equal(renders.length, 0);
  assert.equal(h.context.toasts.length, 0);

  await publish({ presence: [] });
  assert.equal(h.state.activeProject.updatedAt, latest);
  assert.equal(h.state.editorText, 'new workflow');
  assert.equal(h.state.activeProject.presence, presence);
  assert.equal(renders.length, 1);
  assert.equal(renders[0].preserveCollaborationDrafts, true);
  assert.deepEqual(Array.from(h.context.toasts), ['A collaborator updated the workflow']);
});

test('a newer workflow arriving before a save response is reconciled without losing local typing', async t => {
  for (const dirtyAfterRequest of [false, true]) {
    await t.test(dirtyAfterRequest ? 'keep new typing and pause autosave' : 'apply the latest saved workflow', async st => {
      const h = editorStreamHarness();
      st.after(h.close);
      const calls = [];
      const renders = [];
      h.context.fixtureApi = (_url, { body }) => new Promise(resolve => calls.push({ body, resolve }));
      h.context.renders = renders;
      h.run('api = fixtureApi; renderEditor = (options) => renders.push(options);');
      await h.open();
      const save = h.run('saveEditor()');
      if (dirtyAfterRequest) h.state.editorText = 'additional local typing';
      const publish = (updatedAt, structuredLanguage, id = 'qa') => h.receive({
        type: 'project_updated', projectId: 'qa',
        payload: { project: { ...h.state.activeProject, id, updatedAt, structuredLanguage } }
      });
      const newestRevision = '2026-11-24T00:00:03.000Z';
      await publish(newestRevision, 'latest collaborator workflow');
      await publish('2026-11-24T00:00:02.000Z', 'older collaborator workflow');
      await publish('invalid', 'invalid collaborator workflow');
      await publish('2026-11-24T00:00:04.000Z', 'different project workflow', 'different');
      assert.equal(renders.length, 0);
      assert.equal(h.state.activeProject.updatedAt, h.original);
      calls[0].resolve({ ...h.state.activeProject, updatedAt: h.updated, structuredLanguage: 'draft B' });

      assert.equal(await save, !dirtyAfterRequest);
      assert.equal(h.state.activeProject.updatedAt, newestRevision);
      assert.equal(h.state.activeProject.structuredLanguage, 'latest collaborator workflow');
      assert.equal(h.state.editorDirty, dirtyAfterRequest);
      assert.equal(h.state.editorConflict, dirtyAfterRequest);
      assert.equal(h.state.editorText, dirtyAfterRequest ? 'additional local typing' : 'latest collaborator workflow');
      assert.equal(renders.length, dirtyAfterRequest ? 0 : 1);
      if (dirtyAfterRequest) {
        assert.match(h.context.document.getElementById('editor-save-state').textContent, /Save conflict/);
        assert.equal(await h.run('saveEditor()'), false);
        assert.equal(h.timers.length, 0, 'the conflict must not schedule another save');
      } else {
        assert.equal(renders[0].preserveCollaborationDrafts, true);
      }
      assert.equal(calls.length, 1);
    });
  }
});

test('an older or equal workflow update does not block the next local save', async t => {
  const h = editorStreamHarness();
  t.after(h.close);
  const calls = [];
  h.context.fixtureApi = (_url, { body }) => new Promise(resolve => calls.push({ body, resolve }));
  h.run('api = fixtureApi;');
  await h.open();
  const save = h.run('saveEditor()');
  h.state.editorText = 'additional local typing';
  for (const updatedAt of [h.original, h.updated]) {
    await h.receive({
      type: 'project_updated', projectId: 'qa',
      payload: { project: { ...h.state.activeProject, updatedAt, structuredLanguage: 'older or equal workflow' } }
    });
  }
  calls[0].resolve({ ...h.state.activeProject, updatedAt: h.updated, structuredLanguage: 'draft B' });
  assert.equal(await save, true);
  assert.equal(h.state.editorConflict, false);
  const next = h.run('saveEditor()');
  assert.equal(calls[1].body.expectedUpdatedAt, h.updated);
  assert.equal(calls[1].body.structuredLanguage, 'additional local typing');
  calls[1].resolve({ ...h.state.activeProject, updatedAt: '2026-11-24T00:00:02.000Z', structuredLanguage: 'additional local typing' });
  assert.equal(await next, true);
});

test('an update from a stream with the wrong editor identity cannot supersede a save response', async t => {
  const h = editorStreamHarness();
  t.after(h.close);
  let resolveSave;
  h.context.fixtureApi = () => new Promise(resolve => { resolveSave = resolve; });
  h.run('api = fixtureApi;');
  await h.open('other-user');
  const save = h.run('saveEditor()');
  await h.receive({
    type: 'project_updated', projectId: 'qa',
    payload: { project: { ...h.state.activeProject, updatedAt: '2026-11-24T00:00:02.000Z', structuredLanguage: 'other stream workflow' } }
  });
  resolveSave({ ...h.state.activeProject, updatedAt: h.updated, structuredLanguage: 'draft B' });
  assert.equal(await save, true);
  assert.equal(h.state.activeProject.updatedAt, h.updated);
  assert.equal(h.state.editorText, 'draft B');
  assert.equal(h.state.editorConflict, false);
});

test('a collaborator checkpoint preserves the open comparison, Restore target, and focus', async t => {
  const h = editorStreamHarness();
  t.after(h.close);
  const { document, window } = h.context;
  const modal = document.getElementById('modal-root');
  const inserted = [];
  const sidebar = { insertAdjacentHTML: (position, html) => inserted.push({ position, html }) };
  modal.querySelector = selector => selector === '.version-sidebar' ? sidebar : null;
  let modalHtml, modalRenders = 0;
  Object.defineProperty(modal, 'innerHTML', { set(value) {
    modalHtml = value;
    modalRenders++;
    document.activeElement = null;
  } });
  h.run('activateModal = () => {};');
  window.requestAnimationFrame = () => {};
  Object.assign(h.state.activeProject, {
    name: 'Fixture workflow', ownerId: h.state.user.id,
    versions: [
      { id: 'latest', number: '1.0.0', content: 'Latest text' },
      { id: 'earlier', number: '0.9.0', content: 'Earlier text' },
    ],
  });
  h.state.editorDirty = false;
  const click = (action, versionId) => h.listeners.get('click')({
    target: { closest: () => ({ dataset: { action, versionId } }) },
  });
  await h.open();
  await click('versions');
  await click('select-version', 'earlier');
  const restore = { dataset: { action: 'restore-version', versionId: 'earlier' } };
  document.activeElement = restore;
  assert.match(modalHtml, /Comparing 0\.9\.0/);
  assert.match(modalHtml, /data-action="restore-version" data-version-id="earlier"/);
  const rendersBeforeEvent = modalRenders;

  await h.checkpoint();
  assert.equal(h.state.selectedVersionId, 'earlier');
  assert.equal(document.activeElement, restore);
  assert.equal(modalRenders, rendersBeforeEvent);
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].position, 'afterbegin');
  assert.match(inserted[0].html, /data-action="select-version" data-version-id="checkpoint"/);
  assert.equal(h.state.activeProject.versions[0].id, 'checkpoint');
  assert.equal(h.state.activeProject.updatedAt, h.updated);
});

test('the first collaborator checkpoint fills empty Version history', async t => {
  const h = editorStreamHarness();
  t.after(h.close);
  h.state.modal = { type: 'versions' };
  const modal = h.context.document.getElementById('modal-root');
  h.run('activateModal = () => {}; renderModal();');
  assert.match(modal.innerHTML, /No saved versions/);
  await h.open();
  await h.checkpoint();
  assert.equal(h.state.selectedVersionId, 'checkpoint');
  assert.doesNotMatch(modal.innerHTML, /No saved versions/);
  assert.match(modal.innerHTML, /Comparing 1\.0\.1/);
});

test('collaboration updates the member list without remounting the invite form or other share tabs', async t => {
  const h = editorStreamHarness();
  t.after(h.close);
  await h.open();
  const { document } = h.context;
  const modal = document.getElementById('modal-root');
  const list = document.getElementById('share-member-list');
  const address = document.getElementById('invite-email');
  const formRole = document.getElementById('invite-role');
  let modalRenders = 0;
  Object.defineProperty(modal, 'innerHTML', {
    set() {
      modalRenders++;
      address.value = '';
      formRole.value = 'Editor';
      document.activeElement = null;
    }
  });
  h.run('activateModal = () => {};');
  h.state.modal = { type: 'share' };
  h.state.shareTab = 'invite';
  address.value = 'unsent@example.test';
  formRole.value = 'Commenter';
  document.activeElement = address;
  list.contains = element => element !== address;

  await h.invitation();
  assert.equal(modalRenders, 0);
  assert.equal(address.value, 'unsent@example.test');
  assert.equal(formRole.value, 'Commenter');
  assert.equal(document.activeElement, address);
  assert.match(list.innerHTML, /New member/);
  assert.match(list.innerHTML, /<option selected>Viewer<\/option>/);

  const memberRole = { dataset: { userId: 'invitee' }, focus() { document.activeElement = this; } };
  document.activeElement = { dataset: { userId: 'invitee' } };
  list.querySelectorAll = () => [memberRole];
  await h.memberUpdate({ previousUpdatedAt: h.updated, updatedAt: '2026-11-24T00:00:02.000Z' });
  assert.equal(modalRenders, 0);
  assert.equal(address.value, 'unsent@example.test');
  assert.equal(formRole.value, 'Commenter');
  assert.equal(document.activeElement, memberRole);
  assert.match(list.innerHTML, /<option selected>Commenter<\/option>/);

  const currentList = list.innerHTML;
  h.state.shareTab = 'link';
  await h.invitation();
  assert.equal(modalRenders, 0);
  assert.equal(list.innerHTML, currentList);
  assert.equal(h.state.activeProject.members[0].role, 'Viewer');
});

test('a collaborator workflow save keeps the Invite form and returns focus to the new Share button', async t => {
  for (const submitting of [false, true]) {
    await t.test(submitting ? 'explicit invite pending' : 'unsent invite', async subtest => {
      const h = editorStreamHarness({ renderEditor: true });
      subtest.after(h.close);
      const { document, window } = h.context;
      const app = document.getElementById('app');
      const modal = document.getElementById('modal-root');
      const list = document.getElementById('share-member-list');
      const title = document.getElementById('share-title');
      const email = { value: 'invitee@example.invalid' };
      const role = { value: 'Commenter' };
      const form = {
        dataset: {}, isConnected: true, elements: { email, role },
        reset() { email.value = ''; role.value = 'Editor'; },
      };
      const focus = function () { document.activeElement = this; };
      const dialog = { focus };
      let editorHtml, shareButton;
      Object.defineProperty(app, 'innerHTML', {
        get: () => editorHtml,
        set(html) {
          editorHtml = html;
          if (shareButton) shareButton.isConnected = false;
          shareButton = { id: html.includes('id="share-button"') ? 'share-button' : '', isConnected: true, dataset: { action: 'share' }, focus };
        },
      });
      const getElementById = document.getElementById.bind(document);
      document.getElementById = id => id === 'share-button' ? (shareButton?.id ? shareButton : null) : getElementById(id);
      modal.querySelector = selector => selector === '[role="dialog"]' ? dialog : null;
      modal.querySelectorAll = () => [];
      list.contains = () => false;
      window.requestAnimationFrame = callback => callback();
      Object.assign(h.state.activeProject, { name: 'Fixture workflow', status: 'Draft' });
      h.state.editorText = h.state.activeProject.structuredLanguage;
      h.state.editorDirty = false;
      h.run('renderEditor()');
      const originalShareButton = shareButton;
      originalShareButton.focus();
      await h.listeners.get('click')({ target: { closest: () => originalShareButton } });
      assert.match(modal.innerHTML, /data-form="invite-member"/);
      assert.equal(h.state.modalReturnFocus, originalShareButton);
      let modalRenders = 0;
      Object.defineProperty(modal, 'innerHTML', { set() {
        modalRenders++;
        form.isConnected = false;
        document.activeElement = null;
      } });
      document.activeElement = email;

      const requests = [];
      h.context.inviteForm = form;
      h.context.FormData = class {
        constructor(source) { this.values = source.elements; }
        get(name) { return this.values[name].value; }
      };
      h.context.fixtureApi = (url, { method, body }) => new Promise(resolve => requests.push({ url, method, body, resolve }));
      h.run('api = fixtureApi');
      const pending = submitting ? h.run('inviteMember(inviteForm)') : null;
      await h.open();
      const saved = {
        ...h.state.activeProject, name: 'Updated fixture workflow', updatedAt: h.updated,
        structuredLanguage: 'GIVEN\nUpdated collaborator content\nWHEN\nOpened\nTHEN\nShow results',
        members: [{ userId: 'collaborator', role: 'Editor', user: { name: 'Fixture collaborator' } }],
      };
      await h.receive({ type: 'project_updated', projectId: 'qa', payload: { project: saved, actor: { name: 'Fixture collaborator' } } });

      assert.equal(h.state.activeProject.updatedAt, h.updated);
      assert.equal(h.state.editorText, saved.structuredLanguage);
      assert.match(app.innerHTML, /Updated collaborator content/);
      assert.equal(modalRenders, 0);
      assert.equal(form.isConnected, true);
      assert.equal(email.value, 'invitee@example.invalid');
      assert.equal(role.value, 'Commenter');
      assert.equal(document.activeElement, email);
      assert.equal(title.textContent, 'Share “Updated fixture workflow”');
      assert.match(list.innerHTML, /Fixture collaborator/);
      assert.equal(requests.length, submitting ? 1 : 0);

      if (submitting) await h.run('inviteMember(inviteForm)');
      const invitation = pending || h.run('inviteMember(inviteForm)');
      assert.equal(requests.length, 1);
      assert.equal(requests[0].url, '/api/projects/qa/share');
      assert.equal(requests[0].method, 'POST');
      assert.deepEqual({ ...requests[0].body }, { email: 'invitee@example.invalid', role: 'Commenter' });
      requests[0].resolve({ userId: 'invitee', role: 'Commenter', user: { name: 'Fixture invitee' } });
      await invitation;
      assert.equal(email.value, '');
      assert.equal(form.dataset.submitting, undefined);
      assert.match(list.innerHTML, /Fixture invitee/);

      assert.equal(originalShareButton.isConnected, false);
      h.run('closeModal()');
      assert.equal(document.activeElement, shareButton);
    });
  }
});

test('a collaborator posting or resolving a comment lets the pending autosave keep its draft', async t => {
  for (const [label, resolved] of [['posting', false], ['resolving', true]]) {
    await t.test(label, async subtest => {
      const h = editorStreamHarness();
      subtest.after(h.close);
      if (resolved) h.state.activeProject.comments.push(h.note);
      const calls = [];
      h.context.fixtureApi = async (_url, { body }) => {
        calls.push(body);
        if (body.expectedUpdatedAt !== h.updated) throw Object.assign(new Error('conflict'), { status: 409 });
        return { ...h.state.activeProject, updatedAt: 'saved', structuredLanguage: body.structuredLanguage };
      };
      h.run('api = fixtureApi; scheduleAutosave();');
      const [autosave] = h.timers;
      await h.open();
      await (resolved ? h.commentUpdated() : h.commentAdded());
      assert.equal(h.state.activeProject.comments[0].resolved, resolved);
      assert.equal(h.state.activeProject.structuredLanguage, 'original');
      assert.equal(h.state.editorText, 'draft B');
      assert.equal(h.state.editorDirty, true);
      assert.equal(await autosave(), true);
      assert.equal(calls[0].expectedUpdatedAt, h.updated);
      assert.equal(calls[0].structuredLanguage, 'draft B');
      assert.equal(h.state.editorConflict, false);
    });
  }
});

test('a collaborator role change lets the pending autosave keep its draft', async t => {
  const h = editorStreamHarness();
  t.after(h.close);
  h.state.activeProject.members = [{ userId: 'invitee', role: 'Viewer' }];
  const calls = [];
  h.context.fixtureApi = async (_url, { body }) => {
    calls.push(body);
    if (body.expectedUpdatedAt !== h.updated) throw Object.assign(new Error('conflict'), { status: 409 });
    return { ...h.state.activeProject, updatedAt: 'saved', structuredLanguage: body.structuredLanguage };
  };
  h.run('api = fixtureApi; scheduleAutosave();');
  const [autosave] = h.timers;
  await h.open();
  await h.memberUpdate();
  assert.equal(h.state.activeProject.members[0].role, 'Commenter');
  assert.equal(h.state.editorText, 'draft B');
  assert.equal(h.state.editorDirty, true);
  assert.equal(await autosave(), true);
  assert.equal(calls[0].expectedUpdatedAt, h.updated);
  assert.equal(calls[0].structuredLanguage, 'draft B');
});

test('a collaborator invitation lets the pending autosave continue without changing the draft', async t => {
  const h = editorStreamHarness();
  t.after(h.close);
  h.context.serverRevision = h.updated;
  h.run(`
    globalThis.sent = [];
    api = async (url, { body }) => {
      sent.push(body);
      if (body.expectedUpdatedAt !== serverRevision) throw Object.assign(new Error('conflict'), { status: 409 });
      return { ...state.activeProject, updatedAt: 'saved', structuredLanguage: body.structuredLanguage };
    };
    scheduleAutosave();
  `);
  const [autosave] = h.timers;
  await h.open();
  await h.invitation();
  assert.equal(h.state.activeProject.members[0].userId, 'invitee');
  assert.match(h.context.toasts[0], /New member joined the project/);
  assert.equal(h.state.activeProject.structuredLanguage, 'original');
  assert.equal(h.state.editorText, 'draft B');
  assert.equal(h.state.editorDirty, true);
  assert.equal(h.timers.length, 1);
  assert.equal(await autosave(), true);
  assert.equal(h.context.sent[0].expectedUpdatedAt, h.updated);
  assert.equal(h.context.sent[0].structuredLanguage, 'draft B');
  assert.equal(h.state.editorConflict, false);
});

test('a collaborator checkpoint lets the pending autosave keep its draft and use the new revision', async t => {
  const h = editorStreamHarness();
  t.after(h.close);
  h.context.serverRevision = h.updated;
  h.run(`
    globalThis.sent = [];
    api = async (url, { body }) => {
      sent.push(body);
      if (body.expectedUpdatedAt !== serverRevision) throw Object.assign(new Error('conflict'), { status: 409 });
      return { ...state.activeProject, updatedAt: 'saved', structuredLanguage: body.structuredLanguage };
    };
    scheduleAutosave();
  `);
  const [autosave] = h.timers;
  await h.open();
  await h.checkpoint();
  assert.equal(h.state.activeProject.versions[0].id, 'checkpoint');
  assert.equal(h.state.activeProject.structuredLanguage, 'original');
  assert.equal(h.state.editorText, 'draft B');
  assert.equal(h.state.editorDirty, true);
  assert.equal(h.timers.length, 1);
  assert.equal(await autosave(), true);
  assert.equal(h.context.sent[0].expectedUpdatedAt, h.updated);
  assert.equal(h.context.sent[0].structuredLanguage, 'draft B');
  assert.equal(h.state.editorConflict, false);
});

test('metadata events after an unseen workflow edit preserve the conditional save conflict', async t => {
  const h = editorStreamHarness();
  t.after(h.close);
  const later = '2026-11-24T00:00:02.000Z';
  const latest = '2026-11-24T00:00:03.000Z';
  const calls = [];
  h.context.fixtureApi = async (_url, { body }) => {
    calls.push(body);
    if (body.expectedUpdatedAt !== latest) throw Object.assign(new Error('conflict'), { status: 409 });
    return { ...h.state.activeProject, updatedAt: 'saved', structuredLanguage: body.structuredLanguage };
  };
  h.run('api = fixtureApi;');
  await h.open();
  await h.receive({
    type: 'project_updated', projectId: 'qa',
    payload: { project: { ...h.state.activeProject, updatedAt: h.updated, structuredLanguage: 'remote edit' } }
  });
  await h.checkpoint({ previousUpdatedAt: h.updated, updatedAt: later });
  await h.invitation({ previousUpdatedAt: h.updated, updatedAt: later });
  await h.memberUpdate({ previousUpdatedAt: h.updated, updatedAt: later });
  await h.commentAdded({ previousUpdatedAt: h.updated, updatedAt: later });
  await h.commentUpdated({ previousUpdatedAt: later, updatedAt: latest });
  assert.equal(h.state.activeProject.updatedAt, h.original);
  assert.equal(await h.run('saveEditor()'), false);
  assert.equal(calls[0].expectedUpdatedAt, h.original);
  assert.equal(h.state.editorText, 'draft B');
  assert.equal(h.state.editorConflict, true);
  await h.checkpoint();
  await h.invitation();
  await h.memberUpdate();
  await h.commentAdded();
  await h.commentUpdated();
  assert.equal(h.state.activeProject.updatedAt, h.original);
  assert.equal(h.state.editorConflict, true);
});

test('legacy and delayed metadata events update UI without changing the current revision', async t => {
  const h = editorStreamHarness();
  t.after(h.close);
  await h.open();
  await h.checkpoint({});
  await h.invitation({});
  await h.memberUpdate({});
  await h.commentAdded({});
  await h.commentUpdated({});
  assert.equal(h.state.activeProject.versions.length, 1);
  assert.equal(h.state.activeProject.members[0].userId, 'invitee');
  assert.equal(h.state.activeProject.members[0].role, 'Commenter');
  assert.equal(h.state.activeProject.comments[0].resolved, true);
  assert.equal(h.state.activeProject.updatedAt, h.original);
  const later = '2026-11-24T00:00:02.000Z';
  h.state.activeProject.updatedAt = later;
  await h.checkpoint();
  await h.checkpoint({ previousUpdatedAt: later, updatedAt: h.updated });
  await h.invitation();
  await h.invitation({ previousUpdatedAt: later, updatedAt: h.updated });
  await h.memberUpdate({ previousUpdatedAt: later, updatedAt: h.updated });
  await h.commentAdded();
  await h.commentUpdated({ previousUpdatedAt: later, updatedAt: h.updated });
  assert.equal(h.state.activeProject.updatedAt, later);
});

test('metadata events apply only to the connected editor', async t => {
  const cases = [
    ['another project', { projectId: 'other' }],
    ['changed route', { change: h => { h.context.window.location.hash = '#dashboard'; } }],
    ['changed account', { change: h => { h.state.user = { id: 'new-user' }; } }],
    ['changed load', { change: h => { h.state.projectLoadRevision += 1; } }],
    ['old stream', { change: h => { h.state.streamController = new AbortController(); } }],
    ['mismatched stream user', { userId: 'another-user' }]
  ];
  for (const [label, { change, projectId, userId }] of cases) {
    await t.test(label, async subtest => {
      const h = editorStreamHarness();
      subtest.after(h.close);
      h.state.activeProject.members = [{ userId: 'invitee', role: 'Viewer' }];
      h.state.activeProject.comments.push(h.note);
      await h.open(userId);
      change?.(h);
      await h.checkpoint(undefined, projectId);
      await h.invitation(undefined, projectId);
      await h.memberUpdate(undefined, projectId);
      await h.commentAdded(undefined, projectId);
      await h.commentUpdated(undefined, projectId);
      assert.equal(h.state.activeProject.updatedAt, h.original);
      assert.equal(h.state.activeProject.versions.length, 0);
      assert.equal(h.state.activeProject.members.length, 1);
      assert.equal(h.state.activeProject.members[0].role, 'Viewer');
      assert.equal(h.state.activeProject.comments.length, 1);
      assert.equal(h.state.activeProject.comments[0].resolved, false);
      assert.equal(h.state.editorText, 'draft B');
    });
  }
});

function restoreHarness() {
  const h = savingHarness();
  h.state.activeProject.ownerId = h.state.user.id;
  h.state.activeProject.versions = [{ id: 'checkpoint', number: '1.0.1', content: 'Earlier workflow', createdAt: '2026-01-01' }];
  h.state.modal = { type: 'versions' };
  h.context.window.location.hash = '#project/qa';
  h.context.window.confirm = () => true;
  h.context.window.requestAnimationFrame = () => {};
  h.run('renderModal = () => {}; renderEditor = () => {};');
  return h;
}

test('Version history offers restore only for a version the current user can edit', () => {
  const h = restoreHarness();
  assert.match(h.run('renderVersionsModal()'), /data-action="restore-version" data-version-id="checkpoint"/);
  h.state.activeProject.ownerId = 'other';
  h.state.activeProject.members = [{ userId: h.state.user.id, role: 'Viewer' }];
  assert.doesNotMatch(h.run('renderVersionsModal()'), /data-action="restore-version"/);
  h.state.activeProject.members[0].role = 'Editor';
  assert.match(h.run('renderVersionsModal()'), /Restore this version/);
  h.state.activeProject.versions = [];
  assert.doesNotMatch(h.run('renderVersionsModal()'), /data-action="restore-version"/);
});

test('confirmed restore flushes the draft and keeps later typing out of a pending restore', async () => {
  const h = restoreHarness();
  const pending = [];
  h.context.fixtureApi = (url, options) => new Promise(resolve => pending.push({ url, options, resolve }));
  h.run('api = fixtureApi;');
  const restoring = h.run('restoreVersion("checkpoint")');
  const duplicate = h.run('restoreVersion("checkpoint")');
  assert.equal(pending.length, 1);
  assert.equal(pending[0].options.method, 'PATCH');
  await duplicate;
  pending[0].resolve({ ...h.state.activeProject, updatedAt: 'B', structuredLanguage: 'draft B' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pending.length, 2);
  assert.equal(pending[1].url, '/api/projects/qa/versions/checkpoint/restore');
  assert.equal(pending[1].options.body.expectedUpdatedAt, 'B');

  h.state.modal = { type: 'preview' };
  h.state.editorText = 'Text typed while the restore was pending';
  h.state.editorDirty = true;
  assert.equal(await h.run('saveEditor()'), false);
  pending[1].resolve({ ...h.state.activeProject, updatedAt: 'C', structuredLanguage: 'Earlier workflow' });
  await restoring;
  assert.equal(h.state.activeProject.updatedAt, 'C');
  assert.equal(h.state.modal.type, 'preview');
  assert.equal(h.state.editorText, 'Text typed while the restore was pending');
  assert.equal(h.state.editorConflict, true);
  assert.equal(await h.run('saveEditor()'), false);
  assert.equal(pending.length, 2);
});

test('cancelling restore neither flushes local edits nor calls the restore API', async () => {
  const h = restoreHarness();
  h.context.window.confirm = () => false;
  h.run(`globalThis.calls = 0; api = async () => { calls++; throw Error('unexpected request'); };`);
  await h.run('restoreVersion("checkpoint")');
  assert.equal(h.context.calls, 0);
  assert.equal(h.state.editorText, 'draft B');
  assert.equal(h.state.editorDirty, true);
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

function jsonCopyHarness() {
  const h = clientHarness();
  h.state.user = { id: 'designer' };
  h.state.activeProject = { id: 'project-a', name: 'First project' };
  h.state.previewMode = 'json';
  h.context.window.location.hash = '#project/project-a';
  h.state.editorText = 'GIVEN\nA designer\n\nWHEN\nThey click Copy\n\nTHEN\nExport JSON';
  const json = h.run('JSON.stringify(generatedOutput(parseStructuredLanguage(state.editorText, state.activeProject.name)), null, 2)');
  const output = h.context.document.getElementById('json-code');
  output.textContent = json;
  h.run(`globalThis.calls = []; globalThis.toasts = [];
    api = async (url, {body}) => calls.push([url, body.event]);
    showToast = (message, type) => toasts.push({ message, type });`);
  const selected = [];
  h.context.document.createRange = () => ({ selectNodeContents(node) { this.node = node; } });
  h.context.window.getSelection = () => ({
    removeAllRanges() { selected.length = 0; },
    addRange(range) { selected.push(range.node); }
  });
  const click = () => h.listeners.get('click')({
    target: { closest: () => ({ dataset: { action: 'copy-generated-json' } }) }
  });
  return { ...h, json, output, selected, click };
}

test('clipboard rejection selects the matching JSON for manual copy without recording export', async () => {
  const h = jsonCopyHarness();
  h.context.navigator.clipboard = { writeText: async () => { throw new Error('Clipboard denied'); } };
  await h.click();
  assert.deepEqual(h.selected, [h.output]);
  assert.match(h.context.toasts[0].message, /Ctrl\+C|Command\+C/);
  assert.equal(h.context.toasts[0].type, 'info');
  assert.equal(h.context.calls.length, 0);
});

test('unavailable clipboard gives instructions without selecting a changed output', async () => {
  const h = jsonCopyHarness();
  h.output.textContent = '{"different":true}';
  await h.click();
  assert.equal(h.selected.length, 0);
  assert.match(h.context.toasts[0].message, /select and copy/i);
  assert.equal(h.context.toasts[0].type, 'error');
  assert.equal(h.context.calls.length, 0);
});

test('a confirmed JSON copy records the active project and acknowledges the current output', async () => {
  const h = jsonCopyHarness();
  h.context.navigator.clipboard = { writeText: async value => assert.equal(value, h.json) };
  await h.click();
  assert.equal(h.context.calls.length, 1);
  assert.equal(h.context.calls[0].join(' '), '/api/projects/project-a/metrics export');
  assert.equal(h.context.toasts[0]?.message, 'Generated JSON copied.');
  assert.equal(h.selected.length, 0);
});

test('a delayed JSON copy records the initiating project without acknowledging a different editor', async () => {
  const h = jsonCopyHarness();
  let finish;
  h.context.navigator.clipboard = { writeText: (value) => {
    assert.equal(value, h.json);
    return new Promise(resolve => { finish = resolve; });
  } };
  const copy = h.click();
  h.state.activeProject = { id: 'project-b', name: 'Second project' };
  h.context.window.location.hash = '#project/project-b';
  finish();
  await copy;
  assert.equal(h.context.calls.length, 1);
  assert.equal(h.context.calls[0][0], '/api/projects/project-a/metrics');
  assert.equal(h.context.calls[0][1], 'export');
  assert.equal(h.context.toasts.length, 0);
  assert.equal(h.selected.length, 0);
});

test('a late clipboard success cannot record an export under a different account', async () => {
  const h = jsonCopyHarness();
  let finish;
  h.context.navigator.clipboard = { writeText: () => new Promise(resolve => { finish = resolve; }) };
  const copy = h.click();
  h.state.user = { id: 'other-designer' };
  finish();
  await copy;
  assert.equal(h.context.calls.length, 0);
  assert.equal(h.context.toasts.length, 0);
});

test('a delayed JSON copy emits no feedback or selection after leaving its output', async () => {
  const changes = {
    dashboard: h => { h.context.window.location.hash = '#dashboard'; },
    account: h => { h.state.user = { id: 'other-designer' }; },
    reloadedProject: h => { h.state.projectLoadRevision++; },
    outputTab: h => { h.state.previewMode = 'interface'; },
    replacedOutput: h => {
      const getElement = h.context.document.getElementById;
      h.context.document.getElementById = id => id === 'json-code' ? { textContent: h.json } : getElement(id);
    },
    updatedOutput: h => { h.output.textContent = '{"newOutput":true}'; }
  };
  for (const [change, leaveOutput] of Object.entries(changes)) {
    for (const outcome of ['success', 'denied']) {
      const h = jsonCopyHarness();
      let settle;
      h.context.navigator.clipboard = { writeText: () => new Promise((resolve, reject) => {
        settle = outcome === 'success' ? resolve : () => reject(new Error('Clipboard denied'));
      }) };
      const copy = h.click();
      leaveOutput(h);
      settle();
      await copy;
      const label = `${change}: ${outcome}`;
      assert.equal(h.selected.length, 0, label);
      assert.equal(h.context.toasts.length, 0, label);
      if (outcome === 'success' && change !== 'account') {
        assert.equal(h.context.calls.length, 1, label);
        assert.equal(h.context.calls[0].join(' '), '/api/projects/project-a/metrics export', label);
      } else assert.equal(h.context.calls.length, 0, label);
    }
  }
});

function linkCopyHarness() {
  const h = clientHarness();
  const url = 'https://fixture.example/#project/project-a';
  h.state.user = { id: 'designer' };
  h.state.activeProject = { id: 'project-a', name: 'Original project' };
  h.state.modal = { type: 'share' };
  h.state.shareTab = 'link';
  h.context.window.location.hash = '#project/project-a';
  h.context.window.location.href = url;
  const input = h.context.document.getElementById('share-url');
  input.value = url;
  input.readOnly = true;
  let selections = 0;
  input.select = () => { selections++; };
  h.run(`globalThis.calls = []; globalThis.toasts = [];
    api = async (url, {body}) => calls.push([url, body.event]);
    showToast = (message, type) => toasts.push({ message, type });`);
  const click = () => h.listeners.get('click')({
    target: { closest: () => ({ dataset: { action: 'copy-link' } }) }
  });
  return { ...h, url, input, click, selections: () => selections };
}

test('a confirmed project link copy records the initiating project once', async () => {
  const h = linkCopyHarness();
  h.context.navigator.clipboard = { writeText: async (value) => assert.equal(value, h.url) };
  await h.click();
  assert.equal(h.context.calls.length, 1);
  assert.equal(h.context.calls[0].join(' '), '/api/projects/project-a/metrics share');
  assert.equal(h.context.toasts[0]?.message, 'Project link copied');
  assert.equal(h.selections(), 0);
});

test('a late project link copy never records another project or account or acknowledges a closed dialog', async () => {
  for (const change of ['project', 'account', 'closed dialog']) {
    const h = linkCopyHarness();
    let finish;
    h.context.navigator.clipboard = { writeText: () => new Promise(resolve => { finish = resolve; }) };
    const pending = h.click();
    if (change === 'project') {
      h.state.activeProject = { id: 'project-b' };
      h.context.window.location.hash = '#project/project-b';
    } else if (change === 'account') h.state.user = { id: 'other-designer' };
    else h.state.modal = null;
    finish();
    await pending;
    assert.equal(h.context.calls.length, 0, change);
    assert.equal(h.context.toasts.length, 0, change);
  }
});

test('a late project link rejection skips fallback if the dialog or readonly field changed', async () => {
  for (const change of ['reopened dialog', 'link tab', 'replacement input', 'changed URL']) {
    const h = linkCopyHarness();
    let deny;
    let fallbackCalls = 0;
    h.context.navigator.clipboard = { writeText: () => new Promise((_, reject) => { deny = reject; }) };
    h.context.document.execCommand = () => { fallbackCalls++; return true; };
    const pending = h.click();
    if (change === 'reopened dialog') h.state.modal = { type: 'share' };
    else if (change === 'link tab') h.state.shareTab = 'invite';
    else if (change === 'replacement input') {
      const getElement = h.context.document.getElementById;
      const replacement = { ...h.input };
      h.context.document.getElementById = id => id === 'share-url' ? replacement : getElement(id);
    } else h.input.value = 'https://fixture.example/#project/different';
    deny(new Error('Clipboard denied'));
    await pending;
    assert.equal(fallbackCalls, 0, change);
    assert.equal(h.selections(), 0, change);
    assert.equal(h.context.calls.length, 0, change);
    assert.equal(h.context.toasts.length, 0, change);
  }
});

test('project link copy handles true, false, unavailable and throwing legacy fallback', async () => {
  for (const mode of ['true', 'false', 'missing', 'throws']) {
    const h = linkCopyHarness();
    const commands = [];
    if (mode !== 'missing') {
      h.context.document.execCommand = (command) => {
        commands.push([command, h.selections()]);
        if (mode === 'throws') throw new Error('Legacy copy unavailable');
        return mode === 'true';
      };
    }
    await h.click();
    assert.deepEqual(commands, mode === 'missing' ? [] : [['copy', 1]]);
    assert.equal(h.selections(), 1, mode);
    assert.equal(h.context.toasts.length, 1, mode);
    if (mode === 'true') {
      assert.equal(h.context.calls.length, 1);
      assert.equal(h.context.calls[0].join(' '), '/api/projects/project-a/metrics share');
      assert.equal(h.context.toasts[0].message, 'Project link copied');
    } else {
      assert.equal(h.context.calls.length, 0, mode);
      assert.match(h.context.toasts[0].message, /copy it manually/i);
    }
  }
});
