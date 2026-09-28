/* Intent-aware completion: components in GIVEN; behaviors in WHEN. No network calls. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.DLSComponentAutocomplete = api; api.install(root); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Names/aliases come from the renderer's registry, not a second component inventory.
  const copy = {
    Button: ['button', 'Action'], Input: ['text input', 'Input'], Textarea: ['textarea', 'Input'],
    Select: ['dropdown', 'Input'], Checkbox: ['checkbox', 'Input'], Radio: ['radio group', 'Input'],
    Switch: ['switch', 'Input'], Slider: ['slider', 'Input'], DatePicker: ['date picker', 'Input'],
    Upload: ['file upload', 'Input'], Card: ['card', 'Container'], Surface: ['surface', 'Container'],
    Form: ['form', 'Container'], Layout: ['layout', 'Container'], Dialog: ['dialog', 'Container'],
    List: ['list', 'Content'], Table: ['table', 'Content'], Tabs: ['tabs', 'Navigation'],
    Accordion: ['accordion', 'Disclosure'], Alert: ['alert', 'Feedback'], Badge: ['badge', 'Feedback'],
    Avatar: ['avatar', 'Content'], Progress: ['progress bar', 'Feedback'], Spinner: ['spinner', 'Feedback'],
    Tooltip: ['tooltip', 'Feedback'], Divider: ['divider', 'Layout'], Heading: ['heading', 'Content'],
    Text: ['text', 'Content'], Image: ['image', 'Content'], Breadcrumb: ['breadcrumb', 'Navigation'],
    Pagination: ['pagination', 'Navigation'], Menu: ['menu', 'Navigation'], Link: ['link', 'Navigation'],
    Icon: ['icon', 'Content'], Skeleton: ['skeleton', 'Feedback']
  };
  // Authoring vocabulary only. Choosing an event does not execute THEN or attach a listener.
  const behaviorDefinitions = [
    ['Click', 'Click', 'click', 'Pointer', 'Activate a control by clicking or tapping.', 'clicks|clicked|tap|taps|tapped|activate'],
    ['DoubleClick', 'Double click', 'double click', 'Pointer', 'Click the same target twice in quick succession.', 'double-click|doubleclick|dblclick|double clicks|double clicked'],
    ['RightClick', 'Right click', 'right click', 'Pointer', 'Open a context menu on the target.', 'right-click|rightclick|context menu|contextmenu'],
    ['Hover', 'Hover', 'hover', 'Pointer', 'Move the pointer over the component.', 'hovers|hovered|mouse enter|mouseenter|pointer enter|pointerenter|mouse over|mouseover'],
    ['PointerLeave', 'Pointer leave', 'pointer leave', 'Pointer', 'Move the pointer away from the component.', 'mouse leave|mouseleave|pointerleave|hover ends|mouse out|mouseout'],
    ['Focus', 'Focus', 'focus', 'Focus', 'The component receives focus.', 'focuses|focused|focus in|focusin'],
    ['Blur', 'Blur', 'blur', 'Focus', 'Focus moves away from the component.', 'blurred|loses focus|lose focus|focus out|focusout'],
    ['Input', 'Type / input', 'type', 'Input', 'Text is entered, edited, or deleted.', 'input|typing|types|typed|text input|text entry'],
    ['Change', 'Value change', 'change', 'Input', 'A field value changes.', 'changes|changed|value change|value changed|on change'],
    ['Select', 'Select', 'select', 'Input', 'An option or item is selected.', 'selects|selected|selection|choose|option selected'],
    ['Check', 'Check', 'check', 'Input', 'A checkbox becomes checked.', 'checked|checks|checkbox checked'],
    ['Uncheck', 'Uncheck', 'uncheck', 'Input', 'A checkbox becomes unchecked.', 'unchecked|unchecks|checkbox unchecked'],
    ['Toggle', 'Toggle', 'toggle', 'Input', 'A switch changes between on and off.', 'toggles|toggled|switch|toggle on|toggle off'],
    ['KeyDown', 'Key down', 'key down', 'Keyboard', 'A keyboard key is pressed; specify the key.', 'keydown|key pressed|press key'],
    ['KeyUp', 'Key up', 'key up', 'Keyboard', 'A keyboard key is released; specify the key.', 'keyup|key released|release key'],
    ['PressEnter', 'Press Enter', 'press Enter', 'Keyboard', 'The Enter key is pressed.', 'enter|return|enter key|presses Enter'],
    ['PressEscape', 'Press Escape', 'press Escape', 'Keyboard', 'The Escape key is pressed.', 'escape|esc|escape key|presses Escape'],
    ['Submit', 'Submit', 'submit', 'Form', 'The user submits a form.', 'submits|submitted|form submit|submission'],
    ['Reset', 'Reset', 'reset', 'Form', 'Form values are reset.', 'resets|form reset'],
    ['DragStart', 'Drag start', 'drag start', 'Drag & drop', 'The user starts dragging an item.', 'drag|dragstart|start dragging'],
    ['DragOver', 'Drag over', 'drag over', 'Drag & drop', 'A dragged item moves over a drop target.', 'dragover|drag enter|dragenter'],
    ['Drop', 'Drop', 'drop', 'Drag & drop', 'A dragged item is released on a drop target.', 'dropped|drops|drag drop|drag and drop'],
    ['Scroll', 'Scroll', 'scroll', 'View', 'The user scrolls a page or region.', 'scrolls|scrolling|scrolled'],
    ['Load', 'Load', 'load', 'View', 'The page or component finishes loading.', 'loaded|page load|component load|on load']
  ];
  const normalize = value => String(value || '').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fieldSelector = 'textarea.intent-step-input';

  function catalog(registry) {
    return Object.values(registry || {}).filter(entry => entry.type && entry.aliases?.length).map(entry => {
      const preferred = copy[entry.type]?.[0];
      const insert = entry.aliases.includes(preferred) ? preferred : entry.aliases[0];
      return { type: entry.type, label: insert.charAt(0).toUpperCase() + insert.slice(1), insert,
        category: copy[entry.type]?.[1] || 'Component', aliases: entry.aliases.slice(),
        terms: [...new Set([insert, entry.type.replace(/([a-z])([A-Z])/g, '$1 $2'), entry.type, ...entry.aliases].map(normalize))] };
    });
  }
  function behaviorCatalog() {
    return behaviorDefinitions.map(([type, label, insert, category, description, alternatives]) => {
      const aliases = [insert, ...alternatives.split('|')];
      return { type, label, insert, category, description, aliases, kind: 'behavior',
        terms: [...new Set([label, type, ...aliases].map(normalize))] };
    });
  }
  function suggestionKind(intentType) {
    return String(intentType || '').toUpperCase() === 'WHEN' ? 'behavior' : 'component';
  }
  function catalogForIntent(intentType, components, behaviors = behaviorCatalog()) {
    return suggestionKind(intentType) === 'behavior' ? behaviors : components;
  }
  function matches(entries, query) {
    const q = normalize(query);
    if (!q) return entries.slice();
    return entries.map((entry, index) => {
      let score = Infinity;
      for (const term of entry.terms) {
        const rank = term === q ? 0 : term.startsWith(q) ? 1 : term.includes(' ' + q) ? 2 : Infinity;
        score = Math.min(score, rank);
      }
      return { entry, score, index };
    }).filter(item => Number.isFinite(item.score)).sort((a, b) => a.score - b.score || a.index - b.index).map(item => item.entry);
  }
  function insideQuote(value, end) {
    let closing = '';
    const pairs = {'"':'"', "'":"'", '“':'”', '‘':'’', '`':'`'};
    for (let i = 0; i < end; i++) {
      const char = value[i];
      if (char === '\\') { i++; continue; }
      if (closing) { if (char === closing) closing = ''; }
      else if (pairs[char] && !((char === "'" || char === '‘') && /[\p{L}\p{N}]/u.test(value[i - 1] || '') && /[\p{L}\p{N}]/u.test(value[i + 1] || ''))) closing = pairs[char];
    }
    return Boolean(closing);
  }
  function context(value, start, end, entries, force = false) {
    value = String(value || '');
    start = Math.max(0, Math.min(value.length, start));
    end = Math.max(start, Math.min(value.length, end));
    const left = value.slice(0, start);
    if (insideQuote(value, start) || /(?:https?:\/\/|www\.)\S*$/i.test(left)) return null;
    if (end !== start) return force ? { start, end, query: '', explicit: true } : null;
    const rightWord = value.slice(end).match(/^[\p{L}\p{N}_-]*/u)[0];
    const slash = /(?:^|[\s(,;])\/([a-z -]*)$/i.exec(left);
    if (slash) return { start: start - slash[1].length - 1, end: end + rightWord.length, query: slash[1], explicit: true };
    if (!left.trim() || /(?:\b(?:a|an|the|and|with|add|show|include|containing|contains)\s+|[,;]\s*)$/i.test(left) ||
      (entries[0]?.kind === 'behavior' && /^(?:(?:the )?user|on|when)\s+$/i.test(left))) {
      return { start, end, query: '', explicit: force };
    }
    const tail = left.match(/(?:[a-z][a-z-]*\s+){0,3}[a-z][a-z-]*$/i);
    if (tail) {
      const words = [...tail[0].matchAll(/[a-z][a-z-]*/gi)];
      for (const word of words) {
        const offset = start - tail[0].length + word.index;
        const query = left.slice(offset);
        if (/^(a|an|the|and)$/i.test(query)) continue;
        if (matches(entries, query).length) return { start: offset, end: end + rightWord.length, query, explicit: force };
      }
    }
    // The browse button inserts at the caret; it never deletes an unrecognized sentence.
    return force ? { start, end, query: '', explicit: true } : null;
  }
  function replacement(value, ctx, entry) {
    let end = ctx.end;
    // Completing in the middle of a multiword name must not leave a duplicate suffix.
    const current = normalize(value.slice(ctx.start, end).replace(/^\//, ''));
    const rest = value.slice(end);
    for (const alias of entry.aliases) {
      const term = normalize(alias);
      if (!current || !term.startsWith(current + ' ')) continue;
      const remaining = term.slice(current.length).trim().split(' ');
      const pattern = new RegExp('^\\s+' + remaining.join('\\s+') + '(?![a-z-])', 'i');
      const existing = rest.match(pattern);
      if (existing) { end += existing[0].length; break; }
    }
    let insert = entry.insert;
    // Add spacing for continued typing, but never disturb existing punctuation or whitespace.
    if (end === value.length) insert += ' ';
    else if (/^["“‘`]/.test(value.slice(end))) insert += ' ';
    if (ctx.start === ctx.end && ctx.start > 0 && /[\p{L}\p{N}]/u.test(value[ctx.start - 1])) insert = ' ' + insert;
    return { start: ctx.start, end, insert, value: value.slice(0, ctx.start) + insert + value.slice(end) };
  }

  function install(root) {
    if (root.__dlsAutocomplete) return root.__dlsAutocomplete;
    const doc = root.document;
    const entries = catalog(root.DLSComponentPreview?.registry);
    const behaviors = behaviorCatalog();
    if (!doc || !entries.length) return null;
    const popup = doc.createElement('div');
    popup.id = 'dls-component-suggestions'; popup.className = 'component-suggestions'; popup.hidden = true;
    popup.innerHTML = '<div class="cs-heading"><strong>Components</strong><span class="cs-count"></span></div><div class="cs-options" id="dls-component-options" role="listbox" aria-label="Components"></div><p class="cs-empty" hidden>No matching components. Keep typing or press Esc.</p><div class="cs-footer"><span>↑ ↓ choose · Enter insert · Esc close</span><span>Type / to browse</span></div>';
    const list = popup.querySelector('.cs-options');
    const live = doc.createElement('div');
    live.className = 'cs-sr-only'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
    const help = doc.createElement('div');
    help.id = 'dls-component-autocomplete-help'; help.className = 'cs-sr-only';
    help.textContent = 'Component suggestions are available. Type a component name, slash, or press Control Space to browse. Use Up and Down, then Enter to insert. Escape closes. Tab moves to the next field.';
    const behaviorHelp = doc.createElement('div');
    behaviorHelp.id = 'dls-behavior-autocomplete-help'; behaviorHelp.className = 'cs-sr-only';
    behaviorHelp.textContent = 'WHEN defines an interaction or event. Type click, hover, focus, type, or submit; use slash or Control Space to browse behaviors. Use Up and Down, then Enter to insert. Escape closes. Tab moves to the next field. This defines the trigger; THEN describes its outcome.';
    doc.body.append(popup, live, help, behaviorHelp);
    let activeField = null, options = [], activeIndex = -1, currentContext = null;
    let composing = false, committing = false, pointerInPopup = false, frame = 0;
    const enhanced = new WeakSet();
    function announce(message) { live.textContent = message; }
    function browseButton(field) { return field?.parentElement?.querySelector('[data-component-browse]'); }
    function close() {
      popup.hidden = true;
      if (activeField) {
        activeField.removeAttribute('aria-activedescendant');
        browseButton(activeField)?.setAttribute('aria-expanded', 'false');
      }
      activeIndex = -1; options = []; currentContext = null;
    }
    function position() {
      if (popup.hidden || !activeField) return;
      if (!activeField.isConnected) { close(); return; }
      const rect = activeField.getBoundingClientRect();
      for (let parent = activeField.parentElement; parent && parent !== doc.body; parent = parent.parentElement) {
        if (/(auto|scroll|hidden)/.test(root.getComputedStyle(parent).overflowY)) {
          const clip = parent.getBoundingClientRect();
          if (rect.bottom <= clip.top || rect.top >= clip.bottom) { close(); return; }
        }
      }
      const viewport = root.visualViewport;
      const leftEdge = viewport?.offsetLeft || 0, topEdge = viewport?.offsetTop || 0;
      const width = viewport?.width || root.innerWidth, height = viewport?.height || root.innerHeight;
      if (rect.bottom < topEdge || rect.top > topEdge + height) { close(); return; }
      popup.style.width = Math.min(420, Math.max(280, rect.width), width - 24) + 'px';
      popup.style.left = Math.max(leftEdge + 12, Math.min(rect.left, leftEdge + width - popup.offsetWidth - 12)) + 'px';
      const below = topEdge + height - rect.bottom - 12, above = rect.top - topEdge - 12;
      const openAbove = below < 210 && above > below;
      const available = Math.max(100, openAbove ? above : below);
      list.style.maxHeight = Math.max(44, Math.min(280, available - 74)) + 'px';
      popup.style.top = Math.max(topEdge + 8, Math.min(openAbove ? rect.top - popup.offsetHeight - 6 : rect.bottom + 6, topEdge + height - popup.offsetHeight - 8)) + 'px';
    }
    function queuePosition(event) {
      if (event?.target?.nodeType && popup.contains(event.target)) return;
      if (!frame) frame = root.requestAnimationFrame(() => { frame = 0; position(); });
    }
    function setActive(index) {
      activeIndex = index;
      const rows = list.querySelectorAll('[role="option"]');
      rows.forEach((row, i) => row.setAttribute('aria-selected', String(i === index)));
      if (index >= 0 && rows[index]) {
        activeField.setAttribute('aria-activedescendant', rows[index].id);
        rows[index].scrollIntoView({block: 'nearest'});
      } else activeField?.removeAttribute('aria-activedescendant');
    }
    function open(field, force = false) {
      if (composing || committing || field.disabled || field.readOnly) return;
      const kind = suggestionKind(field.dataset.intentType);
      const choices = catalogForIntent(field.dataset.intentType, entries, behaviors);
      const plural = kind === 'behavior' ? 'Behaviors' : 'Components';
      const ctx = context(field.value, field.selectionStart, field.selectionEnd, choices, force);
      if (!ctx) { close(); return; }
      const found = matches(choices, ctx.query);
      if (!found.length && !ctx.explicit) { close(); return; }
      if (activeField !== field) close();
      activeField = field; currentContext = {...ctx, snapshot: field.value}; options = found;
      popup.dataset.suggestionKind = kind;
      popup.querySelector('.cs-heading strong').textContent = plural;
      list.setAttribute('aria-label', plural);
      popup.querySelector('.cs-empty').textContent = `No matching ${plural.toLowerCase()}. Keep typing or press Esc.`;
      popup.querySelector('.cs-count').textContent = ctx.query ? `${found.length} of ${choices.length}` : String(choices.length);
      list.innerHTML = found.map((entry, index) => {
        const detail = entry.description || entry.aliases.filter(alias => normalize(alias) !== normalize(entry.insert)).slice(0, 3).join(' · ');
        return `<div class="cs-option" id="dls-component-option-${index}" role="option" aria-selected="false" data-component-index="${index}"><span class="cs-component-mark" aria-hidden="true">${kind === 'behavior' ? '↳' : '◇'}</span><span class="cs-option-copy"><strong>${escape(entry.label)}</strong><small>${escape(detail || entry.type)}</small></span><span class="cs-category">${escape(entry.category)}</span></div>`;
      }).join('');
      popup.querySelector('.cs-empty').hidden = found.length > 0;
      popup.hidden = false; list.scrollTop = 0; setActive(-1); position();
      browseButton(field)?.setAttribute('aria-expanded', 'true');
      announce(`${found.length} ${kind} suggestions. Use Up or Down, then Enter to insert.`);
    }
    function choose(index) {
      const field = activeField, ctx = currentContext, entry = options[index];
      if (!field?.isConnected || !ctx || !entry || composing) return;
      if (field.value !== ctx.snapshot) { close(); return; }
      const change = replacement(field.value, ctx, entry);
      committing = true;
      field.focus({preventScroll: true}); field.setSelectionRange(change.start, change.end);
      let sawInput = false;
      const observed = () => { sawInput = true; };
      field.addEventListener('input', observed);
      try {
        // Native insertion keeps the browser undo stack. setRangeText is the safe fallback.
        let inserted = false;
        try { inserted = doc.execCommand('insertText', false, change.insert); } catch (_) { /* fallback below */ }
        if (!inserted && field.value !== change.value) field.setRangeText(change.insert, change.start, change.end, 'end');
        if (!sawInput) field.dispatchEvent(new root.Event('input', {bubbles: true}));
      } finally {
        field.removeEventListener('input', observed); committing = false;
      }
      close(); announce(`${entry.label} inserted.`);
    }
    function enhance() {
      doc.querySelectorAll(fieldSelector).forEach(field => {
        if (enhanced.has(field)) return;
        enhanced.add(field);
        // Retain native multiline textbox semantics; focus stays here while navigating the listbox.
        field.setAttribute('aria-autocomplete', 'list'); field.setAttribute('aria-haspopup', 'listbox');
        field.setAttribute('aria-controls', list.id);
        const kind = suggestionKind(field.dataset.intentType);
        const fieldHelp = kind === 'behavior' ? behaviorHelp : help;
        field.setAttribute('aria-describedby', `${field.getAttribute('aria-describedby') || ''} ${fieldHelp.id}`.trim());
        if (kind === 'behavior') field.setAttribute('placeholder', 'Choose a behavior: click, hover, focus, type, submit…');
        const button = doc.createElement('button');
        button.type = 'button'; button.className = 'component-browse'; button.dataset.componentBrowse = '';
        button.dataset.suggestionKind = kind;
        button.textContent = kind === 'behavior' ? '+ Behavior' : '+ Component';
        button.setAttribute('aria-label', `Insert ${kind} in ${field.dataset.intentType || 'intent'}`);
        button.setAttribute('aria-haspopup', 'listbox'); button.setAttribute('aria-controls', list.id); button.setAttribute('aria-expanded', 'false');
        field.parentElement.classList.add('has-component-completion');
        field.parentElement.insertBefore(button, field);
        button.addEventListener('click', () => { field.focus({preventScroll: true}); open(field, true); });
      });
      if (activeField && !activeField.isConnected) { close(); activeField = null; }
    }
    doc.addEventListener('focusin', event => { if (event.target.matches(fieldSelector)) open(event.target); });
    doc.addEventListener('input', event => {
      if (!event.target.matches(fieldSelector) || committing) return;
      if (event.isComposing || composing) { close(); return; }
      open(event.target);
    });
    doc.addEventListener('compositionstart', event => { if (event.target.matches(fieldSelector)) { composing = true; close(); } });
    doc.addEventListener('compositionend', event => {
      if (!event.target.matches(fieldSelector)) return;
      composing = false; root.queueMicrotask(() => { if (doc.activeElement === event.target) open(event.target); });
    });
    doc.addEventListener('keydown', event => {
      const field = event.target;
      if (!field.matches(fieldSelector) || composing || event.isComposing || event.keyCode === 229) return;
      if ((event.ctrlKey || event.metaKey) && event.code === 'Space') { event.preventDefault(); open(field, true); return; }
      if (event.altKey && event.key === 'ArrowDown') { event.preventDefault(); open(field, true); return; }
      if (popup.hidden || field !== activeField) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
      if (event.key === 'Tab') { close(); return; }
      if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) { close(); return; }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!options.length) return;
        event.preventDefault();
        setActive(activeIndex < 0 ? (event.key === 'ArrowDown' ? 0 : options.length - 1) : (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
      } else if (event.key === 'Enter' && activeIndex >= 0) { event.preventDefault(); choose(activeIndex); }
      else if (['Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) close();
    }, true);
    doc.addEventListener('click', event => { if (event.target.matches(fieldSelector)) open(event.target); });
    popup.addEventListener('mousedown', event => { if (event.target.closest('[role="option"]')) event.preventDefault(); });
    popup.addEventListener('click', event => {
      const row = event.target.closest('[data-component-index]');
      if (row) choose(Number(row.dataset.componentIndex));
      pointerInPopup = false;
    });
    doc.addEventListener('pointerdown', event => {
      pointerInPopup = popup.contains(event.target);
      if (!pointerInPopup && event.target !== activeField && !event.target.closest('[data-component-browse]')) close();
    });
    doc.addEventListener('pointerup', () => root.setTimeout(() => { pointerInPopup = false; if (activeField && doc.activeElement !== activeField) close(); }, 0));
    doc.addEventListener('pointercancel', () => { pointerInPopup = false; if (doc.activeElement !== activeField) close(); });
    doc.addEventListener('focusout', event => {
      if (event.target.matches(fieldSelector)) root.setTimeout(() => { if (!pointerInPopup && doc.activeElement !== activeField) close(); }, 0);
    });
    root.addEventListener('blur', () => { composing = false; close(); });
    doc.addEventListener('scroll', queuePosition, true); root.addEventListener('resize', queuePosition);
    root.visualViewport?.addEventListener('resize', queuePosition); root.visualViewport?.addEventListener('scroll', queuePosition);
    const observer = new root.MutationObserver(records => {
      if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 && (node.matches(fieldSelector) || node.querySelector(fieldSelector))))) enhance();
    });
    observer.observe(doc.getElementById('app') || doc.body, {subtree: true, childList: true});
    enhance();
    const controller = { catalog: entries, behaviors, close };
    root.__dlsAutocomplete = controller;
    return controller;
  }
  return { catalog, behaviorCatalog, suggestionKind, catalogForIntent, matches, insideQuote, context, replacement, install };
});
