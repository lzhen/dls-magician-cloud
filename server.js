'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vxlwnvwijnzimjvgpeug.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_r3jVlTJmChdbHkJRcaBfcw_2k13Yx2A';

fs.mkdirSync(DATA_DIR, { recursive: true });

function nowIso() {
  return new Date().toISOString();
}

function seedDatabase() {
  const now = Date.now();
  const isoAgo = (minutes) => new Date(now - minutes * 60_000).toISOString();

  const baseLanguage = `GIVEN\nA brick-and-mortar advertiser wants to measure offline conversions.\n\nWHEN\nThey connect offline data and meet the required quality threshold.\n\nTHEN\nThey can create an omnichannel campaign optimized for offline outcomes.\n\nAND\nThe system tracks campaign performance and provides actionable insights.`;

  return {
    settings: {
      productName: 'DLS Magician',
      defaultWorkspaceId: 'ws-growth'
    },
    users: [
      { id: 'u-jen', name: 'Jen Lee', email: 'jen@dlsmagician.dev', initials: 'JL', title: 'Workspace admin', color: 'violet' },
      { id: 'u-alex', name: 'Alex Kim', email: 'alex@dlsmagician.dev', initials: 'AK', title: 'Product designer', color: 'blue' },
      { id: 'u-maria', name: 'Maria Garcia', email: 'maria@dlsmagician.dev', initials: 'MG', title: 'Design engineer', color: 'green' },
      { id: 'u-sam', name: 'Sam Patel', email: 'sam@dlsmagician.dev', initials: 'SP', title: 'Software engineer', color: 'amber' },
      { id: 'u-priya', name: 'Priya Shah', email: 'priya@dlsmagician.dev', initials: 'PS', title: 'Researcher', color: 'pink' }
    ],
    workspaces: [
      {
        id: 'ws-growth',
        name: 'Growth Marketing Team',
        slug: 'growth-marketing',
        logo: 'GM',
        plan: 'Team',
        domain: 'growth.example',
        authProviders: {
          microsoft: true,
          google: true,
          companySso: true,
          magicLink: true,
          ssoRequired: false,
          mfaRequired: true
        },
        members: [
          { userId: 'u-jen', role: 'Admin', joinedAt: isoAgo(60 * 24 * 90) },
          { userId: 'u-alex', role: 'Editor', joinedAt: isoAgo(60 * 24 * 70) },
          { userId: 'u-maria', role: 'Editor', joinedAt: isoAgo(60 * 24 * 40) },
          { userId: 'u-sam', role: 'Editor', joinedAt: isoAgo(60 * 24 * 30) },
          { userId: 'u-priya', role: 'Commenter', joinedAt: isoAgo(60 * 24 * 12) }
        ]
      }
    ],
    projects: [
      {
        id: 'p-omnichannel',
        name: 'Omnichannel Workflow',
        description: 'End-to-end campaign eligibility and offline data workflow.',
        workspaceId: 'ws-growth',
        ownerId: 'u-jen',
        status: 'Draft',
        category: 'Advertising',
        accent: 'violet',
        createdAt: isoAgo(60 * 24 * 21),
        updatedAt: isoAgo(2),
        structuredLanguage: baseLanguage,
        members: [
          { userId: 'u-jen', role: 'Admin' },
          { userId: 'u-alex', role: 'Editor' },
          { userId: 'u-maria', role: 'Editor' },
          { userId: 'u-sam', role: 'Viewer' }
        ],
        comments: [
          { id: 'c-1', userId: 'u-alex', body: 'Should the quality threshold be configurable by market?', anchor: 'WHEN', resolved: false, createdAt: isoAgo(20) },
          { id: 'c-2', userId: 'u-maria', body: 'The generated JSON is ready for API validation.', anchor: 'Generated JSON', resolved: true, createdAt: isoAgo(12) }
        ],
        versions: [
          { id: 'v-143', number: '1.4.3', userId: 'u-jen', message: 'Clarified offline quality threshold and outcomes.', createdAt: isoAgo(2), content: baseLanguage },
          { id: 'v-142', number: '1.4.2', userId: 'u-maria', message: 'Added campaign eligibility language.', createdAt: isoAgo(65), content: `GIVEN\nA brick-and-mortar advertiser wants to measure offline conversions.\n\nWHEN\nThey connect offline data.\n\nTHEN\nThey can create an omnichannel campaign.\n\nAND\nThe system tracks campaign performance.` },
          { id: 'v-141', number: '1.4.1', userId: 'u-alex', message: 'Added initial nurture sequence.', createdAt: isoAgo(60 * 24), content: `GIVEN\nAn advertiser wants to connect offline outcomes.\n\nWHEN\nOffline events are available.\n\nTHEN\nThe system creates a campaign workflow.` }
        ]
      },
      {
        id: 'p-ads-intent',
        name: 'Ads Manager Intent',
        description: 'Classify advertiser intent and route users to the right setup path.',
        workspaceId: 'ws-growth',
        ownerId: 'u-alex',
        status: 'In review',
        category: 'Advertising',
        accent: 'green',
        createdAt: isoAgo(60 * 24 * 16),
        updatedAt: isoAgo(60 * 24),
        structuredLanguage: `GIVEN\nAn advertiser describes a campaign goal.\n\nWHEN\nThe system detects the primary intent and required signals.\n\nTHEN\nIt recommends the best campaign setup and explains why.`,
        members: [
          { userId: 'u-alex', role: 'Admin' },
          { userId: 'u-jen', role: 'Editor' },
          { userId: 'u-maria', role: 'Commenter' }
        ],
        comments: [],
        versions: []
      },
      {
        id: 'p-offline-explorer',
        name: 'Offline Signals Explorer',
        description: 'Explore signal health, data quality, and remediation guidance.',
        workspaceId: 'ws-growth',
        ownerId: 'u-maria',
        status: 'Published',
        category: 'Analytics',
        accent: 'amber',
        createdAt: isoAgo(60 * 24 * 45),
        updatedAt: isoAgo(60 * 24 * 3),
        structuredLanguage: `GIVEN\nA specialist reviews offline signal health.\n\nWHEN\nThe system detects missing or low-quality events.\n\nTHEN\nIt explains the issue and recommends the highest-impact fix.`,
        members: [
          { userId: 'u-maria', role: 'Admin' },
          { userId: 'u-jen', role: 'Editor' },
          { userId: 'u-sam', role: 'Editor' }
        ],
        comments: [],
        versions: []
      },
      {
        id: 'p-pixel-assistant',
        name: 'Pixel Setup Assistant',
        description: 'Guide users through pixel installation and verification.',
        workspaceId: 'ws-growth',
        ownerId: 'u-sam',
        status: 'Draft',
        category: 'Onboarding',
        accent: 'blue',
        createdAt: isoAgo(60 * 24 * 8),
        updatedAt: isoAgo(60 * 24 * 3.4),
        structuredLanguage: `GIVEN\nA developer needs to install a tracking pixel.\n\nWHEN\nThey choose a platform and enter the website URL.\n\nTHEN\nThe assistant generates setup instructions and validates the installation.`,
        members: [
          { userId: 'u-sam', role: 'Admin' },
          { userId: 'u-jen', role: 'Editor' }
        ],
        comments: [],
        versions: []
      },
      {
        id: 'p-dataset-migration',
        name: 'Dataset Migration Plan',
        description: 'Migrate legacy data sources to a unified dataset model.',
        workspaceId: 'ws-growth',
        ownerId: 'u-jen',
        status: 'Published',
        category: 'Data',
        accent: 'pink',
        createdAt: isoAgo(60 * 24 * 55),
        updatedAt: isoAgo(60 * 24 * 14),
        structuredLanguage: `GIVEN\nAn account uses a legacy offline event source.\n\nWHEN\nThe migration is eligible and data mappings are complete.\n\nTHEN\nThe system creates a unified dataset without interrupting event delivery.`,
        members: [
          { userId: 'u-jen', role: 'Admin' },
          { userId: 'u-maria', role: 'Editor' },
          { userId: 'u-sam', role: 'Editor' }
        ],
        comments: [],
        versions: []
      },
      {
        id: 'p-audience-builder',
        name: 'Audience Builder',
        description: 'Build and refine high-intent audience definitions.',
        workspaceId: 'ws-growth',
        ownerId: 'u-priya',
        status: 'Draft',
        category: 'Advertising',
        accent: 'cyan',
        createdAt: isoAgo(60 * 24 * 12),
        updatedAt: isoAgo(60 * 24 * 30),
        structuredLanguage: `GIVEN\nA marketer defines a desired customer segment.\n\nWHEN\nThe system has enough first-party signals.\n\nTHEN\nIt proposes an audience definition with estimated reach and confidence.`,
        members: [
          { userId: 'u-priya', role: 'Admin' },
          { userId: 'u-jen', role: 'Commenter' }
        ],
        comments: [],
        versions: []
      }
    ],
    activities: [
      { id: 'a-1', userId: 'u-alex', projectId: 'p-omnichannel', type: 'comment', text: 'commented on the offline quality threshold', createdAt: isoAgo(20) },
      { id: 'a-2', userId: 'u-maria', projectId: 'p-omnichannel', type: 'approve', text: 'approved version 1.4.2', createdAt: isoAgo(65) },
      { id: 'a-3', userId: 'u-jen', projectId: 'p-offline-explorer', type: 'edit', text: 'updated Offline Signals Explorer', createdAt: isoAgo(60 * 5) },
      { id: 'a-4', userId: 'u-sam', projectId: 'p-omnichannel', type: 'comment', text: 'requested changes to the generated JSON', createdAt: isoAgo(60 * 8) },
      { id: 'a-5', userId: 'u-priya', projectId: null, type: 'member', text: 'joined the Growth Marketing Team workspace', createdAt: isoAgo(60 * 24) }
    ]
  };
}

if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify(seedDatabase(), null, 2));
}

let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const sseClients = new Set();
const presence = new Map();

function saveDb() {
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

function getUser(userId) {
  return db.users.find((user) => user.id === userId) || null;
}

function getWorkspace(workspaceId) {
  return db.workspaces.find((workspace) => workspace.id === workspaceId) || null;
}

function getProject(projectId) {
  return db.projects.find((project) => project.id === projectId) || null;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    initials: user.initials,
    title: user.title,
    color: user.color
  };
}

function ensureLocalUser(authUser) {
  let user = getUser(authUser.id) || db.users.find((candidate) => candidate.email?.toLowerCase() === authUser.email?.toLowerCase());
  const metadata = authUser.user_metadata || {};
  const name = metadata.full_name || metadata.name || authUser.email?.split('@')[0] || 'Workspace user';
  if (!user) {
    user = {
      id: authUser.id,
      name,
      email: authUser.email || '',
      initials: name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
      title: 'Workspace member',
      color: 'violet'
    };
    db.users.push(user);
    db.workspaces[0]?.members.push({ userId: user.id, role: 'Editor', joinedAt: nowIso() });
  } else {
    user.name = name;
    user.email = authUser.email || user.email;
  }
  saveDb();
  return user;
}

async function getSession(req, url = null) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` }
  });
  if (!response.ok) return null;
  const authUser = await response.json();
  const user = ensureLocalUser(authUser);
  return { sid: authUser.id, userId: user.id, provider: authUser.app_metadata?.provider || 'email', authUser };
}

function parseStructuredLanguage(text, name = 'Untitled workflow') {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const steps = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const upper = line.toUpperCase();
    if (['GIVEN', 'WHEN', 'THEN', 'AND'].includes(upper)) {
      current = { type: upper, text: '' };
      steps.push(current);
    } else if (current) {
      current.text += `${current.text ? ' ' : ''}${line}`;
    }
  }

  const entities = Array.from(
    new Set(
      steps
        .flatMap((step) => step.text.match(/\b(?:advertiser|campaign|offline data|signals?|performance|insights?|dataset|audience|pixel|workflow)\b/gi) || [])
        .map((item) => item.toLowerCase())
    )
  );

  return {
    intent: name,
    version: '1.0',
    steps: steps.map((step, index) => ({
      id: `step_${index + 1}`,
      type: step.type,
      text: step.text,
      entities: entities.filter((entity) => step.text.toLowerCase().includes(entity))
    })),
    entities,
    valid: ['GIVEN', 'WHEN', 'THEN'].every((required) => steps.some((step) => step.type === required && step.text))
  };
}

function projectPayload(project) {
  const workspace = getWorkspace(project.workspaceId);
  return {
    ...project,
    generated: parseStructuredLanguage(project.structuredLanguage, project.name),
    owner: publicUser(getUser(project.ownerId)),
    workspace: workspace ? { id: workspace.id, name: workspace.name, logo: workspace.logo } : null,
    members: project.members.map((member) => ({ ...member, user: publicUser(getUser(member.userId)) })),
    comments: project.comments.map((comment) => ({ ...comment, user: publicUser(getUser(comment.userId)) })),
    versions: project.versions.map((version) => ({ ...version, user: publicUser(getUser(version.userId)) }))
  };
}

function projectSummary(project) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    workspaceId: project.workspaceId,
    owner: publicUser(getUser(project.ownerId)),
    status: project.status,
    category: project.category,
    accent: project.accent,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    memberCount: project.members.length,
    members: project.members.slice(0, 4).map((member) => publicUser(getUser(member.userId))),
    commentCount: project.comments.filter((comment) => !comment.resolved).length
  };
}

function activityPayload(activity) {
  const project = activity.projectId ? getProject(activity.projectId) : null;
  return {
    ...activity,
    user: publicUser(getUser(activity.userId)),
    project: project ? { id: project.id, name: project.name } : null
  };
}

function recordActivity(userId, projectId, type, text) {
  const activity = {
    id: `a-${crypto.randomUUID()}`,
    userId,
    projectId: projectId || null,
    type,
    text,
    createdAt: nowIso()
  };
  db.activities.unshift(activity);
  db.activities = db.activities.slice(0, 100);
  return activity;
}

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > limit) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function broadcast(type, payload, projectId = null, excludeSid = null) {
  const packet = JSON.stringify({ type, payload, projectId, sentAt: nowIso() });
  for (const client of sseClients) {
    if (excludeSid && client.sid === excludeSid) continue;
    if (projectId && client.projectId && client.projectId !== projectId) continue;
    try {
      client.res.write(`data: ${packet}\n\n`);
    } catch (_) {
      sseClients.delete(client);
    }
  }
}

async function requireAuth(req, res, url) {
  const session = await getSession(req, url);
  if (!session) {
    sendError(res, 401, 'Authentication required');
    return null;
  }
  return session;
}

function versionNumber(project) {
  const latest = project.versions[0]?.number || '1.0.0';
  const parts = latest.split('.').map((value) => Number(value) || 0);
  parts[2] += 1;
  return parts.join('.');
}

function activePresence(projectId) {
  const projectPresence = presence.get(projectId) || new Map();
  const cutoff = Date.now() - 45_000;
  const users = [];
  for (const [userId, timestamp] of projectPresence.entries()) {
    if (timestamp < cutoff) {
      projectPresence.delete(userId);
      continue;
    }
    const user = getUser(userId);
    if (user) users.push(publicUser(user));
  }
  return users;
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/api/config') {
    return sendJson(res, 200, { supabaseUrl: SUPABASE_URL, supabasePublishableKey: SUPABASE_PUBLISHABLE_KEY });
  }

  if (req.method === 'GET' && pathname === '/api/session') {
    const session = await getSession(req, url);
    if (!session) return sendJson(res, 200, { authenticated: false });
    return sendJson(res, 200, {
      authenticated: true,
      provider: session.provider,
      user: publicUser(getUser(session.userId))
    });
  }

  if (req.method === 'GET' && pathname === '/api/events') {
    const session = await requireAuth(req, res, url);
    if (!session) return;
    const projectId = url.searchParams.get('projectId') || null;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write(`data: ${JSON.stringify({ type: 'connected', payload: { userId: session.userId }, sentAt: nowIso() })}\n\n`);

    const client = { res, sid: session.sid, userId: session.userId, projectId };
    sseClients.add(client);
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (_) {
        clearInterval(heartbeat);
      }
    }, 20_000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(client);
    });
    return;
  }

  const session = await requireAuth(req, res, url);
  if (!session) return;
  const currentUser = getUser(session.userId);

  if (req.method === 'GET' && pathname === '/api/bootstrap') {
    const workspaces = db.workspaces.map((workspace) => ({
      ...workspace,
      members: workspace.members.map((member) => ({ ...member, user: publicUser(getUser(member.userId)) }))
    }));
    return sendJson(res, 200, {
      user: publicUser(currentUser),
      workspaces,
      projects: db.projects
        .slice()
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .map(projectSummary),
      activities: db.activities.slice(0, 20).map(activityPayload),
      templates: [
        { id: 't-omni', name: 'Omnichannel Campaign', category: 'Advertising', description: 'End-to-end omnichannel campaign workflow.', accent: 'violet' },
        { id: 't-intent', name: 'Intent Classification', category: 'AI', description: 'Classify user intent and route actions.', accent: 'green' },
        { id: 't-onboard', name: 'Guided Setup', category: 'Onboarding', description: 'Create a step-by-step guided setup.', accent: 'blue' },
        { id: 't-quality', name: 'Data Quality Monitor', category: 'Analytics', description: 'Detect issues and recommend fixes.', accent: 'amber' }
      ]
    });
  }

  if (req.method === 'POST' && pathname === '/api/projects') {
    const body = await readBody(req);
    const name = String(body.name || '').trim();
    if (!name) return sendError(res, 400, 'Project name is required.');
    const project = {
      id: `p-${crypto.randomUUID()}`,
      name,
      description: String(body.description || 'A collaborative DLS workflow project.').trim(),
      workspaceId: body.workspaceId || db.settings.defaultWorkspaceId,
      ownerId: session.userId,
      status: 'Draft',
      category: body.category || 'Workflow',
      accent: body.accent || 'violet',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      structuredLanguage: String(body.structuredLanguage || `GIVEN\nDescribe the starting context.\n\nWHEN\nDescribe the triggering condition.\n\nTHEN\nDescribe the expected outcome.`),
      members: [{ userId: session.userId, role: 'Admin' }],
      comments: [],
      versions: []
    };
    db.projects.unshift(project);
    recordActivity(session.userId, project.id, 'create', `created ${project.name}`);
    saveDb();
    broadcast('project_created', projectSummary(project), null, session.sid);
    return sendJson(res, 201, projectPayload(project));
  }

  const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (projectMatch && req.method === 'GET') {
    const project = getProject(decodeURIComponent(projectMatch[1]));
    if (!project) return sendError(res, 404, 'Project not found.');
    return sendJson(res, 200, { ...projectPayload(project), presence: activePresence(project.id) });
  }

  if (projectMatch && req.method === 'PATCH') {
    const project = getProject(decodeURIComponent(projectMatch[1]));
    if (!project) return sendError(res, 404, 'Project not found.');
    const body = await readBody(req);
    const editable = ['name', 'description', 'status', 'structuredLanguage', 'category'];
    for (const key of editable) {
      if (Object.prototype.hasOwnProperty.call(body, key)) project[key] = String(body[key]);
    }
    project.updatedAt = nowIso();
    const activity = recordActivity(session.userId, project.id, 'edit', `updated ${project.name}`);
    saveDb();
    broadcast('project_updated', {
      project: projectPayload(project),
      activity: activityPayload(activity),
      actor: publicUser(currentUser)
    }, project.id, session.sid);
    return sendJson(res, 200, projectPayload(project));
  }

  const commentMatch = pathname.match(/^\/api\/projects\/([^/]+)\/comments$/);
  if (commentMatch && req.method === 'POST') {
    const project = getProject(decodeURIComponent(commentMatch[1]));
    if (!project) return sendError(res, 404, 'Project not found.');
    const body = await readBody(req);
    const commentBody = String(body.body || '').trim();
    if (!commentBody) return sendError(res, 400, 'Comment cannot be empty.');
    const comment = {
      id: `c-${crypto.randomUUID()}`,
      userId: session.userId,
      body: commentBody,
      anchor: String(body.anchor || 'General'),
      resolved: false,
      createdAt: nowIso()
    };
    project.comments.unshift(comment);
    project.updatedAt = nowIso();
    const activity = recordActivity(session.userId, project.id, 'comment', `commented on ${comment.anchor}`);
    saveDb();
    broadcast('comment_added', {
      comment: { ...comment, user: publicUser(currentUser) },
      activity: activityPayload(activity)
    }, project.id, session.sid);
    return sendJson(res, 201, { ...comment, user: publicUser(currentUser) });
  }

  const resolveCommentMatch = pathname.match(/^\/api\/projects\/([^/]+)\/comments\/([^/]+)$/);
  if (resolveCommentMatch && req.method === 'PATCH') {
    const project = getProject(decodeURIComponent(resolveCommentMatch[1]));
    if (!project) return sendError(res, 404, 'Project not found.');
    const comment = project.comments.find((item) => item.id === decodeURIComponent(resolveCommentMatch[2]));
    if (!comment) return sendError(res, 404, 'Comment not found.');
    const body = await readBody(req);
    comment.resolved = Boolean(body.resolved);
    project.updatedAt = nowIso();
    saveDb();
    broadcast('comment_updated', { comment: { ...comment, user: publicUser(getUser(comment.userId)) } }, project.id, session.sid);
    return sendJson(res, 200, { ...comment, user: publicUser(getUser(comment.userId)) });
  }

  const shareMatch = pathname.match(/^\/api\/projects\/([^/]+)\/share$/);
  if (shareMatch && req.method === 'POST') {
    const project = getProject(decodeURIComponent(shareMatch[1]));
    if (!project) return sendError(res, 404, 'Project not found.');
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const role = ['Admin', 'Editor', 'Commenter', 'Viewer'].includes(body.role) ? body.role : 'Editor';
    if (!email || !email.includes('@')) return sendError(res, 400, 'Enter a valid email address.');

    let user = db.users.find((candidate) => candidate.email.toLowerCase() === email);
    if (!user) {
      const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
      const name = local.split(' ').filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(' ') || 'Invited User';
      user = {
        id: `u-${crypto.randomUUID()}`,
        name,
        email,
        initials: name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
        title: 'Invited collaborator',
        color: 'cyan'
      };
      db.users.push(user);
    }

    const existing = project.members.find((member) => member.userId === user.id);
    if (existing) existing.role = role;
    else project.members.push({ userId: user.id, role });
    project.updatedAt = nowIso();
    const activity = recordActivity(session.userId, project.id, 'share', `invited ${user.name} as ${role}`);
    saveDb();
    broadcast('member_invited', {
      member: { userId: user.id, role, user: publicUser(user) },
      activity: activityPayload(activity)
    }, project.id, session.sid);
    return sendJson(res, 201, { userId: user.id, role, user: publicUser(user) });
  }

  const memberMatch = pathname.match(/^\/api\/projects\/([^/]+)\/members\/([^/]+)$/);
  if (memberMatch && req.method === 'PATCH') {
    const project = getProject(decodeURIComponent(memberMatch[1]));
    if (!project) return sendError(res, 404, 'Project not found.');
    const member = project.members.find((item) => item.userId === decodeURIComponent(memberMatch[2]));
    if (!member) return sendError(res, 404, 'Member not found.');
    const body = await readBody(req);
    if (!['Admin', 'Editor', 'Commenter', 'Viewer'].includes(body.role)) return sendError(res, 400, 'Invalid role.');
    member.role = body.role;
    project.updatedAt = nowIso();
    saveDb();
    broadcast('member_updated', { member: { ...member, user: publicUser(getUser(member.userId)) } }, project.id, session.sid);
    return sendJson(res, 200, { ...member, user: publicUser(getUser(member.userId)) });
  }

  const versionMatch = pathname.match(/^\/api\/projects\/([^/]+)\/versions$/);
  if (versionMatch && req.method === 'POST') {
    const project = getProject(decodeURIComponent(versionMatch[1]));
    if (!project) return sendError(res, 404, 'Project not found.');
    const body = await readBody(req);
    const version = {
      id: `v-${crypto.randomUUID()}`,
      number: versionNumber(project),
      userId: session.userId,
      message: String(body.message || 'Saved a new version.').trim(),
      createdAt: nowIso(),
      content: project.structuredLanguage
    };
    project.versions.unshift(version);
    project.updatedAt = nowIso();
    const activity = recordActivity(session.userId, project.id, 'version', `saved version ${version.number}`);
    saveDb();
    broadcast('version_created', {
      version: { ...version, user: publicUser(currentUser) },
      activity: activityPayload(activity)
    }, project.id, session.sid);
    return sendJson(res, 201, { ...version, user: publicUser(currentUser) });
  }

  const restoreMatch = pathname.match(/^\/api\/projects\/([^/]+)\/versions\/([^/]+)\/restore$/);
  if (restoreMatch && req.method === 'POST') {
    const project = getProject(decodeURIComponent(restoreMatch[1]));
    if (!project) return sendError(res, 404, 'Project not found.');
    const version = project.versions.find((item) => item.id === decodeURIComponent(restoreMatch[2]));
    if (!version) return sendError(res, 404, 'Version not found.');
    project.structuredLanguage = version.content;
    project.updatedAt = nowIso();
    const activity = recordActivity(session.userId, project.id, 'restore', `restored version ${version.number}`);
    saveDb();
    broadcast('project_updated', {
      project: projectPayload(project),
      activity: activityPayload(activity),
      actor: publicUser(currentUser)
    }, project.id, session.sid);
    return sendJson(res, 200, projectPayload(project));
  }

  if (req.method === 'POST' && pathname === '/api/presence') {
    const body = await readBody(req);
    const projectId = String(body.projectId || '');
    if (!getProject(projectId)) return sendError(res, 404, 'Project not found.');
    if (!presence.has(projectId)) presence.set(projectId, new Map());
    presence.get(projectId).set(session.userId, Date.now());
    const users = activePresence(projectId);
    broadcast('presence', { users }, projectId, session.sid);
    return sendJson(res, 200, { users });
  }

  const workspaceSettingsMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/settings$/);
  if (workspaceSettingsMatch && req.method === 'PATCH') {
    const workspace = getWorkspace(decodeURIComponent(workspaceSettingsMatch[1]));
    if (!workspace) return sendError(res, 404, 'Workspace not found.');
    const body = await readBody(req);
    const allowed = ['microsoft', 'google', 'companySso', 'magicLink', 'ssoRequired', 'mfaRequired'];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, key)) workspace.authProviders[key] = Boolean(body[key]);
    }
    if (typeof body.name === 'string' && body.name.trim()) workspace.name = body.name.trim();
    if (typeof body.domain === 'string') workspace.domain = body.domain.trim();
    saveDb();
    broadcast('workspace_updated', { workspaceId: workspace.id }, null, session.sid);
    return sendJson(res, 200, workspace);
  }

  return sendError(res, 404, 'API route not found.');
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon'
  }[ext] || 'application/octet-stream';
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const safeRelative = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  let filePath = path.join(PUBLIC_DIR, safeRelative);

  if (!filePath.startsWith(PUBLIC_DIR)) return sendError(res, 403, 'Forbidden');

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  try {
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Type': mimeType(filePath),
      'Content-Length': stat.size,
      'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    sendError(res, 500, 'Unable to serve file.');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
    } else {
      serveStatic(req, res, url);
    }
  } catch (error) {
    console.error(error);
    if (!res.headersSent) sendError(res, 500, error.message || 'Unexpected server error.');
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`DLS Magician Cloud is running at http://localhost:${PORT}`);
});

function shutdown() {
  for (const client of sseClients) {
    try { client.res.end(); } catch (_) { /* noop */ }
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
