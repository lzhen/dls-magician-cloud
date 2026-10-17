'use strict';

const categories = [
  { id: 'all', name: 'All components', icon: '◫' },
  { id: 'actions', name: 'Actions', icon: '↗' },
  { id: 'inputs', name: 'Inputs', icon: '⊞' },
  { id: 'feedback', name: 'Feedback', icon: '◉' },
  { id: 'overlays', name: 'Overlays', icon: '▱' },
  { id: 'flow', name: 'Flow', icon: '⌁' }
];
const componentCategories = { button: 'actions', input: 'inputs', textarea: 'inputs', select: 'inputs', status: 'feedback', dialog: 'overlays', 'flow-node': 'flow', 'flow-connector': 'flow' };
const state = { data: null, category: 'all', query: '', tokenCategory: 'colors', selected: null, variant: 'default', detailTab: 'preview' };
const $ = (selector) => document.querySelector(selector);
const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let toastTimer;

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 2600);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard');
  } catch {
    toast('Clipboard unavailable. Select and copy the code directly.');
  }
}

function previewDocument(component, variant = 'default', small = false) {
  let example = component.variants[variant];
  if (small && component.id === 'button') example = `<div class="button-row">${component.variants.default}${component.variants.primary}</div>`;
  if (small && component.id === 'status') example = `<div class="badge-row">${component.variants.draft}${component.variants.review}${component.variants.published}</div>`;
  if (component.id === 'flow-connector') example = `<div class="flow-demo"><span class="step-label">GIVEN</span>${example}<span class="step-label">WHEN</span></div>`;
  const runtime = `
    const backdrop = document.querySelector('.modal-backdrop');
    const modal = document.querySelector('[role="dialog"]');
    let overlay = backdrop;
    let launcher;
    if (modal) {
      if (!overlay) { overlay = document.createElement('div'); overlay.className = 'modal-backdrop'; modal.before(overlay); overlay.append(modal); }
      overlay.hidden = true;
      launcher = document.createElement('button'); launcher.type = 'button'; launcher.className = 'btn btn-primary'; launcher.textContent = 'Open dialog';
      overlay.before(launcher);
      if (!modal.querySelector('button')) { const close = document.createElement('button'); close.className = 'btn btn-sm'; close.textContent = 'Close'; close.type = 'button'; modal.append(close); }
      launcher.onclick = () => { overlay.hidden = false; (modal.querySelector('button,input,select,textarea,[tabindex]') || modal).focus(); };
      const dismiss = () => { overlay.hidden = true; launcher.focus(); };
      overlay.onclick = (event) => { if (event.target === overlay || event.target.closest('button')) { event.preventDefault(); dismiss(); } };
      document.addEventListener('keydown', (event) => {
        if (overlay.hidden) return;
        if (event.key === 'Escape') { event.preventDefault(); dismiss(); }
        if (event.key === 'Tab') {
          const items = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')];
          const first = items[0], last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      });
    } else {
      document.querySelectorAll('button').forEach((button) => button.addEventListener('click', (event) => {
        event.preventDefault(); parent.postMessage({type:'dls-preview-action',label:button.textContent.trim()},'*');
      }));
    }
    document.addEventListener('submit', (event) => event.preventDefault());
  `;
  const reset = `html,body{height:100%;min-height:100%;min-width:0;width:100%;background:transparent!important;overflow:auto;margin:0}body{display:flex;align-items:center;justify-content:center;padding:${small ? '28px 14px 14px' : '28px'};font-size:13px}.preview-content{width:${['input','textarea','select'].includes(component.id) ? '280px' : 'auto'};max-width:100%}.button-row,.badge-row{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap}.btn{font-size:${small ? '10px' : '13px'};padding:0 ${small ? '11px' : '14px'}}.flow-demo{display:flex;flex-direction:column;align-items:center}.step-label{font-size:9px;letter-spacing:.15em;color:#b9a4cc}.flow-node{width:${small ? '205px' : '280px'}}.field label{font-size:11px}.modal{max-width:calc(100vw - 26px)}.modal-title{font-size:20px}.modal-header{padding:15px}.modal-body{padding:15px}.modal-footer{padding:12px 15px}.modal-backdrop{padding:13px;background:rgba(0,0,0,.55)}.modal-lg,.modal-xl{width:calc(100vw - 26px)}[hidden]{display:none!important}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${state.data.stylesheet.replace(/<\/style/gi, '<\\/style')}\n${reset}</style></head><body><div class="preview-content">${example}</div><script>${runtime}<\/script></body></html>`;
}

function attachPreview(container, component, variant, small = false) {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.title = `${component.name} — ${variant} interactive example`;
  frame.loading = small ? 'lazy' : 'eager';
  frame.srcdoc = previewDocument(component, variant, small);
  container.append(frame);
}

function renderCategories() {
  $('#category-nav').innerHTML = categories.map((category) => {
    const count = state.data.components.filter((component) => category.id === 'all' || componentCategories[component.id] === category.id).length;
    return `<button type="button" data-category="${category.id}" class="${state.category === category.id ? 'active' : ''}" aria-pressed="${state.category === category.id}"><span class="category-icon" aria-hidden="true">${category.icon}</span><span>${category.name}</span><span class="category-count">${count}</span></button>`;
  }).join('');
}

function renderGrid() {
  const terms = state.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const components = state.data.components.filter((component) => {
    const categoryMatch = state.category === 'all' || componentCategories[component.id] === state.category;
    const text = [component.id, component.name, component.description, ...component.tags].join(' ').toLocaleLowerCase();
    return categoryMatch && terms.every((term) => text.includes(term));
  });
  $('#category-title').textContent = categories.find((item) => item.id === state.category).name;
  $('#result-count').textContent = `${components.length}`;
  const grid = $('#component-grid');
  grid.innerHTML = '';
  if (!components.length) {
    grid.innerHTML = '<div class="empty-results"><h3>No components found</h3><p>Try a component name or clear your filters.</p><button type="button" class="text-button" data-clear-search>Clear filters</button></div>';
    return;
  }
  for (const component of components) {
    const card = document.createElement('article');
    card.className = 'component-card';
    const count = Object.keys(component.variants).length;
    card.innerHTML = `<div class="card-preview"><span class="card-category">${esc(componentCategories[component.id])}</span></div><button class="card-open" type="button" data-component="${esc(component.id)}" aria-label="Inspect ${esc(component.name)}"><span><strong>${esc(component.name)}</strong><small>${count} ${count === 1 ? 'variant' : 'variants'} · HTML / CSS</small></span><span aria-hidden="true">↗</span></button>`;
    attachPreview(card.querySelector('.card-preview'), component, 'default', true);
    grid.append(card);
  }
}

function renderTokens() {
  const groups = Object.keys(state.data.tokens);
  $('#token-tabs').innerHTML = groups.map((group) => `<button type="button" data-token-category="${group}" aria-pressed="${state.tokenCategory === group}">${esc(group[0].toUpperCase() + group.slice(1))}</button>`).join('');
  $('#tokens-content').innerHTML = `<div class="token-grid">${Object.entries(state.data.tokens[state.tokenCategory]).map(([name, value]) => {
    let visual;
    if (state.tokenCategory === 'colors') visual = `<div class="color-swatch" style="background:${esc(value)}"></div>`;
    else if (state.tokenCategory === 'typography') visual = `<span class="token-specimen" style="font-family:${esc(value)}">Aa 123</span>`;
    else if (state.tokenCategory === 'radius') visual = `<span class="radius-specimen" style="border-radius:${esc(value)}"></span>`;
    else visual = `<span class="token-specimen">${esc(name === '--sidebar' ? value : '◫')}</span>`;
    return `<article class="token-card"><div class="token-visual">${visual}</div><div class="token-text"><div class="token-name">${esc(name)}</div><div class="token-value">${esc(value)}</div></div></article>`;
  }).join('')}</div>`;
}

function codeBlock(title, content, id) {
  return `<div class="code-title"><span>${esc(title)}</span><button class="copy-button" type="button" data-copy="${id}">Copy</button></div><pre id="${id}"><code>${esc(content)}</code></pre>`;
}

function renderDetail() {
  const component = state.selected;
  $('#detail-title').textContent = component.name;
  $('#detail-description').textContent = component.description;
  $('#detail-category').textContent = `${componentCategories[component.id].toUpperCase()} / ${state.data.metadata.mcpVersion}`;
  $('#variant-select').innerHTML = Object.keys(component.variants).map((variant) => `<option value="${esc(variant)}" ${state.variant === variant ? 'selected' : ''}>${esc(variant)}</option>`).join('');
  document.querySelectorAll('[data-detail-tab]').forEach((button) => button.setAttribute('aria-pressed', button.dataset.detailTab === state.detailTab));
  const source = component.bindings[0];
  $('#detail-source').href = `${state.data.repositoryUrl}/blob/${state.data.sourceRef}/${source.file}#L${source.line}`;
  const body = $('#detail-body');
  if (state.detailTab === 'preview') {
    body.innerHTML = '<div class="detail-preview"></div>';
    attachPreview(body.firstChild, component, state.variant);
  } else if (state.detailTab === 'code') {
    body.innerHTML = `<div class="detail-code">${codeBlock('HTML usage example', component.variants[state.variant], 'example-html')}${codeBlock('CSS excerpt from the product stylesheet', component.css, 'example-css')}<p class="code-note">Load the full public/styles.css stylesheet. These examples demonstrate composition; host behavior is implemented separately.</p></div>`;
  } else {
    const request = JSON.stringify({ name: 'get_component_code', arguments: { componentId: component.id, variant: state.variant } }, null, 2);
    body.innerHTML = `<div class="detail-code">${codeBlock('Example MCP tool call', request, 'example-mcp')}<p class="code-note">Send this through a connected local MCP host. This page displays the request; it does not execute a server call.</p>${codeBlock('Source version', JSON.stringify({ catalogVersion: state.data.metadata.catalogVersion, sourceRevision: state.data.metadata.sourceRevision, source }, null, 2), 'example-source')}</div>`;
  }
  body.insertAdjacentHTML('beforeend', `<details class="recommendations"><summary>Usage &amp; implementation notes</summary><ul>${component.recommendations.map((note) => `<li>${esc(note)}</li>`).join('')}</ul></details>`);
}

function route() {
  if (!state.data) return;
  const hash = location.hash.slice(1) || 'components';
  const view = ['tokens', 'connect'].includes(hash) ? hash : 'components';
  for (const name of ['components', 'tokens', 'connect']) $(`#${name}-view`).hidden = name !== view;
  document.querySelectorAll('[data-view]').forEach((link) => {
    if (link.dataset.view === view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (hash.startsWith('component/')) {
    const id = hash.slice('component/'.length);
    const component = state.data.components.find((item) => item.id === id);
    if (component) {
      if (state.selected?.id !== id) { state.selected = component; state.variant = 'default'; state.detailTab = 'preview'; }
      renderDetail();
      if (!$('#component-detail').open) $('#component-detail').showModal();
    }
  } else if ($('#component-detail').open) $('#component-detail').close();
}

document.addEventListener('click', (event) => {
  const category = event.target.closest('[data-category]');
  if (category && state.data) {
    state.category = category.dataset.category;
    if (location.hash !== '#components') location.hash = 'components';
    renderCategories(); renderGrid();
  }
  const component = event.target.closest('[data-component]');
  if (component) location.hash = 'component/' + component.dataset.component;
  const tab = event.target.closest('[data-detail-tab]');
  if (tab) { state.detailTab = tab.dataset.detailTab; renderDetail(); }
  const token = event.target.closest('[data-token-category]');
  if (token) { state.tokenCategory = token.dataset.tokenCategory; renderTokens(); }
  const button = event.target.closest('[data-copy]');
  if (button) { const element = document.getElementById(button.dataset.copy); if (element) copy(element.textContent); }
  if (event.target.closest('[data-clear-search]')) {
    state.query = ''; state.category = 'all'; $('#component-search').value = ''; renderCategories(); renderGrid(); $('#component-search').focus();
  }
});
$('#component-search').addEventListener('input', (event) => { state.query = event.target.value; if (state.data) renderGrid(); });
$('#variant-select').addEventListener('change', (event) => { state.variant = event.target.value; renderDetail(); });
$('#detail-close').addEventListener('click', () => $('#component-detail').close());
$('#component-detail').addEventListener('close', () => { if (location.hash.startsWith('#component/')) history.replaceState(null, '', '#components'); });
window.addEventListener('hashchange', route);
window.addEventListener('message', (event) => {
  if (event.data?.type !== 'dls-preview-action') return;
  if (![...document.querySelectorAll('iframe')].some((frame) => frame.contentWindow === event.source)) return;
  toast('Preview action — no data was saved');
});
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !$('#component-detail').open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
    event.preventDefault(); location.hash = 'components'; $('#component-search').focus();
  }
});

(async function init() {
  try {
    const response = await fetch('./data.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
    if (!state.data.components?.length || !state.data.stylesheet) throw new Error('The component snapshot is incomplete.');
    $('#component-count').textContent = `${state.data.components.length} components`;
    $('#token-count').textContent = `${Object.values(state.data.tokens).reduce((count, group) => count + Object.keys(group).length, 0)} tokens`;
    document.querySelectorAll('.version-label').forEach((label) => { label.textContent = `MCP v${state.data.metadata.mcpVersion} · Catalog v${state.data.metadata.catalogVersion}`; });
    renderCategories(); renderGrid(); renderTokens(); route();
  } catch {
    $('#component-grid').innerHTML = '<div class="empty-results"><h3>The library could not load</h3><p>Refresh the page to retry. The component snapshot needs to be served alongside this page.</p></div>';
  }
})();
