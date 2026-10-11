// Extracted unchanged functions from verified production public/app.js; see provenance.json.
(function(root){
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
const state={designSystem:"dls"};
function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.files}</svg>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

root.DLSLegacyWorkflow={parse:parseStructuredLanguage,render(generated,system){state.designSystem=system;return renderGeneratedInterface(generated);},output(generated,system){state.designSystem=system;return generatedOutput(generated);}};
})(globalThis);
