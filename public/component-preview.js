/* Intent-sized HTML previews. Registry bindings are references, not imported UI libraries. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.DLSComponentPreview = api; api.install(root); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Longest aliases win, so "radio button" and "status card" each describe ONE component.
  const definitions = [
    ['Button', 'button|buttons', 'Button', 'Button'],
    ['Input', 'text input|text field|input field|text box|textbox|input|inputs|field|fields', 'TextField', 'Input'],
    ['Textarea', 'text area|textarea|multiline input', 'TextareaAutosize', 'Input.TextArea'],
    ['Select', 'select field|select menu|drop-down|dropdown|select|combobox', 'Select', 'Select'],
    ['Checkbox', 'check box|checkbox|checkboxes', 'Checkbox', 'Checkbox'],
    ['Radio', 'radio button group|radio group|radio buttons|radio button|radio', 'RadioGroup', 'Radio.Group'],
    ['Switch', 'toggle switch|switch|switches|toggle|toggles', 'Switch', 'Switch'],
    ['Slider', 'range slider|slider|sliders', 'Slider', 'Slider'],
    ['DatePicker', 'date picker|datepicker|date field|date input', 'DatePicker', 'DatePicker'],
    ['Upload', 'file upload|upload field|upload button|uploader|upload', 'Button', 'Upload'],
    ['Card', 'status card|card|cards', 'Card', 'Card'],
    ['Surface', 'surface|paper|panel', 'Paper', 'Layout'],
    ['Form', 'form|forms', 'Box', 'Form'],
    ['Layout', 'layout|page|screen|dashboard', 'Stack', 'Layout'],
    ['Dialog', 'modal dialog|dialog|modal', 'Dialog', 'Modal'],
    ['List', 'list|lists', 'List', 'List'],
    ['Table', 'data table|table|tables', 'Table', 'Table'],
    ['Tabs', 'tab group|tab bar|tabs', 'Tabs', 'Tabs'],
    ['Accordion', 'accordion|accordions|disclosure', 'Accordion', 'Collapse'],
    ['Alert', 'inline insight|status banner|notification banner|banner|alert|message|toast', 'Alert', 'Alert'],
    ['Badge', 'status badge|badge|badges|chip|tag', 'Chip', 'Tag'],
    ['Avatar', 'avatar|avatars', 'Avatar', 'Avatar'],
    ['Progress', 'progress bar|progress indicator|progress', 'LinearProgress', 'Progress'],
    ['Spinner', 'loading spinner|spinner|loader', 'CircularProgress', 'Spin'],
    ['Tooltip', 'tooltip|tool tip', 'Tooltip', 'Tooltip'],
    ['Divider', 'divider|separator|horizontal rule', 'Divider', 'Divider'],
    ['Heading', 'heading|headline|title', 'Typography', 'Typography.Title'],
    ['Text', 'paragraph|body text|text', 'Typography', 'Typography.Text'],
    ['Image', 'image|picture|photo', 'Box', 'Image'],
    ['Breadcrumb', 'breadcrumbs|breadcrumb', 'Breadcrumbs', 'Breadcrumb'],
    ['Pagination', 'pagination|page navigation', 'Pagination', 'Pagination'],
    ['Menu', 'navigation menu|menu', 'MenuList', 'Menu'],
    ['Link', 'hyperlink|link', 'Link', 'Typography.Link'],
    ['Icon', 'icon|icons', 'SvgIcon', 'Icon'],
    ['Skeleton', 'skeleton loader|skeleton', 'Skeleton', 'Skeleton']
  ];
  const registry = Object.fromEntries(definitions.map(([type, aliases, material, ant]) => [type, {
    type, aliases: aliases.split('|'), bindings: { dls: type, material, ant, connected: type }
  }]));
  const containers = new Set(['Card', 'Surface', 'Form', 'Layout', 'Dialog']);
  const aliases = definitions.flatMap(([type, names]) => names.split('|').map(alias => [alias, type])).sort((a, b) => b[0].length - a[0].length);
  const aliasMap = new Map(aliases);
  const rootPattern = new RegExp('\\b(?:' + aliases.map(([alias]) => alias.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|') + ')\\b', 'gi');
  const quotedPattern = /"[^"\n]*"|'[^'\n]*'|“[^”\n]*”|‘[^’\n]*’|`[^`\n]*`/g;
  const placeholders = /^(?:describe (?:the triggering condition|the expected outcome|this step|the user and their goal)|add step details)[.…]*$/i;
  const plain = value => String(value == null ? '' : value).trim();
  const clean = value => placeholders.test(plain(value)) ? '' : plain(value);
  const escape = value => plain(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]);
  const maskQuotes = value => value.replace(quotedPattern, s => ' '.repeat(s.length));
  const flat = nodes => nodes.flatMap(node => [node, ...flat(node.children || [])]);
  let renderSerial = 0;

  function quoted(value, key) {
    const found = value.match(new RegExp('\\b(?:' + key + ')\\s*(?:(?:is|of)\\s+|[:=]\\s*)?["\'“‘`]([^"\'”’`]+)["\'”’`]', 'i'));
    return found ? found[1] : '';
  }
  function items(value, key = 'options|items|columns|labels') {
    const found = value.match(new RegExp('\\b(?:' + key + ')\\s*(?:are\\s+|[:=]\\s*)?([\\s\\S]+)', 'i'));
    if (!found) return [];
    const part = found[1].split(/;|\b(?:placeholder|disabled|required|selected|value|title|label(?:ed|led)?)\b/i)[0];
    const quotedItems = [...part.matchAll(/["'“‘`]([^"'”’`]+)["'”’`]/g)].map(m => m[1]);
    return (quotedItems.length > 1 ? quotedItems : (quotedItems[0] || part).split(/,|\||\s+and\s+/i))
      .map(s => s.trim().replace(/[.]$/, '')).filter(Boolean).slice(0, 20);
  }
  function propsFor(type, segment, alias) {
    const words = maskQuotes(segment).toLowerCase();
    let label = quoted(segment, 'label(?:led|ed)?|text|caption|named|called|says|reads|title(?:d)?');
    if (!label) {
      const before = segment.slice(0, segment.toLowerCase().indexOf(alias));
      const match = before.match(/["'“‘`]([^"'”’`]+)["'”’`]\s*$/);
      if (match) label = match[1];
    }
    if (!label) {
      const match = segment.match(/\b(?:labeled|labelled|named|called)\s+([^,.;]+?)(?=\s+(?:and|with|that|which|when|on)\b|$)/i);
      if (match) label = match[1];
    }
    if (!label && type === 'Button') {
      const match = segment.match(/\b(save|submit|cancel|continue|next|back|delete|confirm|send|search|sign in|log in|sign up)\s+button/i);
      if (match) label = match[1];
    }
    if (!label && ['Text', 'Heading', 'Badge', 'Alert', 'Tooltip', 'Link'].includes(type)) {
      const match = segment.match(/["'“‘`]([^"'”’`]+)["'”’`]/);
      if (match) label = match[1];
    }
    const number = (key, fallback) => {
      const m = words.match(new RegExp('\\b(?:' + key + ')\\s*(?:of\\s+|[:=]\\s*)?(-?\\d+(?:\\.\\d+)?)', 'i'));
      return m ? Number(m[1]) : fallback;
    };
    const min = number('min(?:imum)?', 0);
    const max = Math.max(min + 1, number('max(?:imum)?', 100));
    const percent = words.match(/(\d+(?:\.\d+)?)\s*%/);
    const numericValue = Math.min(max, Math.max(min, number('value|at', percent ? Number(percent[1]) : min)));
    const opts = items(segment, type === 'Table' ? 'columns' : 'options|items|labels');
    return {
      label: label || '',
      variant: /\b(?:secondary|outlined|outline)\b/.test(words) ? 'secondary' : /\b(?:danger|destructive|error)\b/.test(words) ? 'danger' : 'primary',
      disabled: /\bdisabled\b/.test(words) && !/\b(?:not|never)\s+disabled\b/.test(words),
      checked: /\b(?:checked|selected|on)\b/.test(words) && !/\b(?:unchecked|unselected|off|not checked|not selected)\b/.test(words),
      required: /\brequired\b/.test(words) && !/\bnot required\b/.test(words),
      loading: /\bloading\b/.test(words),
      placeholder: quoted(segment, 'placeholder'),
      content: quoted(segment, 'content|body|description|helper text'),
      value: quoted(segment, 'value|selected'),
      options: opts,
      inputType: /\bemail\b/.test(words) ? 'email' : /\bpassword\b/.test(words) ? 'password' : /\bnumber\b/.test(words) ? 'number' : 'text',
      tone: /\berror|danger\b/.test(words) ? 'error' : /\bwarning\b/.test(words) ? 'warning' : /\bsuccess\b/.test(words) ? 'success' : 'info',
      min, max, numericValue,
      href: quoted(segment, 'href|url'),
      src: quoted(segment, 'src|source|url'),
      dismissible: /\b(?:dismissible|closable|close button)\b/.test(words),
      open: /\b(?:expanded|open)\b/.test(words),
      direction: /\b(?:horizontal|row|side by side)\b/.test(words) ? 'row' : 'column'
    };
  }
  function structural(value) {
    let result = plain(value).replace(/\s+/g, ' ');
    const masked = maskQuotes(result);
    const event = /\b(?:when|on click|if clicked|that (?:opens?|shows?|displays?|triggers?|submits?|navigates?|changes?)|which (?:opens?|shows?|displays?|triggers?|submits?|navigates?|changes?))\b/i.exec(masked);
    if (event) result = result.slice(0, event.index);
    // Do not interpret "without a card" or "not inside a form" as a request for containers.
    const negative = /\b(?:without|instead of|not (?:a|an|the|inside|in))\b/i.exec(maskQuotes(result));
    if (negative) result = result.slice(0, negative.index);
    return result;
  }
  function componentsFrom(value) {
    const source = structural(value);
    const masked = maskQuotes(source);
    const matches = [...masked.matchAll(rootPattern)].filter(m => {
      // Property words are not additional components; "button with text ..." is one button.
      if (['text', 'title', 'icon'].includes(m[0].toLowerCase())) {
        const before = masked.slice(0, m.index);
        return !/\b(?:with|has|using|label|helper)\s*$/i.test(before);
      }
      return true;
    });
    const warnings = [];
    const nodes = [];
    let parent = null;
    let nextId = 1;
    const starts = matches.map((match, index) => {
      if (!index) return 0;
      const previousEnd = matches[index - 1].index + matches[index - 1][0].length;
      const gap = masked.slice(previousEnd, match.index);
      const separators = [...gap.matchAll(/\b(?:and|with|containing|contains|including|inside|within|next to)\b|[,;]/gi)];
      const last = separators.at(-1);
      return last ? previousEnd + last.index + last[0].length : previousEnd;
    });
    for (let index = 0; index < matches.length; index++) {
      const match = matches[index];
      const type = aliasMap.get(match[0].toLowerCase());
      const segment = source.slice(starts[index], index + 1 < matches.length ? starts[index + 1] : source.length);
      const props = propsFor(type, segment, match[0].toLowerCase());
      const before = masked.slice(starts[index], match.index);
      const countMatch = before.match(/\b(\d+|one|two|three|four|five)\s+(?:(?:primary|secondary|small|large|disabled)\s+)*$/i);
      const count = countMatch ? ({one: 1, two: 2, three: 3, four: 4, five: 5}[countMatch[1].toLowerCase()] || Number(countMatch[1])) : 1;
      const allowed = Math.min(20 - flat(nodes).length, count);
      if (count > allowed) warnings.push('Preview limited to 20 component instances.');
      if (count === 0) warnings.push('Use a component count greater than zero.');
      const gap = index ? masked.slice(matches[index - 1].index + matches[index - 1][0].length, match.index) : '';
      const backwards = containers.has(type) && /\b(?:inside|within|in)\s+(?:a|an|the)?\s*$/i.test(gap);
      const previous = flat(nodes).at(-1);
      if (previous && containers.has(previous.type) && /\b(?:with|containing|contains|including)\b/i.test(gap)) parent = previous;
      if (/;|\bnext to\b/i.test(gap)) parent = null;
      for (let n = 0; n < allowed; n++) {
        const node = { id: `component_${nextId++}`, type, props: {...props}, children: [] };
        if (backwards) { node.children = nodes.splice(0); nodes.push(node); parent = node; }
        else if (parent) parent.children.push(node);
        else nodes.push(node);
      }
    }
    const unsupported = masked.match(/\b(?:carousel|chart|graph|kanban|timeline|map|video|calendar|code editor|tree view)\b/gi);
    if (unsupported) warnings.push(`Not rendered: ${[...new Set(unsupported.map(s => s.toLowerCase()))].join(', ')}. Add a supported component or a renderer for this type.`);
    return { nodes, warnings };
  }
  function analyze(generated) {
    if (generated && generated.previewEngine === 'components-v1') return generated;
    const steps = (Array.isArray(generated?.steps) ? generated.steps : []).map(step => ({...step, text: clean(step.text)}));
    const given = steps.filter(step => step.type === 'GIVEN').map(step => step.text).join(' ').trim();
    const additions = steps.filter(step => step.type === 'AND' && /^(?:a |an |the |add |show |include )/i.test(step.text) && !/\b(?:when|after|clicked|clicks)\b/i.test(step.text)).map(step => step.text);
    const result = componentsFrom([given, ...additions].join('; '));
    const persona = /^(?:a |an |the )?(?:user|advertiser|customer|admin|visitor|designer|member|person|team)\b/i.test(given);
    if (!result.nodes.length && persona) return { ...generated, steps, valid: ['GIVEN', 'WHEN', 'THEN'].every(type => steps.some(step => step.type === type && step.text)) };
    const count = flat(result.nodes).length;
    return {
      ...generated, steps, previewEngine: 'components-v1',
      scope: count ? (count === 1 ? 'component' : 'composition') : 'unrecognized',
      components: result.nodes, componentCount: count,
      warnings: result.warnings.length ? result.warnings : count ? [] : [given ? 'Component not recognized. Try a supported component name; no workflow has been substituted.' : 'Describe a component in GIVEN to start.'],
      valid: count > 0 && !result.warnings.length
    };
  }
  function safeUrl(value, image = false) {
    const url = plain(value);
    if (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)) return url;
    return !image && /^#[\w-]+$/.test(url) ? url : '';
  }
  function renderNode(node, prefix) {
    const p = node.props;
    const id = `${prefix}-${node.id}`;
    const label = escape(p.label || node.type);
    const disabled = p.disabled ? ' disabled' : '';
    const required = p.required ? ' required' : '';
    const marked = p.checked ? ' checked' : '';
    const attrs = `data-component="${node.type}" class="cp-node cp-${node.type.toLowerCase()}"`;
    const children = node.children.map(child => renderNode(child, prefix)).join('');
    const heading = p.label ? `<h3>${label}</h3>` : '';
    const content = p.content ? `<p>${escape(p.content)}</p>` : '';
    const optionLabels = p.options.length ? p.options : [];
    switch (node.type) {
      case 'Button': return `<button ${attrs} type="button" data-variant="${p.variant}"${disabled}${p.loading ? ' aria-busy="true"' : ''}>${p.loading ? '<span class="cp-loading-dot" aria-hidden="true"></span>' : ''}${label}</button>`;
      case 'Input': case 'Textarea': case 'DatePicker': case 'Upload': {
        const tag = node.type === 'Textarea' ? 'textarea' : 'input';
        const type = node.type === 'DatePicker' ? 'date' : node.type === 'Upload' ? 'file' : p.inputType;
        const input = `<${tag} id="${id}" aria-label="${label}"${tag === 'input' ? ` type="${type}"` : ' rows="3"'} placeholder="${escape(p.placeholder)}"${disabled}${required}${tag === 'input' && type !== 'file' ? ` value="${escape(p.value)}"` : ''}>${tag === 'textarea' ? escape(p.value) + '</textarea>' : ''}`;
        return `<div ${attrs}><label for="${id}">${label}${p.required ? ' *' : ''}</label>${input}${content}</div>`;
      }
      case 'Select': return `<div ${attrs}><label for="${id}">${label}</label><select id="${id}"${disabled}${required}><option value="">${escape(p.placeholder || 'Select an option')}</option>${optionLabels.map(item => `<option${p.value === item ? ' selected' : ''}>${escape(item)}</option>`).join('')}</select></div>`;
      case 'Checkbox': case 'Switch': return `<label ${attrs}><input type="checkbox"${node.type === 'Switch' ? ' role="switch"' : ''}${disabled}${marked}${required}><span>${label}</span></label>`;
      case 'Radio': return `<fieldset ${attrs}><legend>${label}</legend>${(optionLabels.length ? optionLabels : [p.label || 'Option']).map((item, index) => `<label><input type="radio" name="${id}" value="${escape(item)}"${disabled}${(p.value === item || (!p.value && p.checked && index === 0)) ? ' checked' : ''}>${escape(item)}</label>`).join('')}</fieldset>`;
      case 'Slider': return `<div ${attrs}><label for="${id}">${label}</label><input id="${id}" type="range" min="${p.min}" max="${p.max}" value="${p.numericValue}"${disabled} data-preview-range><output for="${id}">${p.numericValue}</output></div>`;
      case 'Card': case 'Surface': case 'Layout': case 'Form': case 'Dialog': {
        const tag = node.type === 'Form' ? 'form' : 'section';
        return `<${tag} ${attrs} aria-label="${label}"${node.type === 'Dialog' ? ' role="dialog"' : ''} data-direction="${p.direction}">${heading}${content}${children}${node.type === 'Dialog' && p.dismissible ? '<button type="button" class="cp-close" aria-label="Close dialog preview" data-preview-action="dismiss">×</button>' : ''}</${tag}>`;
      }
      case 'Alert': return `<div ${attrs} data-tone="${p.tone}" role="status"><span class="cp-alert-mark" aria-hidden="true">${p.tone === 'error' || p.tone === 'warning' ? '!' : 'i'}</span><div>${label}${content}</div></div>`;
      case 'Badge': return `<span ${attrs} data-tone="${p.tone}">${label}</span>`;
      case 'Avatar': return `<span ${attrs} role="img" aria-label="${label}">${p.label ? escape(p.label.split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase()) : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></svg>'}</span>`;
      case 'List': return `<ul ${attrs} aria-label="${label}">${optionLabels.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`;
      case 'Table': return `<div ${attrs}><table aria-label="${label}">${p.label ? `<caption>${label}</caption>` : ''}${optionLabels.length ? `<thead><tr>${optionLabels.map(item => `<th scope="col">${escape(item)}</th>`).join('')}</tr></thead>` : ''}<tbody><tr><td colspan="${Math.max(1, optionLabels.length)}">No data provided</td></tr></tbody></table></div>`;
      case 'Tabs': {
        const tabs = optionLabels.length ? optionLabels : ['Tab'];
        return `<div ${attrs}><div role="tablist" aria-label="${label}">${tabs.map((item, index) => `<button type="button" id="${id}-tab-${index}" role="tab" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" aria-controls="${id}-panel-${index}" data-preview-action="tab">${escape(item)}</button>`).join('')}</div>${tabs.map((_, index) => `<div id="${id}-panel-${index}" role="tabpanel" aria-labelledby="${id}-tab-${index}" tabindex="0"${index ? ' hidden' : ''}>${index === 0 ? content : ''}</div>`).join('')}</div>`;
      }
      case 'Accordion': return `<details ${attrs}${p.open ? ' open' : ''}><summary>${label}</summary><div>${content}</div></details>`;
      case 'Progress': return `<div ${attrs}><label for="${id}">${label}</label><progress id="${id}" max="${p.max}" value="${p.numericValue}">${p.numericValue}</progress><span>${Math.round(p.numericValue / p.max * 100)}%</span></div>`;
      case 'Spinner': return `<span ${attrs} role="status" aria-label="${label}"><span class="cp-spinner-ring" aria-hidden="true"></span></span>`;
      case 'Tooltip': return `<span ${attrs}><button type="button" aria-describedby="${id}">${label}</button><span id="${id}" role="tooltip">${escape(p.content || p.label || 'Tooltip')}</span></span>`;
      case 'Divider': return `<hr ${attrs} aria-label="${label}">`;
      case 'Heading': return `<h2 ${attrs}>${label}</h2>`;
      case 'Text': return `<p ${attrs}>${escape(p.content || p.label || 'Text')}</p>`;
      case 'Image': return safeUrl(p.src, true) ? `<img ${attrs} src="${escape(safeUrl(p.src, true))}" alt="${label}" referrerpolicy="no-referrer">` : `<div ${attrs} role="img" aria-label="${label}"><span>${p.label ? label : 'Image placeholder'}</span></div>`;
      case 'Breadcrumb': return `<nav ${attrs} aria-label="${label}"><ol>${(optionLabels.length ? optionLabels : ['Current page']).map((item, index, all) => `<li${index === all.length - 1 ? ' aria-current="page"' : ''}>${escape(item)}</li>`).join('')}</ol></nav>`;
      case 'Pagination': return `<nav ${attrs} aria-label="${label}">${(optionLabels.length ? optionLabels : ['1']).map((item, index) => `<button type="button" data-preview-action="page"${index === 0 ? ' aria-current="page"' : ''}${disabled}>${escape(item)}</button>`).join('')}</nav>`;
      case 'Menu': return `<nav ${attrs} aria-label="${label}">${(optionLabels.length ? optionLabels : ['Menu item']).map(item => `<button type="button"${disabled}>${escape(item)}</button>`).join('')}</nav>`;
      case 'Link': return `<a ${attrs} href="${escape(safeUrl(p.href) || '#')}" data-preview-link${safeUrl(p.href).startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
      case 'Icon': return `<svg ${attrs} viewBox="0 0 24 24" role="img" aria-label="${label}"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/></svg>`;
      case 'Skeleton': return `<span ${attrs} role="status" aria-label="${label}"></span>`;
      default: return '';
    }
  }
  function render(generated, system = 'dls', expanded = false) {
    const spec = analyze(generated);
    const systemId = ['dls', 'material', 'ant', 'connected'].includes(system) ? system : 'dls';
    const prefix = `cp-${++renderSerial}`;
    const warnings = spec.warnings || [];
    return `<div class="prototype-stage component-preview ds-${systemId}${expanded ? ' prototype-stage-expanded' : ''}" data-preview-scope="${escape(spec.scope)}"><div class="cp-canvas">${(spec.components || []).map(node => renderNode(node, prefix)).join('')}</div>${warnings.length ? `<div class="cp-notice" role="status">${warnings.map(escape).join('<br>')}</div>` : ''}</div>`;
  }
  function output(generated, system = 'dls', meta = {}) {
    const spec = analyze(generated);
    if (spec.previewEngine !== 'components-v1') return spec;
    const binding = type => registry[type].bindings[system] || registry[type].bindings.dls;
    const bind = nodes => nodes.map(node => ({ ...node, binding: binding(node.type), children: bind(node.children) }));
    return { ...spec, components: bind(spec.components), designSystem: { ...meta, id: system, implementation: 'html-preview', components: flat(spec.components).map(node => binding(node.type)) } };
  }
  function bindEvents(doc) {
    doc.addEventListener('input', event => {
      if (event.target.matches('[data-preview-range]')) event.target.parentElement.querySelector('output').value = event.target.value;
    });
    doc.addEventListener('submit', event => { if (event.target.matches('.component-preview form')) event.preventDefault(); });
    doc.addEventListener('click', event => {
      const target = event.target.closest('[data-preview-action], [data-preview-link]');
      if (!target || !target.closest('.component-preview')) return;
      if (target.matches('[data-preview-link]') && target.getAttribute('href') === '#') { event.preventDefault(); return; }
      const action = target.dataset.previewAction;
      const component = target.closest('[data-component]');
      if (action === 'dismiss') component.hidden = true;
      if (action === 'page') {
        component.querySelectorAll('[aria-current]').forEach(item => item.removeAttribute('aria-current'));
        target.setAttribute('aria-current', 'page');
      }
      if (action === 'tab') {
        component.querySelectorAll('[role="tab"]').forEach(tab => {
          const active = tab === target;
          tab.setAttribute('aria-selected', String(active));
          tab.tabIndex = active ? 0 : -1;
          doc.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
        });
      }
    });
    doc.addEventListener('keydown', event => {
      const tab = event.target.closest('.component-preview [role="tab"]');
      if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const tabs = [...tab.parentElement.querySelectorAll('[role="tab"]')];
      const index = tabs.indexOf(tab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus(); tabs[next].click();
    });
  }
  function install(root) {
    if (root.__dlsComponentPreviewInstalled) return;
    if (typeof root.parseStructuredLanguage !== 'function' || typeof root.renderGeneratedInterface !== 'function') throw new Error('Load component-preview.js after app.js.');
    root.__dlsComponentPreviewInstalled = true;
    const baseParse = root.parseStructuredLanguage;
    const baseRender = root.renderGeneratedInterface;
    const baseOutput = root.generatedOutput;
    const baseComponents = root.designSystemComponents;
    root.parseStructuredLanguage = function (...args) { return analyze(baseParse.apply(this, args)); };
    root.renderGeneratedInterface = function (generated, expanded = false) {
      const spec = analyze(generated);
      return spec.previewEngine === 'components-v1' ? render(spec, state.designSystem, expanded) : baseRender.apply(this, arguments);
    };
    root.generatedOutput = function (generated) {
      const spec = analyze(generated);
      const base = baseOutput.call(this, spec);
      return spec.previewEngine === 'components-v1' ? output(spec, state.designSystem, base.designSystem) : base;
    };
    root.designSystemComponents = function () {
      if (state.activeProject) {
        const spec = root.parseStructuredLanguage(state.editorText, state.activeProject.name);
        if (spec.previewEngine === 'components-v1') return flat(spec.components).map(node => registry[node.type].bindings[state.designSystem] || node.type);
      }
      return baseComponents.apply(this, arguments);
    };
    function syncSummary() {
      if (!state.activeProject) return;
      const spec = root.parseStructuredLanguage(state.editorText, state.activeProject.name);
      const count = spec.previewEngine === 'components-v1' ? spec.componentCount : root.designSystemComponents().length;
      const description = `${count} component${count === 1 ? '' : 's'}`;
      const summary = root.document.querySelector('.output-system-summary');
      const subtitle = root.document.getElementById('preview-description');
      if (summary) summary.textContent = `${DESIGN_SYSTEMS[state.designSystem].name} · ${description}`;
      if (subtitle) subtitle.textContent = `${description} · ${DESIGN_SYSTEMS[state.designSystem].name}`;
    }
    for (const name of ['renderOutput', 'renderPreviewModal']) {
      const original = root[name];
      if (typeof original !== 'function') continue;
      root[name] = function (...args) { const result = original.apply(this, args); root.queueMicrotask(syncSummary); return result; };
    }
    bindEvents(root.document);
    root.queueMicrotask(() => {
      if (state.activeProject && root.document.getElementById('generated-preview')) root.updateEditorOutputs();
      syncSummary();
    });
  }
  return { registry, analyze, componentsFrom, render, output, flat, safeUrl, bindEvents, install };
});
