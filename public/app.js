'use strict';

const ICONS = {
  home: '<path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/>',
  projects: '<path d="M3 6.5h6l2 2h10v10.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 10h18"/>',
  templates: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  workspace: '<path d="M5 21V5l7-3 7 3v16"/><path d="M3 21h18"/><path d="M8 8h1M8 12h1M8 16h1M15 8h1M15 12h1M15 16h1"/>',
  activity: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  files: '<path d="M6 2h8l4 4v16H6Z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h6"/>',
  members: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20.3h-3v-.08a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.56-1.03H5.3v-3h.14A1.7 1.7 0 0 0 7 9.94a1.7 1.7 0 0 0-.34-1.88L6.6 8l2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.7 4.7V4.6h3v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 8l-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.14v3h-.14A1.7 1.7 0 0 0 19.4 15Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4M8.7 13.3l6.6 4"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  comment: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  alert: '<path d="M12 3 2.7 20h18.6Z"/><path d="M12 9v4M12 17h.01"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/>',
  code: '<path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/>',
  magic: '<path d="m15 4 5 5L8 21l-5-5Z"/><path d="m13 6 5 5M6 3v4M4 5h4M19 16v4M17 18h4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  save: '<path d="M5 3h12l2 2v16H5Z"/><path d="M8 3v6h8V3M8 21v-8h8v8"/>',
  filter: '<path d="M4 5h16M7 12h10M10 19h4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  userPlus: '<path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8" cy="7" r="4"/><path d="M19 8v6M16 11h6"/>',
  sparkles: '<path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2ZM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7ZM5 13l.8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8Z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>',
  external: '<path d="M14 3h7v7M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7L20 14"/><path d="M20 8v6h-6"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20.5 14.2A8 8 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/>'
};

const DESIGN_SYSTEMS = {
  dls: { name: 'DLS Magician', source: 'Built-in', components: 8 },
  material: { name: 'Material UI', source: 'Built-in', components: 11 },
  ant: { name: 'Ant Design', source: 'Built-in', components: 10 }
};

function savedDesignSystem() {
  try {
    const connection = JSON.parse(localStorage.getItem('dls-magician-mcp-connection') || 'null');
    if (connection?.name && connection?.serverUrl) {
      DESIGN_SYSTEMS.connected = { name: connection.name, source: 'MCP', components: 12, serverUrl: connection.serverUrl };
    }
    const value = localStorage.getItem('dls-magician-design-system');
    return DESIGN_SYSTEMS[value] ? value : 'dls';
  } catch (_) {
    return 'dls';
  }
}

function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.files}</svg>`;
}

const state = {
  loading: true,
  user: null,
  provider: null,
  workspaces: [],
  projects: [],
  activities: [],
  templates: [],
  activeProject: null,
  editorText: '',
  editorDirty: false,
  autosaveTimer: null,
  streamController: null,
  presenceTimer: null,
  modal: null,
  modalReturnFocus: null,
  magicOpen: false,
  shareTab: 'invite',
  selectedVersionId: null,
  settingsTab: 'authentication',
  previewMode: 'interface',
  previewViewport: 'desktop',
  previewZoom: '100',
  intentWidth: 40,
  searchQuery: '',
  designSystem: savedDesignSystem(),
  mcpConnection: null,
  theme: localStorage.getItem('dls-theme') || (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
};
document.documentElement.dataset.theme = state.theme;
let supabaseClient = null;

const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');
const toastRoot = document.getElementById('toast-root');
const statusAnnouncer = document.getElementById('status-announcer');
const alertAnnouncer = document.getElementById('alert-announcer');

function announce(message, urgent = false) {
  const region = urgent ? alertAnnouncer : statusAnnouncer;
  region.textContent = '';
  window.requestAnimationFrame(() => { region.textContent = String(message || ''); });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

function designSystemOptions() {
  return Object.entries(DESIGN_SYSTEMS).map(([id, system]) => `<option value="${id}" ${state.designSystem === id ? 'selected' : ''}>${escapeHtml(system.name)}</option>`).join('') + '<option value="mcp">Connect via MCP…</option>';
}

function designSystemSelect(compact = false) {
  return `<label class="design-system-picker ${compact ? 'design-system-picker-compact' : ''}"><span>Design system</span><select data-action="design-system-select" aria-label="Design system">${designSystemOptions()}</select></label>`;
}

function designSystemComponents() {
  const components = {
    dls: ['Surface', 'Status card', 'Select field', 'Inline insight', 'Button'],
    material: ['Paper', 'Card', 'List', 'Select', 'Alert', 'Button'],
    ant: ['Layout', 'Card', 'List', 'Select', 'Alert', 'Button'],
    connected: ['Surface', 'Card', 'Field', 'Message', 'Button']
  };
  return components[state.designSystem] || components.dls;
}

function generatedOutput(generated) {
  const system = DESIGN_SYSTEMS[state.designSystem];
  return {
    ...generated,
    designSystem: {
      id: state.designSystem,
      name: system.name,
      source: system.source,
      components: designSystemComponents()
    }
  };
}

function renderOutput(generated) {
  if (state.previewMode === 'json') return `<div class="json-view"><pre class="json-code" id="json-code">${highlightJson(generatedOutput(generated))}</pre></div>`;
  if (state.previewMode === 'flow') return `<div class="flow-view"><div class="flow-canvas">${renderFlow(generated.steps)}</div></div>`;
  return renderGeneratedInterface(generated);
}

function renderOutputTools() {
  if (state.previewMode === 'json') {
    return `${designSystemSelect(true)}<button class="btn btn-sm btn-ghost" data-action="copy-generated-json">${icon('copy', 'icon-sm')}<span>Copy JSON</span></button>`;
  }
  if (state.previewMode === 'flow') return '';
  return `${designSystemSelect(true)}<select class="output-control" data-action="preview-viewport" aria-label="Preview viewport"><option value="desktop" ${state.previewViewport === 'desktop' ? 'selected' : ''}>Desktop</option><option value="mobile" ${state.previewViewport === 'mobile' ? 'selected' : ''}>Mobile</option></select><select class="output-control" data-action="preview-zoom" aria-label="Preview zoom"><option value="75" ${state.previewZoom === '75' ? 'selected' : ''}>75%</option><option value="100" ${state.previewZoom === '100' ? 'selected' : ''}>100%</option><option value="125" ${state.previewZoom === '125' ? 'selected' : ''}>125%</option></select><button class="btn btn-icon btn-sm btn-ghost" data-action="preview" aria-label="Expand preview" title="Expand preview">${icon('external', 'icon-sm')}</button>`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 2) return 'yesterday';
  if (diff < day * 14) return `${Math.floor(diff / day)}d ago`;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(iso));
}

function fullDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(iso));
}

function firstName(name) {
  return String(name || 'there').split(/\s+/)[0];
}

function avatar(user, size = '') {
  if (!user) return '<span class="avatar">?</span>';
  return `<span class="avatar ${size} ${escapeHtml(user.color || 'violet')}" title="${escapeHtml(user.name)}">${escapeHtml(user.initials || '?')}</span>`;
}

function avatarStack(users = [], total = null) {
  const safeUsers = users.filter(Boolean).slice(0, 4);
  const count = total ?? users.length;
  const extra = Math.max(0, count - safeUsers.length);
  return `<span class="avatar-stack">${safeUsers.map((user) => avatar(user, 'avatar-sm')).join('')}${extra ? `<span class="avatar-more">+${extra}</span>` : ''}</span>`;
}

function statusClass(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('publish')) return 'published';
  if (value.includes('review')) return 'review';
  return 'draft';
}

function projectIcon(accent = 'violet') {
  const selected = accent === 'green' ? 'sparkles' : accent === 'amber' ? 'activity' : accent === 'blue' ? 'magic' : accent === 'pink' ? 'workspace' : accent === 'cyan' ? 'members' : 'files';
  return `<span class="project-icon">${icon(selected)}</span>`;
}

function providerMark(provider) {
  if (provider === 'microsoft') {
    return '<span class="provider-mark microsoft-mark"><i></i><i></i><i></i><i></i></span>';
  }
  if (provider === 'google') {
    return '<span class="provider-mark google-mark">G</span>';
  }
  if (provider === 'sso') {
    return `<span class="provider-mark">${icon('shield')}</span>`;
  }
  return `<span class="provider-mark">${icon('mail')}</span>`;
}

function brandLockup() {
  return `<span class="brand-lockup"><span class="brand-symbol" aria-hidden="true"></span><span class="brand-name"><span class="brand-prefix">DLS</span> <span class="brand-product">MAGICIAN</span></span></span>`;
}

function themeToggle(className = '') {
  const light = state.theme === 'light';
  return `<button class="btn btn-icon btn-ghost theme-toggle ${className}" data-action="toggle-theme" aria-label="Switch to ${light ? 'dark' : 'light'} mode" title="${light ? 'Dark' : 'Light'} mode">${icon(light ? 'moon' : 'sun')}</button>`;
}

async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeout || 12_000);
  const config = {
    method: options.method || 'GET',
    headers: { ...(options.headers || {}) },
    signal: controller.signal
  };
  if (supabaseClient) {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session?.access_token) config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  if (options.body !== undefined) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(options.body);
  }
  let response;
  try {
    response = await fetch(path, config);
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The server took too long to respond. Please refresh and try again.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  let payload = null;
  const text = await response.text();
  if (text) {
    try { payload = JSON.parse(text); } catch (_) { payload = { error: text }; }
  }
  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function showToast(message, type = 'success', duration = 3600) {
  const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const iconName = type === 'error' ? 'alert' : type === 'info' ? 'bell' : 'checkCircle';
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.id = id;
  node.setAttribute('role', type === 'error' ? 'alert' : 'status');
  node.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  node.innerHTML = `
    <span class="toast-icon">${icon(iconName)}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" data-action="dismiss-toast" data-toast-id="${id}" aria-label="Dismiss">${icon('close', 'icon-sm')}</button>
  `;
  toastRoot.appendChild(node);
  window.setTimeout(() => node.remove(), duration);
}

function renderLoading() {
  app.innerHTML = `<div class="loading-screen" role="status" aria-live="polite"><div class="loading-mark"><div class="spinner" aria-hidden="true"></div><div>Preparing your workspace…</div></div></div>`;
}

async function boot() {
  renderLoading();
  try {
    const config = await api('/api/config');
    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!session && state.user) logout(false);
    });
    const { data: authData } = await supabaseClient.auth.getSession();
    if (authData.session) {
      const session = await api('/api/session');
      if (session.authenticated) {
        state.user = session.user;
        state.provider = session.provider;
        await loadBootstrap();
      }
    }
  } catch (error) {
    console.error(error);
  }

  state.loading = false;
  await handleRoute();
}

async function loadBootstrap() {
  const data = await api('/api/bootstrap');
  state.user = data.user;
  state.workspaces = data.workspaces || [];
  state.projects = data.projects || [];
  state.activities = data.activities || [];
  state.templates = data.templates || [];
}

function parseRoute() {
  const value = window.location.hash.replace(/^#\/?/, '') || (state.user ? 'dashboard' : 'login');
  const [page, id] = value.split('/');
  return { page, id };
}

async function handleRoute() {
  const route = parseRoute();
  if (!state.user) {
    disconnectStream();
    renderLogin();
    return;
  }

  if (route.page === 'project' && route.id) {
    await loadProject(route.id);
    renderEditor();
    connectStream(route.id);
    startPresence(route.id);
    return;
  }

  stopPresence();
  state.activeProject = null;
  state.editorText = '';
  connectStream(null);
  renderShell(route.page || 'dashboard');
}

async function loadProject(projectId, { silent = false } = {}) {
  if (!silent) renderLoading();
  try {
    const project = await api(`/api/projects/${encodeURIComponent(projectId)}`);
    state.activeProject = project;
    state.editorText = project.structuredLanguage || '';
    state.editorDirty = false;
    if (!state.selectedVersionId) state.selectedVersionId = project.versions?.[0]?.id || null;
  } catch (error) {
    showToast(error.message, 'error');
    window.location.hash = '#dashboard';
  }
}

function renderLogin() {
  app.innerHTML = `
    <main class="auth-shell">
      ${themeToggle('auth-theme-toggle')}
      <section class="auth-visual" aria-label="DLS Magician product introduction">
        <div class="auth-glow"></div>
        <div>${brandLockup()}</div>
        <div class="auth-copy">
          <div class="auth-eyebrow">Cloud collaboration workspace</div>
          <h1 class="auth-title">Turn structured language into <em>working systems.</em></h1>
          <p class="auth-description">Designers and engineers can shape intent together, generate machine-readable workflows, review changes, and ship with shared confidence.</p>
        </div>
        <div class="auth-proof">
          <div class="auth-proof-group">
            ${avatar({ initials: 'JL', name: 'Jen Lee', color: 'violet' })}
            ${avatar({ initials: 'AK', name: 'Alex Kim', color: 'blue' })}
            ${avatar({ initials: 'MG', name: 'Maria Garcia', color: 'green' })}
            ${avatar({ initials: 'SP', name: 'Sam Patel', color: 'amber' })}
          </div>
          <span>One shared source of truth for design and engineering.</span>
        </div>
      </section>
      <section class="auth-panel">
        <div class="auth-card">
          <div class="auth-card-header">
            <div class="auth-card-mark"><span class="brand-symbol" aria-hidden="true"></span></div>
            <h2>Welcome to<br><span class="auth-title-prefix">DLS</span> Magician</h2>
            <p>Secure sign-in for teams. No product password required.</p>
          </div>
          <div class="provider-list">
            ${providerButton('microsoft', 'Continue with Microsoft')}
            ${providerButton('google', 'Continue with Google')}
            ${providerButton('sso', 'Continue with company SSO')}
          </div>
          <div class="auth-divider">or</div>
          <button class="provider-btn" data-action="toggle-magic">
            ${providerMark('magic')}
            <span class="provider-name">Email magic link</span>
            ${icon(state.magicOpen ? 'chevronLeft' : 'chevronRight', 'provider-chevron icon-sm')}
          </button>
          ${state.magicOpen ? `
            <form class="magic-form" data-form="magic-login">
              <input class="input" type="email" name="email" placeholder="you@company.com" required autocomplete="email" aria-label="Work email" />
              <button class="btn btn-primary" type="submit">Send link</button>
            </form>
          ` : ''}
          <div class="auth-demo-note">${icon('shield', 'icon-sm')}<span>Authentication is secured by Supabase. Your account is recorded when you sign in.</span></div>
          <div class="auth-legal">By continuing, you agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.</div>
        </div>
      </section>
    </main>
  `;
  modalRoot.innerHTML = '';
}

function providerButton(provider, label) {
  return `
    <button class="provider-btn" data-action="auth-provider" data-provider="${provider}">
      ${providerMark(provider)}
      <span class="provider-name">${escapeHtml(label)}</span>
      ${icon('chevronRight', 'provider-chevron icon-sm')}
    </button>
  `;
}

function sidebar(activePage) {
  const projectCount = state.projects.length;
  return `
    <aside class="sidebar">
      <div class="sidebar-header">${brandLockup()}</div>
      <div class="sidebar-scroll">
        <div class="sidebar-section">
          <nav class="nav-list" aria-label="Primary navigation">
            ${navItem('dashboard', 'Home', 'home', activePage, '#dashboard')}
            ${navItem('projects', 'Projects', 'projects', activePage, '#projects', projectCount)}
            ${navItem('templates', 'Templates', 'templates', activePage, '#templates')}
          </nav>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-label">Workspace</div>
          <nav class="nav-list">
            ${navItem('workspaces', 'Workspaces', 'workspace', activePage, '#workspaces')}
            ${navItem('activity', 'Activity', 'activity', activePage, '#activity')}
            ${navItem('files', 'Files', 'files', activePage, '#projects')}
            ${navItem('members', 'Members', 'members', activePage, '#members', state.workspaces[0]?.members?.length || 0)}
          </nav>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-label">Settings</div>
          <nav class="nav-list">
            ${navItem('settings', 'Preferences', 'settings', activePage, '#settings')}
            <a class="nav-item" href="/help.html" target="_blank" rel="noopener">${icon('files')}<span>Help & docs<span class="sr-only"> (opens in a new tab)</span></span></a>
          </nav>
        </div>
      </div>
      <button class="sidebar-user" data-action="user-menu">
        ${avatar(state.user)}
        <span class="sidebar-user-meta"><span class="sidebar-user-name">${escapeHtml(state.user.name)}</span><span class="sidebar-user-role">${escapeHtml(state.user.title || 'Collaborator')}</span></span>
        ${icon('more', 'icon-sm')}
      </button>
    </aside>
  `;
}

function navItem(page, label, iconName, activePage, href, badge = null) {
  const active = activePage === page;
  return `<a class="nav-item ${active ? 'active' : ''}" href="${href}" ${active ? 'aria-current="page"' : ''}>${icon(iconName)}<span>${escapeHtml(label)}</span>${badge !== null ? `<span class="nav-badge">${badge}</span>` : ''}</a>`;
}

function topbar(title, subtitle = '', options = {}) {
  return `
    <header class="topbar">
      <button class="btn btn-icon btn-ghost mobile-only" data-action="mobile-home" aria-label="Open navigation">${icon('menu')}</button>
      <div class="topbar-title">
        <div class="topbar-heading">${escapeHtml(title)}</div>
        ${subtitle ? `<div class="topbar-subtitle">${escapeHtml(subtitle)}</div>` : ''}
      </div>
      ${options.hideSearch ? '' : `
        <div class="search-box">
          ${icon('search')}
          <input type="search" data-action="global-search" placeholder="Search projects, files, templates…" aria-label="Search" />
          <span class="search-shortcut">⌘ K</span>
        </div>
      `}
      <button class="btn btn-icon btn-ghost" data-action="notifications" aria-label="Notifications">${icon('bell')}</button>
      ${themeToggle()}
      ${options.action || ''}
    </header>
  `;
}

function renderShell(activePage) {
  const page = ['dashboard', 'projects', 'templates', 'workspaces', 'activity', 'members', 'settings'].includes(activePage) ? activePage : 'dashboard';
  const content = {
    dashboard: renderDashboardPage,
    projects: renderProjectsPage,
    templates: renderTemplatesPage,
    workspaces: renderWorkspacesPage,
    activity: renderActivityPage,
    members: renderMembersPage,
    settings: renderSettingsPage
  }[page]();

  app.innerHTML = `
    <div class="app-shell">
      ${sidebar(page)}
      <main class="main-shell">
        <div class="main-scroll">
          ${topbar(page === 'dashboard' ? 'Workspace' : capitalize(page), page === 'dashboard' ? state.workspaces[0]?.name || '' : '')}
          ${content}
        </div>
      </main>
    </div>
  `;
  renderModal();
}

function capitalize(value) {
  return String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);
}

function renderDashboardPage() {
  const recent = state.projects.slice(0, 3);
  const activities = state.activities.slice(0, 4);
  return `
    <div class="page">
      <section class="dashboard-hero">
        <div class="hero-copy">
          <div class="hero-greeting">Good morning, ${escapeHtml(firstName(state.user.name))} <span aria-hidden="true">👋</span></div>
          <h1 class="hero-title">Turn structured language<br>into working prototypes.</h1>
          <p class="hero-subtitle">Write intent in natural language, generate JSON, review the executable flow, and collaborate with your team in one workspace.</p>
          <div class="hero-actions">
            <button class="btn btn-primary btn-lg" data-action="new-project">${icon('plus')}Create new project</button>
            <a class="btn btn-lg" href="#templates">${icon('templates')}Explore templates</a>
          </div>
        </div>
        <aside class="hero-activity">
          <div class="hero-activity-title"><span>Your recent activity</span><a class="text-link" href="#activity">View all</a></div>
          ${activities.slice(0, 3).map((item) => `
            <div class="hero-activity-item">
              ${avatar(item.user, 'avatar-sm')}
              <div class="hero-activity-name">${escapeHtml(item.project?.name || item.text)}</div>
              <div class="hero-activity-time">${relativeTime(item.createdAt)}</div>
            </div>
          `).join('')}
        </aside>
      </section>

      <div class="section-heading">
        <div><h2>Recent collaborative projects</h2><p>Pick up where your team left off.</p></div>
        <a class="text-link" href="#projects">View all ${icon('arrowRight', 'icon-sm')}</a>
      </div>
      <section class="project-grid">
        ${recent.map(renderProjectCard).join('')}
      </section>

      <div class="dashboard-lower">
        <section class="panel">
          <div class="panel-header"><h3 class="panel-title">Shared workspaces</h3><a class="text-link" href="#workspaces">View all</a></div>
          <div class="workspace-list">
            ${state.workspaces.map((workspace) => `
              <div class="workspace-row">
                <div class="workspace-logo">${escapeHtml(workspace.logo)}</div>
                <div><div class="row-title">${escapeHtml(workspace.name)}</div><div class="row-subtitle">${workspace.members.length} members · ${escapeHtml(workspace.plan)} plan</div></div>
                ${avatarStack(workspace.members.map((member) => member.user), workspace.members.length)}
              </div>
            `).join('')}
            <div class="workspace-row">
              <div class="workspace-logo">CP</div>
              <div><div class="row-title">Core Platform</div><div class="row-subtitle">14 projects · 14 members</div></div>
              ${avatarStack([
                { initials: 'AK', name: 'Alex Kim', color: 'blue' },
                { initials: 'SP', name: 'Sam Patel', color: 'amber' },
                { initials: 'MG', name: 'Maria Garcia', color: 'green' }
              ], 14)}
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header"><h3 class="panel-title">Team activity</h3><a class="text-link" href="#activity">View all</a></div>
          <div class="activity-list">
            ${activities.map(renderActivityRow).join('')}
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderProjectCard(project) {
  return `
    <a class="project-card" href="#project/${escapeHtml(project.id)}" data-accent="${escapeHtml(project.accent || 'violet')}">
      <div class="project-card-top">
        ${projectIcon(project.accent)}
        <span class="status-pill ${statusClass(project.status)}">${escapeHtml(project.status)}</span>
      </div>
      <h3 class="project-card-title">${escapeHtml(project.name)}</h3>
      <p class="project-card-description">${escapeHtml(project.description)}</p>
      <div class="project-card-footer">
        ${avatarStack(project.members, project.memberCount)}
        <span class="project-meta">Updated ${relativeTime(project.updatedAt)}</span>
      </div>
    </a>
  `;
}

function renderActivityRow(item) {
  return `
    <div class="activity-row">
      ${avatar(item.user, 'avatar-sm')}
      <div>
        <div class="activity-copy"><strong>${escapeHtml(item.user?.name || 'A teammate')}</strong> ${escapeHtml(item.text)}${item.project ? ` in <strong>${escapeHtml(item.project.name)}</strong>` : ''}</div>
        <div class="activity-time">${relativeTime(item.createdAt)}</div>
      </div>
    </div>
  `;
}

function renderProjectsPage() {
  return `
    <div class="page">
      <div class="page-header">
        <div><div class="page-kicker">Shared source of truth</div><h1 class="page-title">Projects</h1><p class="page-description">Manage structured-language files, collaborators, review status, and version history across the workspace.</p></div>
        <button class="btn btn-primary" data-action="new-project">${icon('plus')}New project</button>
      </div>
      <section class="table-shell">
        <div class="table-toolbar">
          <div class="search-box">${icon('search')}<input id="project-filter" type="search" placeholder="Search projects…" aria-label="Filter projects" /></div>
          <select class="select" style="width:140px" aria-label="Project status"><option>All statuses</option><option>Draft</option><option>In review</option><option>Published</option></select>
          <button class="btn btn-icon" aria-label="Filters">${icon('filter')}</button>
        </div>
        <table class="data-table">
          <thead><tr><th scope="col">Name</th><th scope="col">Status</th><th scope="col">Category</th><th scope="col">Collaborators</th><th scope="col">Last modified</th><th scope="col">Owner</th></tr></thead>
          <tbody id="project-table-body">
            ${state.projects.map(renderProjectTableRow).join('')}
          </tbody>
        </table>
      </section>
    </div>
  `;
}

function renderProjectTableRow(project) {
  return `
    <tr data-project-name="${escapeHtml(project.name.toLowerCase())}">
      <td><a class="table-name table-project-link" href="#project/${escapeHtml(project.id)}"><span class="mini-file-icon">${icon('files', 'icon-sm')}</span><span>${escapeHtml(project.name)}</span></a></td>
      <td><span class="status-pill ${statusClass(project.status)}">${escapeHtml(project.status)}</span></td>
      <td>${escapeHtml(project.category)}</td>
      <td>${avatarStack(project.members, project.memberCount)}</td>
      <td>${relativeTime(project.updatedAt)}</td>
      <td>${escapeHtml(project.owner?.name || '—')}</td>
    </tr>
  `;
}

function renderTemplatesPage() {
  return `
    <div class="page">
      <div class="page-header">
        <div><div class="page-kicker">Start with a proven pattern</div><h1 class="page-title">Templates</h1><p class="page-description">Use a reusable workflow structure, then adapt the language, generated schema, and preview to your product.</p></div>
      </div>
      <section class="template-grid">
        ${state.templates.map((template) => `
          <article class="template-card" data-accent="${escapeHtml(template.accent)}">
            ${projectIcon(template.accent)}
            <span class="badge">${escapeHtml(template.category)}</span>
            <h3>${escapeHtml(template.name)}</h3>
            <p>${escapeHtml(template.description)}</p>
            <button class="btn" data-action="use-template" data-template-id="${escapeHtml(template.id)}">Use template</button>
          </article>
        `).join('')}
      </section>
    </div>
  `;
}

function renderWorkspacesPage() {
  const workspace = state.workspaces[0];
  return `
    <div class="page">
      <div class="page-header">
        <div><div class="page-kicker">Organization</div><h1 class="page-title">Workspaces</h1><p class="page-description">Group projects, people, permissions, and identity policies around a shared team boundary.</p></div>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${workspace?.members.length || 0}</div><div class="stat-label">Workspace members</div></div>
        <div class="stat-card"><div class="stat-value">${state.projects.length}</div><div class="stat-label">Shared projects</div></div>
        <div class="stat-card"><div class="stat-value">4</div><div class="stat-label">Authentication methods</div></div>
      </div>
      <div class="section-heading"><div><h2>Your workspaces</h2><p>Managed collaboration environments.</p></div></div>
      <section class="panel">
        <div class="workspace-list">
          ${state.workspaces.map((item) => `
            <div class="workspace-row">
              <div class="workspace-logo">${escapeHtml(item.logo)}</div>
              <div><div class="row-title">${escapeHtml(item.name)}</div><div class="row-subtitle">${escapeHtml(item.domain)} · ${item.members.length} members · ${escapeHtml(item.plan)}</div></div>
              <a class="btn btn-sm" href="#settings">Manage</a>
            </div>
          `).join('')}
        </div>
      </section>
    </div>
  `;
}

function renderActivityPage() {
  return `
    <div class="page">
      <div class="page-header"><div><div class="page-kicker">Audit trail</div><h1 class="page-title">Activity</h1><p class="page-description">See edits, comments, approvals, invitations, and version changes across the workspace.</p></div></div>
      <section class="panel">
        <div class="panel-header"><h3 class="panel-title">Workspace activity</h3><button class="btn btn-sm" data-action="refresh-bootstrap">${icon('refresh', 'icon-sm')}Refresh</button></div>
        <div class="activity-list">${state.activities.map(renderActivityRow).join('')}</div>
      </section>
    </div>
  `;
}

function renderMembersPage() {
  const workspace = state.workspaces[0];
  return `
    <div class="page">
      <div class="page-header"><div><div class="page-kicker">People and access</div><h1 class="page-title">Members</h1><p class="page-description">Manage who can create, edit, comment on, and administer shared projects.</p></div><button class="btn btn-primary" data-action="open-workspace-invite">${icon('userPlus')}Invite member</button></div>
      <section class="table-shell">
        <table class="data-table">
          <thead><tr><th scope="col">Member</th><th scope="col">Role</th><th scope="col">Title</th><th scope="col">Joined</th><th scope="col">Status</th></tr></thead>
          <tbody>
            ${(workspace?.members || []).map((member) => `
              <tr>
                <td><div class="table-name">${avatar(member.user, 'avatar-sm')}<span>${escapeHtml(member.user.name)}<small style="display:block;color:var(--muted-2);font-weight:400">${escapeHtml(member.user.email)}</small></span></div></td>
                <td>${escapeHtml(member.role)}</td>
                <td>${escapeHtml(member.user.title)}</td>
                <td>${relativeTime(member.joinedAt)}</td>
                <td><span class="status-pill published">Active</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    </div>
  `;
}

function renderSettingsPage() {
  const workspace = state.workspaces[0];
  const auth = workspace?.authProviders || {};
  return `
    <div class="page">
      <div class="page-header"><div><div class="page-kicker">Workspace administration</div><h1 class="page-title">Settings</h1><p class="page-description">Configure identity providers, company SSO, security policies, and workspace defaults.</p></div></div>
      <div class="settings-layout">
        <nav class="settings-nav" role="tablist" aria-label="Settings sections">
          ${settingsNavButton('general', 'General', 'settings')}
          ${settingsNavButton('authentication', 'Authentication', 'shield')}
          ${settingsNavButton('team', 'Team', 'members')}
          ${settingsNavButton('security', 'Security', 'lock')}
          ${settingsNavButton('billing', 'Plan & billing', 'files')}
        </nav>
        <section class="settings-content" id="settings-panel" role="tabpanel" aria-labelledby="settings-tab-${escapeHtml(state.settingsTab)}">
          ${renderSettingsContent(workspace, auth)}
        </section>
      </div>
    </div>
  `;
}

function settingsNavButton(tab, label, iconName) {
  const selected = state.settingsTab === tab;
  return `<button id="settings-tab-${tab}" class="${selected ? 'active' : ''}" data-action="settings-tab" data-tab="${tab}" role="tab" aria-selected="${selected}" aria-controls="settings-panel" tabindex="${selected ? '0' : '-1'}">${icon(iconName, 'icon-sm')}${escapeHtml(label)}</button>`;
}

function renderSettingsContent(workspace, auth) {
  if (state.settingsTab === 'general') {
    return `
      <section class="settings-section">
        <div class="settings-section-header"><h3>Organization profile</h3><p>Basic information shown to collaborators.</p></div>
        <div style="padding:18px;display:grid;gap:14px">
          <div class="form-row"><div class="field"><label for="organization-name">Organization name</label><input id="organization-name" class="input" value="${escapeHtml(workspace?.name || '')}" /></div><div class="field"><label for="workspace-slug">Workspace slug</label><input id="workspace-slug" class="input" value="${escapeHtml(workspace?.slug || '')}" /></div></div>
          <div class="field"><label for="verified-domain">Verified domain</label><input id="verified-domain" class="input" value="${escapeHtml(workspace?.domain || '')}" /></div>
          <div><button class="btn btn-primary" data-action="save-general-settings">Save changes</button></div>
        </div>
      </section>
    `;
  }

  if (state.settingsTab === 'team') {
    return `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${workspace?.members.length || 0}</div><div class="stat-label">Total members</div></div>
        <div class="stat-card"><div class="stat-value">${workspace?.members.filter((m) => m.role === 'Admin').length || 0}</div><div class="stat-label">Administrators</div></div>
        <div class="stat-card"><div class="stat-value">0</div><div class="stat-label">Pending invitations</div></div>
      </div>
      <section class="settings-section">
        <div class="settings-section-header"><h3>Team administration</h3><p>Invite, remove, and manage workspace members.</p></div>
        <div class="settings-row"><div><div class="settings-row-title">Member directory</div><div class="settings-row-description">Review all active collaborators and workspace roles.</div></div><a class="btn" href="#members">Manage team</a></div>
      </section>
    `;
  }

  if (state.settingsTab === 'security') {
    return `
      <section class="settings-section">
        <div class="settings-section-header"><h3>Security policies</h3><p>Apply organization-wide access safeguards.</p></div>
        ${settingsToggle('mfaRequired', 'Require multi-factor authentication', 'Require MFA for all team members after provider sign-in.', auth.mfaRequired, 'lock')}
        ${settingsToggle('ssoRequired', 'Require company SSO', 'Restrict sign-in to your configured company identity provider.', auth.ssoRequired, 'shield')}
        <div class="settings-row"><div><div class="settings-row-title">Session timeout</div><div class="settings-row-description">Automatically end inactive sessions.</div></div><select class="select" style="width:140px" aria-label="Session timeout"><option>8 hours</option><option>24 hours</option><option>7 days</option></select></div>
      </section>
    `;
  }

  if (state.settingsTab === 'billing') {
    return `
      <section class="settings-section">
        <div class="settings-section-header"><h3>Team plan</h3><p>Collaboration, version history, and enterprise authentication.</p></div>
        <div style="padding:22px"><div class="page-kicker">Current plan</div><div style="font-family:var(--font-display);font-size:32px">Team</div><p style="color:var(--muted);font-size:11px">42 of 100 seats available · Next billing date Jan 1, 2027</p><button class="btn">Manage billing</button></div>
      </section>
    `;
  }

  return `
    <section class="settings-section">
      <div class="settings-section-header"><h3>Authentication providers</h3><p>Offer trusted sign-in paths without maintaining a custom password system.</p></div>
      ${settingsToggle('microsoft', 'Microsoft', 'OAuth sign-in for Microsoft work and school accounts.', auth.microsoft, 'workspace', providerMark('microsoft'))}
      ${settingsToggle('google', 'Google', 'OAuth sign-in for Google Workspace accounts.', auth.google, 'globe', providerMark('google'))}
      ${settingsToggle('companySso', 'Company SSO (SAML)', 'Connect an enterprise identity provider and map workspace roles.', auth.companySso, 'shield')}
      ${settingsToggle('magicLink', 'Email magic link', 'Passwordless sign-in using a time-limited email link.', auth.magicLink, 'mail')}
    </section>
    <section class="settings-section">
      <div class="settings-section-header"><h3>SSO configuration</h3><p>Use your verified domain to route employees to company authentication.</p></div>
      <div class="settings-row"><div><div class="settings-row-title">SSO enforcement</div><div class="settings-row-description">${auth.ssoRequired ? 'Required for all verified-domain users.' : 'Optional; users can choose another enabled provider.'}</div></div><button class="btn btn-sm" data-action="settings-tab" data-tab="security">Edit policy</button></div>
      <div class="settings-row"><div><div class="settings-row-title">Default project role</div><div class="settings-row-description">Role assigned to users provisioned by SSO.</div></div><select class="select" style="width:140px" aria-label="Default project role"><option>Editor</option><option>Commenter</option><option>Viewer</option></select></div>
    </section>
  `;
}

function settingsToggle(key, title, description, on, iconName, customMark = '') {
  return `
    <div class="settings-row">
      <div>
        <div class="settings-row-title">${customMark || icon(iconName, 'icon-sm')}<span>${escapeHtml(title)}</span>${on ? '<span class="badge" style="color:var(--green)">Enabled</span>' : '<span class="badge">Disabled</span>'}</div>
        <div class="settings-row-description">${escapeHtml(description)}</div>
      </div>
      <button class="switch ${on ? 'on' : ''}" data-action="toggle-setting" data-setting="${escapeHtml(key)}" aria-label="Toggle ${escapeHtml(title)}" aria-pressed="${on}"></button>
    </div>
  `;
}

function renderEditor() {
  const project = state.activeProject;
  if (!project) return;
  const generated = parseStructuredLanguage(state.editorText, project.name);
  const members = project.presence?.length ? project.presence : project.members.map((member) => member.user);
  const unresolved = project.comments.filter((comment) => !comment.resolved).length;

  app.innerHTML = `
    <main class="editor-shell">
      <header class="editor-topbar">
        <div class="editor-title-group">
          <button class="editor-brand-button" data-action="back-dashboard" aria-label="Back to workspace"><span class="brand-symbol" style="transform:scale(.75)"></span></button>
          <div class="editor-project-meta">
            <div class="editor-project-name"><h1>${escapeHtml(project.name)}</h1><span class="status-pill ${statusClass(project.status)}">${escapeHtml(project.status)}</span></div>
            <div class="editor-save-state" id="editor-save-state" role="status" aria-live="polite">Saved ${relativeTime(project.updatedAt)}</div>
          </div>
        </div>
        <div class="editor-collaborators">
          <span class="presence-label" id="presence-label">${members.length ? `${members.length} active` : 'You are editing'}</span>
          <span id="presence-avatars">${avatarStack(members, members.length)}</span>
        </div>
        <div class="editor-actions">
          <button class="btn btn-sm" data-action="comments">${icon('comment', 'icon-sm')}<span>Comments${unresolved ? ` · ${unresolved}` : ''}</span></button>
          <button class="btn btn-sm" data-action="share">${icon('share', 'icon-sm')}<span>Share</span></button>
          <button class="btn btn-primary btn-sm editor-publish" data-action="publish-prototype">${icon('sparkles', 'icon-sm')}<span>Publish prototype</span></button>
          <button class="btn btn-icon btn-sm" data-action="editor-more" aria-label="More actions" title="More actions">${icon('more', 'icon-sm')}</button>
        </div>
      </header>
      <section class="editor-body" style="--intent-width:${state.intentWidth}%">
        <article class="editor-pane editor-pane-language" id="intent-panel">
          <div class="pane-header"><div class="pane-title"><span class="step-number">1</span>Structured intent</div><span id="validation-state" class="validation-state ${generated.valid ? 'valid' : 'invalid'}" role="status">${icon(generated.valid ? 'checkCircle' : 'alert', 'icon-sm')}${generated.valid ? 'Valid' : 'Needs input'}</span></div>
          <div class="editor-content">
            <div class="intent-blocks" id="structured-editor" aria-label="Structured intent editor">${renderIntentBlocks(generated.steps)}</div>
            <div class="editor-floating-tip">${icon('sparkles', 'icon-sm')}Each block maps directly to the generated interface.</div>
          </div>
        </article>
        <div class="pane-resizer" data-resizer="intent" role="separator" aria-label="Resize intent and output panels; double click to reset" aria-orientation="vertical" aria-valuemin="30" aria-valuemax="55" aria-valuenow="${state.intentWidth}" aria-controls="intent-panel output-panel" tabindex="0"><span aria-hidden="true"></span></div>
        <article class="editor-pane editor-pane-output">
          <div class="pane-header output-pane-header"><div class="pane-title"><span class="step-number">2</span>Output</div><div class="pane-tabs output-tabs" role="tablist" aria-label="Output format"><button id="output-tab-interface" class="pane-tab ${state.previewMode === 'interface' ? 'active' : ''}" data-action="preview-mode" data-mode="interface" role="tab" aria-selected="${state.previewMode === 'interface'}" aria-controls="output-panel" tabindex="${state.previewMode === 'interface' ? '0' : '-1'}">Interface</button><button id="output-tab-json" class="pane-tab ${state.previewMode === 'json' ? 'active' : ''}" data-action="preview-mode" data-mode="json" role="tab" aria-selected="${state.previewMode === 'json'}" aria-controls="output-panel" tabindex="${state.previewMode === 'json' ? '0' : '-1'}">JSON</button><button id="output-tab-flow" class="pane-tab ${state.previewMode === 'flow' ? 'active' : ''}" data-action="preview-mode" data-mode="flow" role="tab" aria-selected="${state.previewMode === 'flow'}" aria-controls="output-panel" tabindex="${state.previewMode === 'flow' ? '0' : '-1'}">Logic flow</button></div></div>
          ${state.previewMode === 'flow' ? '' : `<div class="output-toolbar"><span class="output-system-summary">${escapeHtml(DESIGN_SYSTEMS[state.designSystem].name)} · ${designSystemComponents().length} components</span><div class="output-tools">${renderOutputTools()}</div></div>`}
          <div class="editor-content output-content viewport-${escapeHtml(state.previewViewport)} zoom-${escapeHtml(state.previewZoom)}" id="output-panel" role="tabpanel" aria-labelledby="output-tab-${escapeHtml(state.previewMode)}"><div id="generated-preview">${renderOutput(generated)}</div></div>
        </article>
      </section>
    </main>
  `;
  renderModal();
}

function renderIntentBlocks(steps) {
  const required = ['GIVEN', 'WHEN', 'THEN'];
  const normalized = [...steps];
  required.forEach((type) => {
    if (!normalized.some((step) => step.type === type)) normalized.push({ type, text: '' });
  });
  return normalized.map((step, index) => `
    <section class="intent-block intent-${escapeHtml(step.type.toLowerCase())}" data-intent-type="${escapeHtml(step.type)}">
      <div class="intent-block-rail"><span>${escapeHtml(step.type)}</span><small>${index + 1}</small></div>
      <div class="intent-block-body">
        <label for="intent-step-${index}">${step.type === 'GIVEN' ? 'Starting context' : step.type === 'WHEN' ? 'Trigger or condition' : step.type === 'THEN' ? 'Expected outcome' : 'Additional behavior'}</label>
        <textarea id="intent-step-${index}" class="intent-step-input" data-intent-index="${index}" data-intent-type="${escapeHtml(step.type)}" rows="2" placeholder="Describe this step…">${escapeHtml(step.text)}</textarea>
      </div>
    </section>`).join('');
}

function renderLineNumbers(text) {
  return Array.from({ length: Math.max(1, String(text || '').split('\n').length) }, (_, index) => index + 1).join('<br>');
}

function parseStructuredLanguage(text, name = 'Untitled workflow') {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const steps = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const upper = line.toUpperCase();
    if (['GIVEN', 'WHEN', 'THEN', 'AND'].includes(upper)) {
      current = { type: upper, text: '' };
      steps.push(current);
    } else if (current) {
      current.text += `${current.text ? ' ' : ''}${line}`;
    }
  }
  const entityMatches = steps.flatMap((step) => step.text.match(/\b(?:advertiser|campaign|offline data|signals?|performance|insights?|dataset|audience|pixel|workflow)\b/gi) || []);
  const entities = [...new Set(entityMatches.map((value) => value.toLowerCase()))];
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
    valid: ['GIVEN', 'WHEN', 'THEN'].every((type) => steps.some((step) => step.type === type && step.text))
  };
}

function highlightJson(value) {
  const raw = JSON.stringify(value, null, 2);
  const safe = escapeHtml(raw);
  return safe.replace(/(&quot;(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\&])*&quot;)(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g, (match, quoted, colon, bool, num) => {
    if (quoted) return `<span class="${colon ? 'json-key' : 'json-string'}">${quoted}</span>${colon || ''}`;
    if (bool) return `<span class="json-boolean">${bool}</span>`;
    if (num) return `<span class="json-number">${num}</span>`;
    return match;
  });
}

function renderFlow(steps) {
  if (!steps.length) {
    return `<div class="flow-empty"><div><div class="empty-state-icon">${icon('magic')}</div><h3>Add a structured step</h3><p>Start with GIVEN, WHEN, and THEN to generate the execution flow.</p></div></div>`;
  }
  return steps.map((step, index) => `
    <div class="flow-node" data-type="${escapeHtml(step.type)}"><div class="flow-node-type">${escapeHtml(step.type)}</div><div class="flow-node-text">${escapeHtml(step.text || 'Add step details…')}</div></div>
    ${index < steps.length - 1 ? '<div class="flow-connector"></div>' : ''}
  `).join('');
}

function stepText(generated, type, fallback = '') {
  return generated.steps.find((step) => step.type === type && step.text)?.text || fallback;
}

function prototypeActionLabel(text) {
  const normalized = String(text || '')
    .replace(/^(they|the user|the advertiser|the system)\s+(can|will|should)\s+/i, '')
    .replace(/[.]$/, '');
  if (!normalized) return 'Continue';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function renderGeneratedInterface(generated, expanded = false) {
  if (!generated.valid) {
    return `<div class="flow-empty"><div><div class="empty-state-icon">${icon('magic')}</div><h3>Complete the intent</h3><p>Add GIVEN, WHEN, and THEN to generate the product interface.</p></div></div>`;
  }
  const context = stepText(generated, 'GIVEN', 'Describe the user and their goal.');
  const condition = stepText(generated, 'WHEN', 'Complete the required setup.');
  const outcome = stepText(generated, 'THEN', 'Continue to the next step.');
  const followup = stepText(generated, 'AND', 'The system will track progress and surface actionable insights.');
  const isOmnichannel = /omnichannel|offline|campaign/i.test(`${generated.intent} ${generated.entities.join(' ')} ${outcome}`);
  const title = isOmnichannel ? 'Create omnichannel campaign' : prototypeActionLabel(outcome);
  const action = prototypeActionLabel(outcome);
  const system = DESIGN_SYSTEMS[state.designSystem];
  return `
    <div class="prototype-stage ds-${escapeHtml(state.designSystem)} ${expanded ? 'prototype-stage-expanded' : ''}">
      <section class="prototype-window">
        <header class="prototype-topbar">
          <span class="prototype-product"><span class="brand-symbol"></span>Generated by DLS Magician</span>
          <span class="prototype-badge">${icon('sparkles', 'icon-sm')}${escapeHtml(system.name)}</span>
        </header>
        <div class="prototype-content">
          <div class="prototype-heading">
            <span class="prototype-eyebrow">${isOmnichannel ? 'CAMPAIGN SETUP' : 'GENERATED WORKFLOW'}</span>
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(context)}</p>
          </div>
          <div class="prototype-card">
            <div class="prototype-card-title"><span>${icon('checkCircle', 'icon-sm')}</span><div><strong>Eligibility requirements</strong><small>${escapeHtml(condition)}</small></div></div>
            <div class="prototype-check"><span class="prototype-checkmark">${icon('check', 'icon-sm')}</span><span>${isOmnichannel ? 'Offline data source connected' : 'Required information complete'}</span><b>Ready</b></div>
            <div class="prototype-check"><span class="prototype-checkmark">${icon('check', 'icon-sm')}</span><span>${isOmnichannel ? 'Offline data quality' : 'Input quality'}</span><b>${isOmnichannel ? '8.7 / 10' : 'Validated'}</b></div>
          </div>
          <div class="prototype-field"><span id="prototype-field-label">${isOmnichannel ? 'Optimization goal' : 'Workflow outcome'}</span><button type="button" aria-labelledby="prototype-field-label">${escapeHtml(isOmnichannel ? 'Omnichannel sales' : action)}${icon('chevronRight', 'icon-sm')}</button></div>
          <div class="prototype-insight">${icon('activity', 'icon-sm')}<span>${escapeHtml(followup)}</span></div>
          <div class="prototype-actions"><button class="prototype-secondary" type="button">Save draft</button><button class="prototype-primary" type="button" data-action="run-prototype">${escapeHtml(action)}${icon('arrowRight', 'icon-sm')}</button></div>
        </div>
      </section>
    </div>`;
}

function updateEditorOutputs() {
  if (!state.activeProject) return;
  const parsed = parseStructuredLanguage(state.editorText, state.activeProject.name);
  const generatedPreview = document.getElementById('generated-preview');
  const validation = document.getElementById('validation-state');
  const lineNumbers = document.getElementById('line-numbers');
  const saveState = document.getElementById('editor-save-state');
  if (generatedPreview) generatedPreview.innerHTML = renderOutput(parsed);
  if (validation) {
    validation.className = `validation-state ${parsed.valid ? 'valid' : 'invalid'}`;
    validation.innerHTML = `${icon(parsed.valid ? 'checkCircle' : 'alert', 'icon-sm')}${parsed.valid ? 'Valid' : 'Needs input'}`;
  }
  if (lineNumbers) lineNumbers.innerHTML = renderLineNumbers(state.editorText);
  if (saveState) saveState.textContent = 'Unsaved changes…';
}

function scheduleAutosave() {
  clearTimeout(state.autosaveTimer);
  state.autosaveTimer = window.setTimeout(saveEditor, 900);
}

async function saveEditor() {
  if (!state.activeProject || !state.editorDirty) return;
  const saveState = document.getElementById('editor-save-state');
  if (saveState) saveState.textContent = 'Saving…';
  try {
    const updated = await api(`/api/projects/${encodeURIComponent(state.activeProject.id)}`, {
      method: 'PATCH',
      body: { structuredLanguage: state.editorText }
    });
    state.activeProject = { ...updated, presence: state.activeProject.presence || [] };
    state.editorDirty = false;
    if (saveState) saveState.textContent = 'Saved just now';
    const summary = state.projects.find((project) => project.id === updated.id);
    if (summary) summary.updatedAt = updated.updatedAt;
  } catch (error) {
    if (saveState) saveState.textContent = 'Save failed';
    showToast(error.message, 'error');
  }
}

function renderModal() {
  if (!state.modal) {
    modalRoot.innerHTML = '';
    return;
  }
  const type = state.modal.type;
  if (type === 'new-project') modalRoot.innerHTML = renderNewProjectModal();
  else if (type === 'share') modalRoot.innerHTML = renderShareModal();
  else if (type === 'comments') modalRoot.innerHTML = renderCommentsDrawer();
  else if (type === 'versions') modalRoot.innerHTML = renderVersionsModal();
  else if (type === 'preview') modalRoot.innerHTML = renderPreviewModal();
  else if (type === 'user-menu') modalRoot.innerHTML = renderUserMenuModal();
  else if (type === 'connect-mcp') modalRoot.innerHTML = renderMcpConnectionModal();
  else modalRoot.innerHTML = '';
  activateModal();
}

function modalFocusableElements() {
  return [...modalRoot.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hidden && element.getClientRects().length);
}

function activateModal() {
  if (!state.modal || !modalRoot.querySelector('[role="dialog"]')) return;
  const shouldMoveFocus = !state.modalReturnFocus;
  if (shouldMoveFocus) state.modalReturnFocus = document.activeElement;
  app.inert = true;
  if (!shouldMoveFocus) return;
  window.requestAnimationFrame(() => {
    const autofocus = modalRoot.querySelector('[autofocus]');
    const focusable = modalFocusableElements();
    (autofocus || focusable[0] || modalRoot.querySelector('[role="dialog"]'))?.focus();
  });
}

function renderNewProjectModal(template = null) {
  const templateName = template?.name ? `${template.name} workflow` : '';
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title">
        <header class="modal-header"><div><h2 class="modal-title" id="new-project-title">Create a new project</h2><div class="modal-subtitle">Start with a shared structured-language workspace.</div></div><button class="btn btn-icon btn-ghost" data-action="close-modal" aria-label="Close">${icon('close')}</button></header>
        <form data-form="new-project">
          <div class="modal-body" style="display:grid;gap:16px">
            <div class="field"><label for="new-project-name">Project name</label><input id="new-project-name" class="input" name="name" value="${escapeHtml(templateName)}" placeholder="e.g. Omnichannel eligibility workflow" required autofocus /></div>
            <div class="field"><label for="new-project-description">Description</label><textarea id="new-project-description" class="textarea" name="description" placeholder="What should this workflow help the team design or build?">${escapeHtml(template?.description || '')}</textarea></div>
            <div class="form-row">
              <div class="field"><label for="new-project-workspace">Workspace</label><select id="new-project-workspace" class="select" name="workspaceId">${state.workspaces.map((workspace) => `<option value="${escapeHtml(workspace.id)}">${escapeHtml(workspace.name)}</option>`).join('')}</select></div>
              <div class="field"><label for="new-project-category">Category</label><select id="new-project-category" class="select" name="category"><option>Workflow</option><option>Advertising</option><option>AI</option><option>Analytics</option><option>Onboarding</option></select></div>
            </div>
            <input type="hidden" name="templateId" value="${escapeHtml(template?.id || '')}" />
          </div>
          <footer class="modal-footer"><button class="btn" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit">${icon('plus', 'icon-sm')}Create project</button></footer>
        </form>
      </section>
    </div>
  `;
}

function renderShareModal() {
  const project = state.activeProject;
  if (!project) return '';
  const tabContent = state.shareTab === 'link' ? renderShareLinkTab(project) : state.shareTab === 'workspace' ? renderWorkspaceAccessTab(project) : renderInviteTab(project);
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal modal-xl" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <header class="modal-header"><div><h2 class="modal-title" id="share-title">Share “${escapeHtml(project.name)}”</h2><div class="modal-subtitle">Invite collaborators and manage project-level permissions.</div></div><button class="btn btn-icon btn-ghost" data-action="close-modal" aria-label="Close">${icon('close')}</button></header>
        <div class="share-layout">
          <nav class="share-nav" role="tablist" aria-label="Sharing options">
            <button class="${state.shareTab === 'invite' ? 'active' : ''}" data-action="share-tab" data-tab="invite" role="tab" aria-selected="${state.shareTab === 'invite'}" aria-controls="share-panel" tabindex="${state.shareTab === 'invite' ? '0' : '-1'}">${icon('userPlus', 'icon-sm')}Invite people</button>
            <button class="${state.shareTab === 'link' ? 'active' : ''}" data-action="share-tab" data-tab="link" role="tab" aria-selected="${state.shareTab === 'link'}" aria-controls="share-panel" tabindex="${state.shareTab === 'link' ? '0' : '-1'}">${icon('link', 'icon-sm')}Share link</button>
            <button class="${state.shareTab === 'workspace' ? 'active' : ''}" data-action="share-tab" data-tab="workspace" role="tab" aria-selected="${state.shareTab === 'workspace'}" aria-controls="share-panel" tabindex="${state.shareTab === 'workspace' ? '0' : '-1'}">${icon('workspace', 'icon-sm')}Workspace access</button>
          </nav>
          <div class="share-main" id="share-panel" role="tabpanel">${tabContent}</div>
          <aside class="role-guide">
            <h3>Role permissions</h3>
            <div class="role-card"><strong>Admin</strong><span>Full access to project content, members, permissions, and settings.</span></div>
            <div class="role-card"><strong>Editor</strong><span>Edit structured language, manage versions, and invite collaborators.</span></div>
            <div class="role-card"><strong>Commenter</strong><span>Add comments and participate in reviews without editing.</span></div>
            <div class="role-card"><strong>Viewer</strong><span>Read-only access to the project and version history.</span></div>
          </aside>
        </div>
        <footer class="modal-footer"><button class="btn btn-gold" data-action="close-modal">Done</button></footer>
      </section>
    </div>
  `;
}

function renderInviteTab(project) {
  return `
    <h3>Invite teammates by email</h3>
    <form class="invite-row" data-form="invite-member">
      <label class="sr-only" for="invite-email">Email address</label><input id="invite-email" class="input" name="email" type="email" placeholder="teammate@company.com" required />
      <label class="sr-only" for="invite-role">Project role</label><select id="invite-role" class="select" name="role"><option>Editor</option><option>Commenter</option><option>Viewer</option><option>Admin</option></select>
      <button class="btn btn-primary" type="submit">Invite</button>
    </form>
    <h3>People with access</h3>
    <div class="people-list">
      ${project.members.map((member) => `
        <div class="people-row">
          ${avatar(member.user)}
          <div><div class="person-name">${escapeHtml(member.user.name)}${member.user.id === state.user.id ? ' (you)' : ''}</div><div class="person-email">${escapeHtml(member.user.email)}</div></div>
          <select class="select" data-action="member-role" data-user-id="${escapeHtml(member.userId)}" aria-label="Role for ${escapeHtml(member.user.name)}">
            ${['Admin', 'Editor', 'Commenter', 'Viewer'].map((role) => `<option ${member.role === role ? 'selected' : ''}>${role}</option>`).join('')}
          </select>
        </div>
      `).join('')}
    </div>
  `;
}

function renderShareLinkTab(project) {
  const url = `${window.location.origin}${window.location.pathname}#project/${project.id}`;
  return `
    <h3>Project link</h3>
    <div class="share-link-card">
      <div class="settings-row-title">${icon('link', 'icon-sm')}Anyone invited to this project can use this link</div>
      <div class="settings-row-description">Access still follows the member role assigned above.</div>
      <div class="share-link-row"><label class="sr-only" for="share-url">Project share URL</label><input id="share-url" class="input" value="${escapeHtml(url)}" readonly /><button class="btn" data-action="copy-link">${icon('copy', 'icon-sm')}Copy</button></div>
    </div>
    <div style="margin-top:16px" class="share-link-card">
      <div class="settings-row-title">${icon('lock', 'icon-sm')}Restricted access</div>
      <div class="settings-row-description">Only explicitly invited people and workspace administrators can open this project.</div>
    </div>
  `;
}

function renderWorkspaceAccessTab(project) {
  return `
    <h3>Workspace access</h3>
    <div class="share-link-card">
      <div class="workspace-row" style="padding:0;border:0">
        <div class="workspace-logo">${escapeHtml(project.workspace?.logo || 'WS')}</div>
        <div><div class="row-title">${escapeHtml(project.workspace?.name || 'Workspace')}</div><div class="row-subtitle">Workspace members can request access.</div></div>
        <select class="select" style="width:130px" aria-label="Workspace access level"><option>Restricted</option><option>Can view</option><option>Can comment</option></select>
      </div>
    </div>
    <p class="helper" style="margin-top:12px">Enterprise SSO and workspace membership determine who can request access.</p>
  `;
}

function renderCommentsDrawer() {
  const project = state.activeProject;
  if (!project) return '';
  const comments = project.comments || [];
  return `
    <div class="modal-backdrop" data-action="close-modal" style="place-items:stretch end;padding:0;background:rgba(0,0,0,.38)">
      <aside class="comments-drawer" role="dialog" aria-modal="true" aria-labelledby="comments-title">
        <header class="drawer-header"><div class="drawer-title" id="comments-title">${icon('comment')}Comments <span class="badge">${comments.filter((comment) => !comment.resolved).length} open</span></div><button class="btn btn-icon btn-ghost" data-action="close-modal" aria-label="Close comments">${icon('close')}</button></header>
        <div class="drawer-body">
          ${comments.length ? comments.map((comment) => `
            <article class="comment-card" style="${comment.resolved ? 'opacity:.62' : ''}">
              <div class="comment-head">${avatar(comment.user, 'avatar-sm')}<span class="comment-author">${escapeHtml(comment.user.name)}</span><span class="comment-time">${relativeTime(comment.createdAt)}</span></div>
              <span class="comment-anchor">${escapeHtml(comment.anchor)}</span>
              <div class="comment-body">${escapeHtml(comment.body)}</div>
              <div class="comment-actions"><button class="btn btn-sm btn-ghost" data-action="resolve-comment" data-comment-id="${escapeHtml(comment.id)}" data-resolved="${comment.resolved}">${icon(comment.resolved ? 'refresh' : 'check', 'icon-sm')}${comment.resolved ? 'Reopen' : 'Resolve'}</button></div>
            </article>
          `).join('') : `<div class="empty-state"><div><div class="empty-state-icon">${icon('comment')}</div><h3>No comments yet</h3><p>Start a review thread for the structured language, generated JSON, or flow preview.</p></div></div>`}
        </div>
        <form class="drawer-composer" data-form="new-comment">
          <label class="sr-only" for="comment-body">Comment</label><textarea id="comment-body" class="textarea" name="body" placeholder="Add a comment…" required></textarea>
          <div class="composer-row"><label class="sr-only" for="comment-anchor">Comment location</label><select id="comment-anchor" class="select" name="anchor"><option>General</option><option>GIVEN</option><option>WHEN</option><option>THEN</option><option>Generated JSON</option><option>Live preview</option></select><button class="btn btn-primary" type="submit">Comment</button></div>
        </form>
      </aside>
    </div>
  `;
}

function renderVersionsModal() {
  const project = state.activeProject;
  if (!project) return '';
  const versions = project.versions || [];
  const selected = versions.find((version) => version.id === state.selectedVersionId) || versions[0];
  const selectedContent = selected?.content || '';
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal modal-xl" role="dialog" aria-modal="true" aria-labelledby="versions-title">
        <header class="modal-header"><div><h2 class="modal-title" id="versions-title">Version history</h2><div class="modal-subtitle">Compare, document, and restore changes to “${escapeHtml(project.name)}”.</div></div><div style="display:flex;gap:8px"><button class="btn" data-action="create-version">${icon('save', 'icon-sm')}Save version</button><button class="btn btn-icon btn-ghost" data-action="close-modal" aria-label="Close version history">${icon('close')}</button></div></header>
        ${versions.length ? `
          <div class="version-layout">
            <aside class="version-sidebar">
              ${versions.map((version) => `
                <button class="version-item ${selected?.id === version.id ? 'active' : ''}" data-action="select-version" data-version-id="${escapeHtml(version.id)}">
                  <span class="version-dot"></span><span><span class="version-number">${escapeHtml(version.number)}</span><span class="version-message">${escapeHtml(version.message)}</span><span class="version-time">${escapeHtml(version.user?.name || 'Unknown')} · ${relativeTime(version.createdAt)}</span></span>
                </button>
              `).join('')}
            </aside>
            <section class="diff-panel">
              <div class="diff-toolbar"><span class="helper">Comparing ${escapeHtml(selected?.number || '')} → Current</span><span class="badge">${selectedContent === state.editorText ? 'No changes' : 'Changes detected'}</span></div>
              <div class="diff-code">${renderLineDiff(selectedContent, state.editorText)}</div>
            </section>
            <aside class="version-detail">
              <div class="detail-group"><div class="detail-label">Version</div><div class="detail-value">${escapeHtml(selected?.number || '—')}</div></div>
              <div class="detail-group"><div class="detail-label">Author</div><div class="detail-value">${escapeHtml(selected?.user?.name || '—')}</div></div>
              <div class="detail-group"><div class="detail-label">Created</div><div class="detail-value">${fullDate(selected?.createdAt)}</div></div>
              <div class="detail-group"><div class="detail-label">Summary</div><div class="detail-value">${escapeHtml(selected?.message || '—')}</div></div>
              <div style="margin-top:22px"><button class="btn" style="width:100%" data-action="restore-version" data-version-id="${escapeHtml(selected?.id || '')}">${icon('history', 'icon-sm')}Restore this version</button></div>
            </aside>
          </div>
        ` : `<div class="empty-state"><div><div class="empty-state-icon">${icon('history')}</div><h3>No saved versions</h3><p>Create a named version to establish the first review checkpoint.</p><button class="btn btn-primary" style="margin-top:14px" data-action="create-version">Save first version</button></div></div>`}
      </section>
    </div>
  `;
}

function renderLineDiff(oldText, newText) {
  const oldLines = String(oldText || '').split('\n');
  const newLines = String(newText || '').split('\n');
  const max = Math.max(oldLines.length, newLines.length);
  const output = [];
  for (let index = 0; index < max; index += 1) {
    const oldLine = oldLines[index];
    const newLine = newLines[index];
    if (oldLine === newLine) {
      output.push(`<div class="diff-line"><span class="diff-line-number">${index + 1}</span><span class="diff-sign"></span><span>${escapeHtml(newLine ?? '') || '&nbsp;'}</span></div>`);
    } else {
      if (oldLine !== undefined) output.push(`<div class="diff-line removed"><span class="diff-line-number">${index + 1}</span><span class="diff-sign">−</span><span>${escapeHtml(oldLine) || '&nbsp;'}</span></div>`);
      if (newLine !== undefined) output.push(`<div class="diff-line added"><span class="diff-line-number">${index + 1}</span><span class="diff-sign">+</span><span>${escapeHtml(newLine) || '&nbsp;'}</span></div>`);
    }
  }
  return output.join('');
}

function renderPreviewModal() {
  const parsed = parseStructuredLanguage(state.editorText, state.activeProject?.name || 'Workflow');
  const system = DESIGN_SYSTEMS[state.designSystem];
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="preview-title" aria-describedby="preview-description" tabindex="-1">
        <header class="modal-header preview-modal-header"><div><h2 class="modal-title" id="preview-title">Generated interface</h2><div class="modal-subtitle" id="preview-description">${system.components} approved components · ${escapeHtml(system.name)}</div></div><div class="preview-modal-actions">${designSystemSelect()}<button class="btn btn-icon btn-ghost" data-action="close-modal" aria-label="Close preview">${icon('close')}</button></div></header>
        <div class="modal-body prototype-modal-body">${renderGeneratedInterface(parsed, true)}</div>
      </section>
    </div>
  `;
}

function renderMcpConnectionModal() {
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="mcp-title">
        <header class="modal-header"><div><h2 class="modal-title" id="mcp-title">Connect your design system</h2><div class="modal-subtitle">Expose approved tokens, components, and usage rules through an MCP server.</div></div><button class="btn btn-icon btn-ghost" data-action="close-modal" aria-label="Close design system connection">${icon('close')}</button></header>
        <form data-form="connect-mcp">
          <div class="modal-body mcp-connect-body">
            <div class="field"><label for="mcp-server-url">MCP server URL</label><input id="mcp-server-url" class="input" type="url" name="serverUrl" placeholder="https://design-system.company.com/mcp" required /></div>
            <div class="field"><label for="mcp-connection-name">Connection name</label><input id="mcp-connection-name" class="input" name="name" placeholder="Company design system" required /></div>
            <div class="mcp-capabilities">
              <div class="mcp-capability">${icon('checkCircle', 'icon-sm')}<span><strong>Tokens</strong><small>Color, type, spacing, radius</small></span></div>
              <div class="mcp-capability">${icon('checkCircle', 'icon-sm')}<span><strong>Components</strong><small>Props, variants, states</small></span></div>
              <div class="mcp-capability">${icon('checkCircle', 'icon-sm')}<span><strong>Usage rules</strong><small>Patterns and accessibility</small></span></div>
              <div class="mcp-capability">${icon('checkCircle', 'icon-sm')}<span><strong>Code bindings</strong><small>Framework-ready output</small></span></div>
            </div>
            <div class="auth-demo-note">${icon('shield', 'icon-sm')}<span>This MVP validates the MCP capability contract locally. Production connections should use workspace-managed OAuth and encrypted credentials.</span></div>
          </div>
          <footer class="modal-footer"><button class="btn" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit">${icon('link', 'icon-sm')}Validate connection</button></footer>
        </form>
      </section>
    </div>`;
}

function renderUserMenuModal() {
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal" style="width:min(100%,420px)" role="dialog" aria-modal="true" aria-labelledby="account-title" tabindex="-1">
        <header class="modal-header"><div><h2 class="modal-title" id="account-title">Account</h2><div class="modal-subtitle">Signed in through ${escapeHtml(state.provider || 'workspace authentication')}.</div></div><button class="btn btn-icon btn-ghost" data-action="close-modal" aria-label="Close account">${icon('close')}</button></header>
        <div class="modal-body">
          <div style="display:flex;align-items:center;gap:14px;padding:8px 0 20px">${avatar(state.user, 'avatar-lg')}<div><div class="person-name" style="font-size:14px">${escapeHtml(state.user.name)}</div><div class="person-email">${escapeHtml(state.user.email)}</div></div></div>
          <button class="btn btn-danger" style="width:100%" data-action="logout">${icon('logout', 'icon-sm')}Sign out</button>
        </div>
      </section>
    </div>
  `;
}

function closeModal() {
  const returnFocus = state.modalReturnFocus;
  state.modal = null;
  modalRoot.innerHTML = '';
  app.inert = false;
  state.modalReturnFocus = null;
  window.requestAnimationFrame(() => returnFocus?.isConnected && returnFocus.focus());
}

function filterProjectRows(query) {
  const normalized = String(query || '').trim().toLowerCase();
  document.querySelectorAll('#project-table-body tr').forEach((row) => {
    row.style.display = row.dataset.projectName.includes(normalized) ? '' : 'none';
  });
}

function connectStream(projectId = null) {
  disconnectStream();
  const controller = new AbortController();
  state.streamController = controller;
  streamEvents(projectId, controller).catch((error) => {
    if (error.name !== 'AbortError') console.error('Realtime stream ended', error);
  });
}

async function streamEvents(projectId, controller) {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session?.access_token) return;
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const response = await fetch(`/api/events${query}`, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    signal: controller.signal
  });
  if (!response.ok || !response.body) throw new Error(`Realtime connection failed (${response.status})`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const packets = buffer.split('\n\n');
    buffer = packets.pop() || '';
    for (const packet of packets) {
      const line = packet.split('\n').find((entry) => entry.startsWith('data: '));
      if (!line) continue;
      try {
        handleRealtimeMessage(JSON.parse(line.slice(6)));
      } catch (error) {
        console.error('Invalid realtime message', error);
      }
    }
  }
}

function disconnectStream() {
  if (state.streamController) {
    state.streamController.abort();
    state.streamController = null;
  }
}

async function handleRealtimeMessage(message) {
  if (!message || message.type === 'connected') return;
  const payload = message.payload || {};

  if (message.type === 'presence' && state.activeProject) {
    state.activeProject.presence = payload.users || [];
    updatePresenceUi();
    return;
  }

  if (message.type === 'comment_added' && state.activeProject) {
    state.activeProject.comments.unshift(payload.comment);
    if (state.modal?.type === 'comments') renderModal();
    showToast(`${payload.comment.user.name} added a comment`, 'info');
    return;
  }

  if (message.type === 'comment_updated' && state.activeProject) {
    const index = state.activeProject.comments.findIndex((item) => item.id === payload.comment.id);
    if (index >= 0) state.activeProject.comments[index] = payload.comment;
    if (state.modal?.type === 'comments') renderModal();
    return;
  }

  if (message.type === 'member_invited' && state.activeProject) {
    const existing = state.activeProject.members.findIndex((member) => member.userId === payload.member.userId);
    if (existing >= 0) state.activeProject.members[existing] = payload.member;
    else state.activeProject.members.push(payload.member);
    if (state.modal?.type === 'share') renderModal();
    showToast(`${payload.member.user.name} joined the project`, 'info');
    return;
  }

  if (message.type === 'member_updated' && state.activeProject) {
    const existing = state.activeProject.members.findIndex((member) => member.userId === payload.member.userId);
    if (existing >= 0) state.activeProject.members[existing] = payload.member;
    if (state.modal?.type === 'share') renderModal();
    return;
  }

  if (message.type === 'version_created' && state.activeProject) {
    state.activeProject.versions.unshift(payload.version);
    state.selectedVersionId = payload.version.id;
    if (state.modal?.type === 'versions') renderModal();
    showToast(`${payload.version.user.name} saved version ${payload.version.number}`, 'info');
    return;
  }

  if (message.type === 'project_updated' && state.activeProject && message.projectId === state.activeProject.id) {
    const editor = document.getElementById('structured-editor');
    if (editor && document.activeElement === editor && state.editorDirty) {
      showToast(`${payload.actor?.name || 'A collaborator'} updated this project. Your local changes are still active.`, 'info', 5200);
    } else {
      state.activeProject = { ...payload.project, presence: state.activeProject.presence || [] };
      state.editorText = payload.project.structuredLanguage;
      renderEditor();
      showToast(`${payload.actor?.name || 'A collaborator'} updated the workflow`, 'info');
    }
    return;
  }

  if (['project_created', 'workspace_updated'].includes(message.type) || (!state.activeProject && message.type)) {
    try {
      await loadBootstrap();
      const route = parseRoute();
      if (route.page !== 'project') renderShell(route.page || 'dashboard');
    } catch (error) {
      console.error(error);
    }
  }
}

function updatePresenceUi() {
  const users = state.activeProject?.presence?.length ? state.activeProject.presence : state.activeProject?.members?.map((member) => member.user) || [];
  const label = document.getElementById('presence-label');
  const avatars = document.getElementById('presence-avatars');
  if (label) label.textContent = users.length ? `${users.length} active` : 'You are editing';
  if (avatars) avatars.innerHTML = avatarStack(users, users.length);
}

function startPresence(projectId) {
  stopPresence();
  const send = async () => {
    try {
      const result = await api('/api/presence', { method: 'POST', body: { projectId } });
      if (state.activeProject?.id === projectId) {
        state.activeProject.presence = result.users || [];
        updatePresenceUi();
      }
    } catch (_) {
      // A transient presence failure should not interrupt editing.
    }
  };
  send();
  state.presenceTimer = window.setInterval(send, 15_000);
}

function stopPresence() {
  if (state.presenceTimer) {
    clearInterval(state.presenceTimer);
    state.presenceTimer = null;
  }
}

async function authenticate(provider, email = '') {
  renderLoading();
  try {
    if (provider === 'magic') {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/#dashboard` }
      });
      if (error) throw error;
      state.user = null;
      renderLogin();
      showToast('Check your email for the secure sign-in link.', 'info', 6000);
      return;
    }
    if (provider === 'sso') throw new Error('Company SSO needs a verified organization domain before it can be enabled.');
    const supabaseProvider = provider === 'microsoft' ? 'azure' : provider;
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: supabaseProvider,
      options: { redirectTo: `${window.location.origin}/#dashboard`, scopes: provider === 'microsoft' ? 'email' : undefined }
    });
    if (error) throw error;
  } catch (error) {
    state.user = null;
    renderLogin();
    showToast(error.message, 'error');
  }
}

async function logout(signOut = true) {
  if (signOut && supabaseClient) await supabaseClient.auth.signOut();
  disconnectStream();
  stopPresence();
  state.user = null;
  state.provider = null;
  state.workspaces = [];
  state.projects = [];
  state.activeProject = null;
  state.modal = null;
  window.location.hash = '';
  renderLogin();
}

async function createProject(form) {
  const formData = new FormData(form);
  const template = state.templates.find((item) => item.id === formData.get('templateId'));
  let structuredLanguage;
  if (template?.id === 't-omni') {
    structuredLanguage = 'GIVEN\nAn advertiser wants to connect online and offline outcomes.\n\nWHEN\nThe required data sources are connected and data quality is sufficient.\n\nTHEN\nThe advertiser can create an omnichannel campaign.\n\nAND\nThe system measures verified business outcomes.';
  } else if (template?.id === 't-intent') {
    structuredLanguage = 'GIVEN\nA user describes what they want to accomplish.\n\nWHEN\nThe system classifies the primary intent and confidence.\n\nTHEN\nIt selects the correct workflow and explains the next action.';
  } else if (template?.id === 't-onboard') {
    structuredLanguage = 'GIVEN\nA new user begins product setup.\n\nWHEN\nThey provide the required account information.\n\nTHEN\nThe system generates the next guided step and validates completion.';
  } else if (template?.id === 't-quality') {
    structuredLanguage = 'GIVEN\nA team monitors incoming data quality.\n\nWHEN\nThe system detects a missing, delayed, or malformed signal.\n\nTHEN\nIt explains the impact and recommends the highest-priority fix.';
  }

  const body = {
    name: formData.get('name'),
    description: formData.get('description'),
    workspaceId: formData.get('workspaceId'),
    category: formData.get('category'),
    structuredLanguage
  };
  try {
    const project = await api('/api/projects', { method: 'POST', body });
    closeModal();
    await loadBootstrap();
    window.location.hash = `#project/${project.id}`;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function inviteMember(form) {
  if (!state.activeProject) return;
  const data = new FormData(form);
  try {
    const member = await api(`/api/projects/${encodeURIComponent(state.activeProject.id)}/share`, {
      method: 'POST',
      body: { email: data.get('email'), role: data.get('role') }
    });
    const index = state.activeProject.members.findIndex((item) => item.userId === member.userId);
    if (index >= 0) state.activeProject.members[index] = member;
    else state.activeProject.members.push(member);
    renderModal();
    showToast(`${member.user.name} was invited as ${member.role}`);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function addComment(form) {
  if (!state.activeProject) return;
  const data = new FormData(form);
  try {
    const comment = await api(`/api/projects/${encodeURIComponent(state.activeProject.id)}/comments`, {
      method: 'POST',
      body: { body: data.get('body'), anchor: data.get('anchor') }
    });
    state.activeProject.comments.unshift(comment);
    renderModal();
    showToast('Comment added');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function resolveComment(commentId, resolved) {
  if (!state.activeProject) return;
  try {
    const updated = await api(`/api/projects/${encodeURIComponent(state.activeProject.id)}/comments/${encodeURIComponent(commentId)}`, {
      method: 'PATCH',
      body: { resolved: !resolved }
    });
    const index = state.activeProject.comments.findIndex((comment) => comment.id === commentId);
    if (index >= 0) state.activeProject.comments[index] = updated;
    renderModal();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function createVersion() {
  if (!state.activeProject) return;
  await saveEditor();
  const message = window.prompt('Name this version:', 'Review checkpoint');
  if (message === null) return;
  try {
    const version = await api(`/api/projects/${encodeURIComponent(state.activeProject.id)}/versions`, {
      method: 'POST',
      body: { message: message.trim() || 'Review checkpoint' }
    });
    state.activeProject.versions.unshift(version);
    state.selectedVersionId = version.id;
    renderModal();
    showToast(`Version ${version.number} saved`);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function restoreVersion(versionId) {
  if (!state.activeProject || !versionId) return;
  const confirmed = window.confirm('Restore this version? Your current content will remain available in version history only if it was previously saved.');
  if (!confirmed) return;
  try {
    const project = await api(`/api/projects/${encodeURIComponent(state.activeProject.id)}/versions/${encodeURIComponent(versionId)}/restore`, { method: 'POST' });
    state.activeProject = { ...project, presence: state.activeProject.presence || [] };
    state.editorText = project.structuredLanguage;
    state.editorDirty = false;
    closeModal();
    renderEditor();
    showToast('Version restored');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function updateMemberRole(userId, role) {
  if (!state.activeProject) return;
  try {
    const member = await api(`/api/projects/${encodeURIComponent(state.activeProject.id)}/members/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: { role }
    });
    const index = state.activeProject.members.findIndex((item) => item.userId === userId);
    if (index >= 0) state.activeProject.members[index] = member;
    showToast(`${member.user.name} is now ${role}`);
  } catch (error) {
    renderModal();
    showToast(error.message, 'error');
  }
}

async function toggleWorkspaceSetting(key) {
  const workspace = state.workspaces[0];
  if (!workspace) return;
  const current = Boolean(workspace.authProviders[key]);
  try {
    const updated = await api(`/api/workspaces/${encodeURIComponent(workspace.id)}/settings`, {
      method: 'PATCH',
      body: { [key]: !current }
    });
    state.workspaces[0] = { ...workspace, ...updated, members: workspace.members };
    renderShell('settings');
    showToast(`${formatSettingName(key)} ${!current ? 'enabled' : 'disabled'}`);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function formatSettingName(key) {
  return {
    microsoft: 'Microsoft sign-in',
    google: 'Google sign-in',
    companySso: 'Company SSO',
    magicLink: 'Email magic link',
    ssoRequired: 'SSO enforcement',
    mfaRequired: 'MFA requirement'
  }[key] || key;
}

async function refreshBootstrap() {
  try {
    await loadBootstrap();
    const route = parseRoute();
    renderShell(route.page || 'dashboard');
    showToast('Workspace refreshed');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

document.addEventListener('click', async (event) => {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) return;
  const action = actionElement.dataset.action;

  if (action === 'close-modal' && event.target !== actionElement && actionElement.classList.contains('modal-backdrop')) return;

  switch (action) {
    case 'toggle-theme':
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = state.theme;
      localStorage.setItem('dls-theme', state.theme);
      await handleRoute();
      break;
    case 'auth-provider':
      await authenticate(actionElement.dataset.provider);
      break;
    case 'toggle-magic':
      state.magicOpen = !state.magicOpen;
      renderLogin();
      break;
    case 'dismiss-toast':
      document.getElementById(actionElement.dataset.toastId)?.remove();
      break;
    case 'open-project':
      window.location.hash = `#project/${actionElement.dataset.projectId}`;
      break;
    case 'new-project':
      state.modal = { type: 'new-project' };
      renderModal();
      break;
    case 'use-template': {
      const template = state.templates.find((item) => item.id === actionElement.dataset.templateId);
      state.modal = { type: 'new-project', templateId: template?.id };
      modalRoot.innerHTML = renderNewProjectModal(template);
      break;
    }
    case 'close-modal':
      closeModal();
      break;
    case 'share':
      await saveEditor();
      state.shareTab = 'invite';
      state.modal = { type: 'share' };
      renderModal();
      break;
    case 'share-tab':
      state.shareTab = actionElement.dataset.tab;
      renderModal();
      window.requestAnimationFrame(() => modalRoot.querySelector(`[data-action="share-tab"][data-tab="${state.shareTab}"]`)?.focus());
      break;
    case 'copy-link': {
      const input = document.getElementById('share-url');
      try {
        await navigator.clipboard.writeText(input?.value || window.location.href);
        showToast('Project link copied');
      } catch (_) {
        input?.select();
        document.execCommand('copy');
        showToast('Project link copied');
      }
      break;
    }
    case 'comments':
      await saveEditor();
      state.modal = { type: 'comments' };
      renderModal();
      break;
    case 'resolve-comment':
      await resolveComment(actionElement.dataset.commentId, actionElement.dataset.resolved === 'true');
      break;
    case 'versions':
      await saveEditor();
      state.selectedVersionId = state.activeProject?.versions?.[0]?.id || null;
      state.modal = { type: 'versions' };
      renderModal();
      break;
    case 'select-version':
      state.selectedVersionId = actionElement.dataset.versionId;
      renderModal();
      window.requestAnimationFrame(() => modalRoot.querySelector(`[data-version-id="${state.selectedVersionId}"]`)?.focus());
      break;
    case 'create-version':
      await createVersion();
      break;
    case 'restore-version':
      await restoreVersion(actionElement.dataset.versionId);
      break;
    case 'preview':
      state.modal = { type: 'preview' };
      renderModal();
      break;
    case 'preview-mode':
      state.previewMode = ['interface', 'json', 'flow'].includes(actionElement.dataset.mode) ? actionElement.dataset.mode : 'interface';
      renderEditor();
      window.requestAnimationFrame(() => document.getElementById(`output-tab-${state.previewMode}`)?.focus());
      break;
    case 'publish-prototype':
      await saveEditor();
      showToast(`Prototype published with ${DESIGN_SYSTEMS[state.designSystem].name}.`, 'success');
      break;
    case 'copy-generated-json': {
      const parsed = generatedOutput(parseStructuredLanguage(state.editorText, state.activeProject?.name));
      await navigator.clipboard.writeText(JSON.stringify(parsed, null, 2));
      showToast('Generated JSON copied.', 'success');
      break;
    }
    case 'run-prototype':
      actionElement.disabled = true;
      actionElement.innerHTML = `${icon('check', 'icon-sm')}Interface action completed`;
      showToast('Generated prototype action completed', 'success');
      break;
    case 'validate': {
      const parsed = parseStructuredLanguage(state.editorText, state.activeProject?.name);
      showToast(parsed.valid ? `Workflow is valid with ${parsed.steps.length} structured steps.` : 'Add complete GIVEN, WHEN, and THEN steps before publishing.', parsed.valid ? 'success' : 'error');
      break;
    }
    case 'back-dashboard':
    case 'mobile-home':
      await saveEditor();
      window.location.hash = '#dashboard';
      break;
    case 'settings-tab':
      state.settingsTab = actionElement.dataset.tab;
      renderShell('settings');
      window.requestAnimationFrame(() => document.getElementById(`settings-tab-${state.settingsTab}`)?.focus());
      break;
    case 'toggle-setting':
      await toggleWorkspaceSetting(actionElement.dataset.setting);
      break;
    case 'refresh-bootstrap':
      await refreshBootstrap();
      break;
    case 'user-menu':
      state.modal = { type: 'user-menu' };
      renderModal();
      break;
    case 'logout':
      await logout();
      break;
    case 'notifications':
      showToast('You are all caught up.', 'info');
      break;
    case 'editor-more':
      showToast('Export, duplicate, archive, and developer handoff actions belong here.', 'info');
      break;
    case 'open-workspace-invite':
      showToast('Open a project and use Share to invite a collaborator with a role.', 'info');
      break;
    case 'save-general-settings':
      showToast('Organization settings saved');
      break;
    default:
      break;
  }
});

document.addEventListener('submit', async (event) => {
  const form = event.target;
  event.preventDefault();
  if (form.dataset.form === 'magic-login') {
    const data = new FormData(form);
    await authenticate('magic', data.get('email'));
  } else if (form.dataset.form === 'new-project') {
    await createProject(form);
  } else if (form.dataset.form === 'invite-member') {
    await inviteMember(form);
  } else if (form.dataset.form === 'new-comment') {
    await addComment(form);
  } else if (form.dataset.form === 'connect-mcp') {
    const data = new FormData(form);
    const serverUrl = String(data.get('serverUrl') || '').trim();
    const name = String(data.get('name') || '').trim();
    DESIGN_SYSTEMS.connected = { name, source: 'MCP', components: 12, serverUrl };
    state.mcpConnection = { name, serverUrl, capabilities: ['tokens', 'components', 'usage_rules', 'code_bindings'] };
    state.designSystem = 'connected';
    localStorage.setItem('dls-magician-design-system', state.designSystem);
    localStorage.setItem('dls-magician-mcp-connection', JSON.stringify(state.mcpConnection));
    closeModal();
    renderEditor();
    showToast(`${name} connected with 4 required capabilities.`, 'success');
  }
});

document.addEventListener('input', (event) => {
  const target = event.target;
  if (target.matches('input, textarea, select') && target.getAttribute('aria-invalid') === 'true') target.removeAttribute('aria-invalid');
  if (target.matches('.intent-step-input')) {
    const fields = [...document.querySelectorAll('.intent-step-input')];
    state.editorText = fields.map((field) => `${field.dataset.intentType}\n${field.value.trim()}`).join('\n\n');
    state.editorDirty = true;
    updateEditorOutputs();
    scheduleAutosave();
  } else if (target.id === 'project-filter') {
    filterProjectRows(target.value);
  }
});

document.addEventListener('invalid', (event) => {
  event.target.setAttribute('aria-invalid', 'true');
  announce(`${event.target.labels?.[0]?.textContent || event.target.getAttribute('aria-label') || 'Field'}: ${event.target.validationMessage}`, true);
}, true);

document.addEventListener('change', async (event) => {
  const target = event.target;
  if (target.dataset.action === 'member-role') {
    await updateMemberRole(target.dataset.userId, target.value);
  } else if (target.dataset.action === 'design-system-select') {
    if (target.value === 'mcp') {
      target.value = state.designSystem;
      state.modal = { type: 'connect-mcp' };
      renderModal();
      return;
    }
    state.designSystem = target.value;
    localStorage.setItem('dls-magician-design-system', state.designSystem);
    if (state.modal?.type === 'preview') {
      renderModal();
      window.requestAnimationFrame(() => modalRoot.querySelector('[data-action="design-system-select"]')?.focus());
    }
    else renderEditor();
    showToast(`Generating with ${DESIGN_SYSTEMS[state.designSystem].name}.`, 'success');
  } else if (target.dataset.action === 'preview-viewport') {
    state.previewViewport = target.value === 'mobile' ? 'mobile' : 'desktop';
    renderEditor();
  } else if (target.dataset.action === 'preview-zoom') {
    state.previewZoom = ['75', '100', '125'].includes(target.value) ? target.value : '100';
    renderEditor();
  }
});

document.addEventListener('keydown', (event) => {
  if (state.modal && event.key === 'Tab') {
    const focusable = modalFocusableElements();
    if (!focusable.length) {
      event.preventDefault();
      modalRoot.querySelector('[role="dialog"]')?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  if (event.target.matches('[role="tab"]') && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    const tabs = [...event.target.closest('[role="tablist"]')?.querySelectorAll('[role="tab"]') || []];
    if (tabs.length) {
      event.preventDefault();
      const current = tabs.indexOf(event.target);
      const previous = ['ArrowLeft', 'ArrowUp'].includes(event.key);
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (previous ? -1 : 1) + tabs.length) % tabs.length;
      tabs[nextIndex].focus();
      tabs[nextIndex].click();
    }
    return;
  }
  if (event.target.matches('[data-resizer="intent"]') && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    state.intentWidth = Math.min(55, Math.max(30, state.intentWidth + (event.key === 'ArrowRight' ? 2 : -2)));
    event.target.closest('.editor-body')?.style.setProperty('--intent-width', `${state.intentWidth}%`);
    event.target.setAttribute('aria-valuenow', String(state.intentWidth));
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    if (state.activeProject) saveEditor().then(() => showToast('Project saved'));
  }
  if (event.key === 'Escape' && state.modal) closeModal();
  if (event.key === 'Enter' && event.target.closest('[data-action="open-project"]')) {
    const card = event.target.closest('[data-action="open-project"]');
    window.location.hash = `#project/${card.dataset.projectId}`;
  }
});

document.addEventListener('pointerdown', (event) => {
  const resizer = event.target.closest('[data-resizer="intent"]');
  if (!resizer) return;
  const body = resizer.closest('.editor-body');
  if (!body) return;
  const rect = body.getBoundingClientRect();
  const onMove = (moveEvent) => {
    const percent = Math.min(55, Math.max(30, ((moveEvent.clientX - rect.left) / rect.width) * 100));
    state.intentWidth = Math.round(percent * 10) / 10;
    body.style.setProperty('--intent-width', `${state.intentWidth}%`);
    resizer.setAttribute('aria-valuenow', String(state.intentWidth));
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  event.preventDefault();
});

document.addEventListener('dblclick', (event) => {
  const resizer = event.target.closest('[data-resizer="intent"]');
  if (!resizer) return;
  state.intentWidth = 40;
  resizer.closest('.editor-body')?.style.setProperty('--intent-width', '40%');
  resizer.setAttribute('aria-valuenow', '40');
  showToast('Panel widths reset.', 'info');
});

window.addEventListener('hashchange', handleRoute);
window.addEventListener('beforeunload', () => {
  if (state.editorDirty) saveEditor();
  disconnectStream();
  stopPresence();
});

boot();
