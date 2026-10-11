'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { PassThrough } = require('node:stream');
const authorization = require('../authorization.cjs');

// Synthetic fixtures only. The server is evaluated with mocked HTTP, Auth and
// timers. No socket is opened, no real token is used, and no network is allowed.
const USERS = ['owner-a', 'owner-b', 'project-admin', 'editor', 'commenter', 'viewer', 'workspace-member', 'workspace-admin', 'guest', 'outsider', 'invalid-role'];
function fixture() {
  const users = USERS.map((id) => ({ id, authUserId: id, emailVerified: true, name: id, email: `${id}@example.invalid`, initials: 'TT', title: 'Fixture', color: 'blue' }));
  const workspace = (id, members) => ({ id, name: `${id}-private`, logo: 'FX', domain: `${id}.invalid`, plan: 'Team', authProviders: { google: true }, members: members.map(([userId, role]) => ({ userId, role })) });
  const project = (id, workspaceId, ownerId, members) => ({ id, workspaceId, ownerId, name: `${id}-private`, description: `${id}-secret`, status: 'Draft', category: 'Test', accent: 'blue', createdAt: '2026-01-01', updatedAt: '2026-01-01', structuredLanguage: `GIVEN\n${id}-secret\nWHEN\ntest\nTHEN\ndone`, members: members.map(([userId, role]) => ({ userId, role })), comments: [{ id: 'comment', userId: ownerId, body: `${id}-private-comment`, resolved: false }], versions: [{ id: 'version', number: '1.0.0', userId: ownerId, content: `${id}-private-version` }] });
  return {
    settings: { defaultWorkspaceId: 'alpha' }, users,
    workspaces: [workspace('alpha', [['owner-a', 'Admin'], ['editor', 'Editor'], ['commenter', 'Commenter'], ['viewer', 'Viewer'], ['workspace-member', 'Editor'], ['workspace-admin', 'Admin']]), workspace('beta', [['owner-b', 'Admin']])],
    projects: [project('a', 'alpha', 'owner-a', [['owner-a', 'Admin'], ['project-admin', 'Admin'], ['editor', 'Editor'], ['commenter', 'Commenter'], ['viewer', 'Viewer'], ['guest', 'Viewer'], ['invalid-role', 'SuperAdmin']]), project('b', 'beta', 'owner-b', [['owner-b', 'Admin']])],
    activities: [
      { id: 'activity-b', userId: 'owner-b', projectId: 'b', text: 'beta-private-activity' },
      { id: 'activity-a', userId: 'owner-a', projectId: 'a', text: 'alpha-private-activity' },
      { id: 'workspace-b', userId: 'owner-b', projectId: null, workspaceId: 'beta', text: 'beta-private-member' },
      { id: 'legacy-unknown', userId: 'owner-b', projectId: null, text: 'legacy-private-activity' }
    ]
  };
}

function harness(t, initial = fixture()) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dls-auth-fixture-'));
  fs.mkdirSync(path.join(root, 'data'));
  fs.writeFileSync(path.join(root, 'data', 'db.json'), JSON.stringify(initial));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  let handler;
  let now = Date.parse('2026-10-07T15:00:00Z');
  let nextTimer = 1;
  const timers = new Map();
  const identities = new Map();
  class FixtureDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const context = vm.createContext({
    __dirname: root,
    require(name) {
      if (name === 'http') return { createServer(fn) { handler = fn; return { listen() {}, close() {} }; } };
      if (name === './storage') return require('../storage.js');
      if (name === './authorization.cjs') return authorization;
      return require(name);
    },
    Buffer, URL, Date: FixtureDate,
    process: { env: { SUPABASE_URL: 'https://auth.example.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-only' }, on() {} },
    console: { log() {}, error() {} },
    setInterval(fn) { const id = nextTimer++; timers.set(id, fn); return id; },
    clearInterval(id) { timers.delete(id); },
    setTimeout() { throw new Error('Unexpected timer'); },
    async fetch(url, options) {
      assert.equal(url, 'https://auth.example.invalid/auth/v1/user', 'Only the mocked identity endpoint may be called');
      const authUser = identities.get(options.headers.Authorization.slice(7));
      return { ok: Boolean(authUser), async json() { return structuredClone(authUser); } };
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8'), context, { filename: 'server.js' });

  function token(id, overrides = {}, expiresAt = now + 3_600_000) {
    const value = `${Buffer.from(JSON.stringify({ alg: 'fixture' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(expiresAt / 1000), nonce: identities.size })).toString('base64url')}.fixture`;
    identities.set(value, { id, email: `${id}@example.invalid`, email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: { full_name: id }, app_metadata: { provider: 'email' }, ...overrides });
    return value;
  }
  function begin(id, method, url, bearer) {
    const req = new PassThrough();
    req.url = url;
    req.method = method;
    req.headers = { host: 'fixture.invalid', ...(id === null ? {} : { authorization: `Bearer ${bearer || token(id)}` }) };
    const res = { status: null, chunks: [], ended: false, headersSent: false,
      writeHead(status, headers) { this.status = status; this.headers = headers; this.headersSent = true; },
      write(chunk) { this.chunks.push(String(chunk)); },
      end(chunk) { if (chunk) this.write(chunk); this.ended = true; },
      get json() { return JSON.parse(this.chunks.join('')); },
      get events() { return this.chunks.filter((s) => s.startsWith('data: ')).map((s) => JSON.parse(s.slice(6))); }
    };
    return { req, res, done: handler(req, res) };
  }
  async function request(id, method, url, body, bearer) {
    const pending = begin(id, method, url, bearer);
    if (body !== undefined) pending.req.end(JSON.stringify(body));
    else if (!url.startsWith('/api/events')) pending.req.end();
    await pending.done;
    return pending.res;
  }
  return { context, token, request, begin, timers,
    db: () => vm.runInContext('db', context),
    advance(ms) { now += ms; },
    broadcast(type, payload, projectId, workspaceId = null) { context.eventArgs = [type, payload, projectId, null, workspaceId]; vm.runInContext('broadcast(...eventArgs)', context); },
    heartbeat() { for (const fn of [...timers.values()]) fn(); }
  };
}

function protectedState(h) {
  const { projects, workspaces, activities } = h.db();
  return JSON.stringify({ projects, workspaces, activities });
}

test('unauthenticated API, invalid token and expired token fail closed', async (t) => {
  const h = harness(t);
  assert.equal((await h.request(null, 'GET', '/api/bootstrap')).status, 401);
  assert.equal((await h.request('outsider', 'GET', '/api/bootstrap', undefined, 'invalid')).status, 401);
  const expired = h.token('owner-a', {}, Date.parse('2026-01-01'));
  assert.equal((await h.request('owner-a', 'GET', '/api/projects/a', undefined, expired)).status, 401);
});

test('bootstrap scopes workspace roster, projects and activity; direct guests do not inherit workspace access', async (t) => {
  const h = harness(t);
  const editor = (await h.request('editor', 'GET', '/api/bootstrap')).json;
  assert.deepEqual(editor.workspaces.map((w) => w.id), ['alpha']);
  assert.deepEqual(editor.projects.map((p) => p.id), ['a']);
  assert.deepEqual(editor.activities.map((a) => a.id), ['activity-a']);
  assert.ok(!JSON.stringify(editor).includes('beta'));
  assert.ok(!JSON.stringify(editor).includes('owner-b'));
  const guest = (await h.request('guest', 'GET', '/api/bootstrap')).json;
  assert.deepEqual(guest.workspaces, []);
  assert.deepEqual(guest.projects.map((p) => p.id), ['a']);
  const colleague = (await h.request('workspace-member', 'GET', '/api/bootstrap')).json;
  assert.deepEqual(colleague.projects, []);
  const outsider = (await h.request('outsider', 'GET', '/api/bootstrap')).json;
  assert.deepEqual(outsider.projects, []);
  assert.deepEqual(outsider.workspaces, []);
  assert.deepEqual(outsider.activities, []);
});

const protectedRoutes = [
  ['GET', '/api/projects/a'], ['PATCH', '/api/projects/a', { name: 'forbidden' }],
  ['POST', '/api/projects/a/comments', { body: 'forbidden' }], ['PATCH', '/api/projects/a/comments/comment', { resolved: true }],
  ['POST', '/api/projects/a/share', { email: 'new@example.invalid', role: 'Admin' }],
  ['PATCH', '/api/projects/a/members/owner-a', { role: 'Viewer' }],
  ['POST', '/api/projects/a/versions', {}], ['POST', '/api/projects/a/versions/version/restore', {}],
  ['POST', '/api/presence', { projectId: 'a' }], ['GET', '/api/events?projectId=a']
];
for (const id of ['outsider', 'owner-b', 'workspace-member', 'invalid-role']) {
  test(`${id} cannot access any project route, presence or SSE`, async (t) => {
    const h = harness(t);
    const before = protectedState(h);
    for (const [method, url, body] of protectedRoutes) {
      const response = await h.request(id, method, url, body);
      assert.equal(response.status, 404, `${method} ${url}`);
      assert.deepEqual(response.json, { error: 'Project not found.' });
    }
    assert.equal(protectedState(h), before);
  });
}

const mutationCases = [
  ['edit', 'PATCH', '/api/projects/a', { name: 'allowed' }, 200],
  ['comment', 'POST', '/api/projects/a/comments', { body: 'allowed' }, 201],
  ['comment', 'PATCH', '/api/projects/a/comments/comment', { resolved: true }, 200],
  ['invite', 'POST', '/api/projects/a/share', { email: 'new@example.invalid', role: 'Viewer' }, 201],
  ['administer', 'PATCH', '/api/projects/a/members/guest', { role: 'Commenter' }, 200],
  ['edit', 'POST', '/api/projects/a/versions', { message: 'allowed' }, 201],
  ['edit', 'POST', '/api/projects/a/versions/version/restore', {}, 200]
];
for (const id of ['owner-a', 'project-admin', 'workspace-admin', 'editor', 'commenter', 'viewer', 'guest']) {
  for (const [permission, method, url, body, success] of mutationCases) {
    test(`${id}: ${method} ${url} enforces ${permission}`, async (t) => {
      const h = harness(t);
      const expected = {
        'owner-a': ['edit', 'comment', 'invite', 'administer'],
        'project-admin': ['edit', 'comment', 'invite', 'administer'],
        'workspace-admin': [],
        editor: ['edit', 'comment', 'invite'], commenter: ['comment'], viewer: [], guest: []
      };
      const allowed = expected[id].includes(permission);
      const before = protectedState(h);
      const response = await h.request(id, method, url, body);
      assert.equal(response.status, allowed ? success : 403);
      if (!allowed) assert.equal(protectedState(h), before);
    });
  }
}

test('read and presence work for members, owners and workspace administrators', async (t) => {
  const h = harness(t);
  for (const id of ['owner-a', 'project-admin', 'workspace-admin', 'editor', 'commenter', 'viewer', 'guest']) {
    assert.equal((await h.request(id, 'GET', '/api/projects/a')).status, 200);
    assert.equal((await h.request(id, 'POST', '/api/presence', { projectId: 'a' })).status, 200);
  }
});

test('project creation within a workspace and its settings require the applicable workspace role', async (t) => {
  const h = harness(t);
  for (const id of ['outsider', 'guest', 'owner-b']) {
    assert.equal((await h.request(id, 'POST', '/api/projects', { name: 'forbidden', workspaceId: 'alpha' })).status, 404);
    assert.equal((await h.request(id, 'PATCH', '/api/workspaces/alpha/settings', { google: false })).status, 404);
  }
  for (const id of ['commenter', 'viewer']) assert.equal((await h.request(id, 'POST', '/api/projects', { name: 'forbidden', workspaceId: 'alpha' })).status, 403);
  assert.equal((await h.request('editor', 'PATCH', '/api/workspaces/alpha/settings', { google: false })).status, 403);
  assert.equal((await h.request('editor', 'POST', '/api/projects', { name: 'new' })).status, 201);
  assert.equal((await h.request('workspace-admin', 'PATCH', '/api/workspaces/alpha/settings', { name: 'new name' })).status, 200);
});

test('sharing cannot bypass admin-only permission changes or owner protection', async (t) => {
  const h = harness(t);
  const before = protectedState(h);
  assert.equal((await h.request('editor', 'POST', '/api/projects/a/share', { email: 'new@example.invalid', role: 'Admin' })).status, 403);
  assert.equal((await h.request('editor', 'POST', '/api/projects/a/share', { email: 'viewer@example.invalid', role: 'Editor' })).status, 403);
  assert.equal((await h.request('owner-a', 'POST', '/api/projects/a/share', { email: 'owner-a@example.invalid', role: 'Viewer' })).status, 409);
  assert.equal((await h.request('workspace-admin', 'PATCH', '/api/projects/a/members/owner-a', { role: 'Viewer' })).status, 403);
  assert.equal((await h.request('project-admin', 'PATCH', '/api/projects/a/members/owner-a', { role: 'Viewer' })).status, 409);
  assert.equal((await h.request('owner-a', 'POST', '/api/projects/a/share', { email: 'new@example.invalid', role: 'unexpected' })).status, 400);
  assert.equal(protectedState(h), before);
});

test('new authentication never autojoins a workspace or project, including metadata claims', async (t) => {
  const h = harness(t);
  const before = protectedState(h);
  const bearer = h.token('new-user', { user_metadata: { role: 'Admin', workspaceId: 'alpha' } });
  const response = await h.request('new-user', 'GET', '/api/bootstrap', undefined, bearer);
  assert.equal(response.status, 200);
  assert.deepEqual(response.json.workspaces, []);
  assert.deepEqual(response.json.projects, []);
  assert.equal(protectedState(h), before);
});

test('confirmed invitee can claim an explicit invitation and receives only the assigned project access', async (t) => {
  const h = harness(t);
  const invited = await h.request('editor', 'POST', '/api/projects/a/share', { email: 'invitee@example.invalid', role: 'Commenter' });
  assert.equal(invited.status, 201);
  const claimed = (await h.request('invitee', 'GET', '/api/bootstrap')).json;
  assert.equal(claimed.user.id, invited.json.userId);
  assert.deepEqual(claimed.workspaces, []);
  assert.deepEqual(claimed.projects.map((p) => p.id), ['a']);
  assert.equal((await h.request('invitee', 'POST', '/api/projects/a/comments', { body: 'review' })).status, 201);
  assert.equal((await h.request('invitee', 'PATCH', '/api/projects/a', { name: 'forbidden' })).status, 403);
  assert.equal(h.db().users.find((u) => u.id === invited.json.userId).authUserId, 'invitee');
});

test('unconfirmed email cannot claim invitation; same email cannot hijack an already bound subject', async (t) => {
  const h = harness(t);
  await h.request('owner-a', 'POST', '/api/projects/a/share', { email: 'invitee@example.invalid', role: 'Editor' });
  const unconfirmed = h.token('unconfirmed', { email: 'invitee@example.invalid', email_confirmed_at: null });
  assert.equal((await h.request('unconfirmed', 'GET', '/api/projects/a', undefined, unconfirmed)).status, 404);
  await h.request('invitee', 'GET', '/api/bootstrap');
  const collision = h.token('other-subject', { email: 'invitee@example.invalid' });
  assert.equal((await h.request('other-subject', 'GET', '/api/projects/a', undefined, collision)).status, 404);
});

test('a previously unconfirmed profile can later claim only its explicit project invitation', async (t) => {
  const h = harness(t);
  const unconfirmed = h.token('invitee', { email_confirmed_at: null });
  await h.request('invitee', 'GET', '/api/bootstrap', undefined, unconfirmed);
  const invitation = await h.request('owner-a', 'POST', '/api/projects/a/share', { email: 'invitee@example.invalid', role: 'Commenter' });
  assert.notEqual(invitation.json.userId, 'invitee');
  const confirmed = await h.request('invitee', 'GET', '/api/bootstrap');
  assert.equal(confirmed.json.user.id, 'invitee');
  assert.deepEqual(confirmed.json.workspaces, []);
  assert.deepEqual(confirmed.json.projects.map((p) => p.id), ['a']);
  assert.equal((await h.request('invitee', 'POST', '/api/projects/a/comments', { body: 'allowed' })).status, 201);
  assert.equal((await h.request('invitee', 'PATCH', '/api/projects/a', { name: 'forbidden' })).status, 403);
  assert.ok(!h.db().users.some((u) => u.id === invitation.json.userId));
});

test('claimed invitation cannot use an unverified changed email to acquire a second grant', async (t) => {
  const h = harness(t);
  const invitation = await h.request('owner-a', 'POST', '/api/projects/a/share', { email: 'invitee@example.invalid', role: 'Viewer' });
  await h.request('invitee', 'GET', '/api/bootstrap');
  const claimed = h.db().users.find((u) => u.id === invitation.json.userId);
  assert.equal(claimed.invited, undefined);
  const changed = h.token('invitee', { email: 'victim@example.invalid', email_confirmed_at: null });
  await h.request('invitee', 'GET', '/api/bootstrap', undefined, changed);
  const newInvitation = await h.request('owner-a', 'POST', '/api/projects/a/share', { email: 'victim@example.invalid', role: 'Admin' });
  assert.equal(newInvitation.status, 201);
  assert.notEqual(newInvitation.json.userId, invitation.json.userId);
  assert.equal((await h.request('invitee', 'PATCH', '/api/projects/a', { name: 'forbidden' }, changed)).status, 403);
});

test('invitation consolidation cannot migrate legacy ownership, workspace grants or authorship', () => {
  for (const scope of ['workspace', 'owner', 'comment', 'version', 'activity']) {
    const db = fixture();
    const pending = { id: 'u-pending', email: 'editor@example.invalid', invited: true };
    db.users.push(pending);
    if (scope === 'workspace') db.workspaces[0].members.push({ userId: pending.id, role: 'Admin' });
    if (scope === 'owner') db.projects[0].ownerId = pending.id;
    if (scope === 'comment') db.projects[0].comments[0].userId = pending.id;
    if (scope === 'version') db.projects[0].versions[0].userId = pending.id;
    if (scope === 'activity') db.activities[0].userId = pending.id;
    const before = JSON.stringify(db);
    assert.throws(() => authorization.claimPendingProjectInvitation(db, db.users.find((u) => u.id === 'editor'), { id: 'editor', email: pending.email, email_confirmed_at: '2026-01-01' }), /identity review/);
    assert.equal(JSON.stringify(db), before);
  }
});

test('only scoped profiles appear in self session, project payload and bootstrap', async (t) => {
  const h = harness(t);
  const session = (await h.request('guest', 'GET', '/api/session')).json;
  assert.equal(session.user.id, 'guest');
  assert.equal(Object.keys(session).sort().join(','), 'authenticated,provider,user');
  const project = (await h.request('guest', 'GET', '/api/projects/a')).json;
  assert.deepEqual(Object.keys(project.workspace).sort(), ['id', 'logo', 'name']);
  const serialized = JSON.stringify(project);
  for (const hidden of ['b-private', 'owner-b@example.invalid', 'workspace-member@example.invalid']) assert.ok(!serialized.includes(hidden));
  assert.equal((await h.request('guest', 'GET', '/api/users')).status, 404);
});

test('legacy email-only and blank-email records never imply identity or permission', async (t) => {
  const initial = fixture();
  initial.users.push({ id: 'u-legacy', email: 'legacy@example.invalid', name: 'Legacy' }, { id: 'u-blank', name: 'Blank' });
  initial.projects[0].members.push({ userId: 'u-legacy', role: 'Admin' }, { userId: 'u-blank', role: 'Admin' });
  const h = harness(t, initial);
  assert.equal((await h.request('owner-a', 'POST', '/api/projects/a/share', { email: 'legacy@example.invalid', role: 'Editor' })).status, 409);
  assert.equal((await h.request('legacy', 'GET', '/api/projects/a')).status, 404);
  const noEmail = h.token('no-email', { email: undefined, email_confirmed_at: undefined });
  assert.equal((await h.request('no-email', 'GET', '/api/projects/a', undefined, noEmail)).status, 404);
});

test('ambiguous invitation or subject mapping fails closed', async (t) => {
  const initial = fixture();
  initial.users.push({ id: 'u-invite-1', invited: true, email: 'invitee@example.invalid' }, { id: 'u-invite-2', invited: true, email: 'invitee@example.invalid' });
  initial.users.push({ id: 'duplicate', authUserId: 'editor' });
  const h = harness(t, initial);
  assert.equal((await h.request('invitee', 'GET', '/api/bootstrap')).status, 500);
  assert.equal((await h.request('editor', 'GET', '/api/bootstrap')).status, 500);
});

test('global and project SSE deliver only currently authorized project or workspace events', async (t) => {
  const h = harness(t);
  const streams = {};
  for (const id of ['editor', 'owner-b', 'outsider', 'guest', 'workspace-admin']) streams[id] = await h.request(id, 'GET', '/api/events');
  const scoped = await h.request('editor', 'GET', '/api/events?projectId=a');
  h.broadcast('project_updated', { secret: 'alpha' }, 'a');
  for (const id of ['editor', 'guest', 'workspace-admin']) assert.equal(streams[id].events.length, 2);
  for (const id of ['owner-b', 'outsider']) assert.equal(streams[id].events.length, 1);
  assert.equal(scoped.events.length, 2);
  h.broadcast('project_updated', { secret: 'beta' }, 'b');
  assert.equal(scoped.events.length, 2);
  assert.equal(streams['owner-b'].events.length, 2);
  h.broadcast('workspace_updated', { workspaceId: 'alpha' }, null, 'alpha');
  assert.equal(streams.editor.events.length, 3);
  assert.equal(streams.guest.events.length, 2);
  h.broadcast('unscoped', { secret: 'should never be sent' }, null);
  assert.equal(streams.outsider.events.length, 1);
});

test('project-created broadcast is filtered to owner and workspace administrators', async (t) => {
  const h = harness(t);
  const admin = await h.request('workspace-admin', 'GET', '/api/events');
  const colleague = await h.request('viewer', 'GET', '/api/events');
  const outsider = await h.request('owner-b', 'GET', '/api/events');
  await h.request('editor', 'POST', '/api/projects', { name: 'private new project', workspaceId: 'alpha' });
  assert.equal(admin.events.at(-1).type, 'project_created');
  assert.equal(colleague.events.length, 1);
  assert.equal(outsider.events.length, 1);
});

test('membership revocation blocks existing SSE immediately and removes presence', async (t) => {
  const h = harness(t);
  const stream = await h.request('guest', 'GET', '/api/events?projectId=a');
  await h.request('guest', 'POST', '/api/presence', { projectId: 'a' });
  h.db().projects[0].members = h.db().projects[0].members.filter((m) => m.userId !== 'guest');
  const count = stream.events.length;
  h.broadcast('project_updated', { secret: 'new value' }, 'a');
  assert.equal(stream.events.length, count);
  const project = (await h.request('owner-a', 'GET', '/api/projects/a')).json;
  assert.ok(!project.presence.some((u) => u.id === 'guest'));
  h.heartbeat();
  assert.equal(stream.ended, true);
});

test('expired SSE token prevents packets immediately and closes on heartbeat', async (t) => {
  const h = harness(t);
  const bearer = h.token('editor', {}, Date.parse('2026-10-07T15:00:01Z'));
  const stream = await h.request('editor', 'GET', '/api/events?projectId=a', undefined, bearer);
  h.advance(2000);
  h.broadcast('project_updated', { secret: 'after expiry' }, 'a');
  assert.equal(stream.events.length, 1);
  h.heartbeat();
  assert.equal(stream.ended, true);
});

test('permission is rechecked after a delayed mutation body', async (t) => {
  const h = harness(t);
  const pending = h.begin('editor', 'PATCH', '/api/projects/a');
  // Wait until Auth and the initial resource guard have completed.
  await new Promise((resolve) => setImmediate(resolve));
  h.db().projects[0].members.find((m) => m.userId === 'editor').role = 'Viewer';
  const before = protectedState(h);
  pending.req.end(JSON.stringify({ name: 'must not write' }));
  await pending.done;
  assert.equal(pending.res.status, 403);
  assert.equal(protectedState(h), before);
});

test('token expiry or removed local identity during a delayed mutation prevents writes', async (t) => {
  for (const reason of ['expired', 'deleted']) {
    const h = harness(t);
    const pending = h.begin('editor', 'PATCH', '/api/projects/a');
    await new Promise((resolve) => setImmediate(resolve));
    if (reason === 'expired') h.advance(3_600_001);
    else h.db().users = h.db().users.filter((u) => u.id !== 'editor');
    const before = protectedState(h);
    pending.req.end(JSON.stringify({ name: 'must not write' }));
    await pending.done;
    assert.equal(pending.res.status, 401);
    assert.equal(protectedState(h), before);
  }
});

test('workspace grant revocation blocks inherited project read and future global events', async (t) => {
  const h = harness(t);
  const stream = await h.request('workspace-admin', 'GET', '/api/events');
  h.db().workspaces[0].members = h.db().workspaces[0].members.filter((m) => m.userId !== 'workspace-admin');
  h.broadcast('project_updated', { secret: 'after revocation' }, 'a');
  h.broadcast('workspace_updated', { workspaceId: 'alpha' }, null, 'alpha');
  assert.equal(stream.events.length, 1);
  assert.equal((await h.request('workspace-admin', 'GET', '/api/projects/a')).status, 404);
});

test('a malformed pending invitation cannot claim history or ambiguous project roles', () => {
  for (const malformed of ['owner', 'duplicate', 'unknown-role']) {
    const db = fixture();
    db.users.push({ id: 'pending', invited: true, email: 'new@example.invalid' });
    db.projects[0].members.push({ userId: 'pending', role: 'Viewer' });
    if (malformed === 'owner') db.projects[0].ownerId = 'pending';
    if (malformed === 'duplicate') db.projects[0].members.push({ userId: 'pending', role: 'Admin' });
    if (malformed === 'unknown-role') db.projects[0].members.find((m) => m.userId === 'pending').role = 'Unknown';
    assert.throws(() => authorization.findBoundUser(db, { id: 'new-auth-user', email: 'new@example.invalid', email_confirmed_at: '2026-01-01' }), /identity review/);
  }
});

test('unknown permissions and malformed or duplicate memberships default deny', () => {
  const db = fixture();
  assert.equal(authorization.canProject(db, db.projects[0], 'editor', 'invented'), false);
  db.projects[0].members.push({ userId: 'editor', role: 'Admin' });
  assert.equal(authorization.canProject(db, db.projects[0], 'editor'), false);
  assert.equal(authorization.canProject(db, null, 'editor'), false);
  assert.equal(authorization.canProject(db, db.projects[0], undefined), false);
});

 test('workspace admin read override never elevates an explicit project role', () => {
  const db = fixture();
  const project = db.projects[0];
  assert.equal(authorization.projectRole(db, project, 'workspace-admin'), 'Viewer');
  project.members.push({ userId: 'workspace-admin', role: 'Commenter' });
  assert.equal(authorization.canProject(db, project, 'workspace-admin', 'comment'), true);
  assert.equal(authorization.canProject(db, project, 'workspace-admin', 'edit'), false);
  assert.equal(authorization.canProject(db, project, 'workspace-admin', 'administer'), false);
  project.members[project.members.length - 1].role = 'Editor';
  assert.equal(authorization.canProject(db, project, 'workspace-admin', 'edit'), true);
  assert.equal(authorization.canProject(db, project, 'workspace-admin', 'administer'), false);
 });

 test('optional conditional PATCH prevents lost updates, including same-clock saves', async t => {
  const h = harness(t);
  const original = h.db().projects[0].updatedAt;
  const first = await h.request('editor', 'PATCH', '/api/projects/a', { structuredLanguage: 'first', expectedUpdatedAt: original });
  assert.equal(first.status, 200);
  const firstVersion = first.json.updatedAt;
  const before = protectedState(h);
  const conflict = await h.request('project-admin', 'PATCH', '/api/projects/a', { structuredLanguage: 'stale', expectedUpdatedAt: original });
  assert.equal(conflict.status, 409);
  assert.equal(protectedState(h), before);
  const second = await h.request('editor', 'PATCH', '/api/projects/a', { structuredLanguage: 'second', expectedUpdatedAt: firstVersion });
  assert.equal(second.status, 200);
  assert.notEqual(second.json.updatedAt, firstVersion);
  assert.equal((await h.request('editor', 'PATCH', '/api/projects/a', { structuredLanguage: 'stale again', expectedUpdatedAt: firstVersion })).status, 409);
  assert.equal((await h.request('editor', 'PATCH', '/api/projects/a', { name: 'legacy unguarded' })).status, 200);
 });
 test('conditional version is checked after the request body arrives and after authorization', async t => {
  const h = harness(t);
  const original = h.db().projects[0].updatedAt;
  const pending = h.begin('editor', 'PATCH', '/api/projects/a');
  await new Promise(resolve => setImmediate(resolve));
  await h.request('owner-a', 'PATCH', '/api/projects/a', { name: 'concurrent', expectedUpdatedAt: original });
  const before = protectedState(h);
  pending.req.end(JSON.stringify({ name: 'late', expectedUpdatedAt: original }));
  await pending.done;
  assert.equal(pending.res.status, 409);
  assert.equal(protectedState(h), before);
  assert.equal((await h.request('viewer', 'PATCH', '/api/projects/a', { expectedUpdatedAt: 'wrong' })).status, 403);
  assert.equal((await h.request('outsider', 'PATCH', '/api/projects/a', { expectedUpdatedAt: 'wrong' })).status, 404);
  assert.equal((await h.request('editor', 'PATCH', '/api/projects/a', { expectedUpdatedAt: 42 })).status, 400);
 });
 test('other project mutations also advance the conditional version in the same clock tick', async t => {
  const h = harness(t);
  await h.request('editor', 'PATCH', '/api/projects/a', { name: 'first' });
  const version = h.db().projects[0].updatedAt;
  await h.request('commenter', 'POST', '/api/projects/a/comments', { body: 'concurrent review' });
  assert.notEqual(h.db().projects[0].updatedAt, version);
  assert.equal((await h.request('editor', 'PATCH', '/api/projects/a', { expectedUpdatedAt: version, name: 'stale' })).status, 409);
 });
