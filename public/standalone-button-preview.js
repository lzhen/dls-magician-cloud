/* Scope-aware button previews. Load after app.js; workflow rendering stays unchanged. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.DLSButtonPreview = api;
    api.install(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const placeholders = /^(?:describe (?:the triggering condition|the expected outcome|this step|the user and their goal)|add step details)[.…]*$/i;
  const quotes = /"[^"\n]*"|'[^'\n]*'|“[^”\n]*”|‘[^’\n]*’|`[^`\n]*`/g;
  const roots = /\b(?:buttons?|cards?|forms?|tables?|pages?|screens?|modals?|dialogs?|dashboards?|layouts?|menus?|lists?|inputs?|checkboxes?|toggles?)\b/gi;
  const text = value => String(value == null ? '' : value).trim();
  const clean = value => placeholders.test(text(value)) ? '' : text(value);
  const escape = value => text(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[char]);

  function buttonSpec(generated) {
    const steps = Array.isArray(generated && generated.steps) ? generated.steps : [];
    const context = steps.filter(step => step.type === 'GIVEN').map(step => clean(step.text)).join(' ').trim();
    if (!context) return null;
    // Inspect requested structure, never the project title or downstream outcomes.
    // A button that opens a dialog is still a button initially; a button IN a dialog is not.
    const description = context.replace(quotes, ' ')
      .split(/\b(?:when|on click|if clicked|that (?:opens?|shows?|displays?|triggers?|submits?|navigates?)|which (?:opens?|shows?|displays?|triggers?|submits?|navigates?))\b/i)[0]
      .replace(/\b(?:without|instead of|not (?:a|an|the|inside|in))\b[\s\S]*$/i, '');
    const requested = description.match(roots) || [];
    if (requested.length !== 1 || requested[0].toLowerCase() !== 'button') return null;
    if (/\b(?:two|three|multiple|several|[2-9]|\d{2,})\b/i.test(description)) return null;

    const explicit = context.match(/\b(?:label(?:led|ed)?|text|caption|named|called|says|reads)\s*(?:(?:is|of)\s+|[:=]\s*)?["'“‘`]([^"'”’`]+)["'”’`]/i);
    const quotedName = context.match(/["'“‘`]([^"'”’`]+)["'”’`]\s+button\b/i);
    const unquoted = context.match(/\b(?:labelled|labeled|named|called|says|reads)\s+([^,.;]+?)(?=\s+(?:and|with|that|which|when|on)\b|$)/i);
    const actionName = context.match(/\b(save|submit|cancel|continue|next|back|delete|confirm|send|search|sign in|log in|sign up)\s+button\b/i);
    const label = text((explicit || quotedName || unquoted || actionName || [null, 'Button'])[1]);
    return {
      label: label || 'Button',
      variant: /\b(?:secondary|outline|outlined)\b/i.test(description) ? 'secondary' : 'primary',
      disabled: /\bdisabled\b/i.test(description) && !/\b(?:not|never)\s+disabled\b/i.test(description)
    };
  }

  function enrich(generated) {
    const spec = buttonSpec(generated);
    if (!spec) return generated;
    return {
      ...generated,
      steps: generated.steps.map(step => ({ ...step, text: clean(step.text) })),
      scope: 'component',
      components: [{ type: 'Button', props: spec }],
      // WHEN/THEN are optional for a static component, not requirements to invent.
      valid: true
    };
  }

  function renderButton(spec, system = 'dls', expanded = false) {
    const variant = spec.variant === 'secondary' ? 'secondary' : 'primary';
    return `<div class="prototype-stage prototype-actions prototype-component-stage ds-${escape(system)}${expanded ? ' prototype-stage-expanded' : ''}" data-preview-scope="component" style="display:flex;align-items:center;justify-content:center;min-height:320px;padding:32px;background:transparent;box-sizing:border-box;">
      <button type="button" class="prototype-${variant}" data-component="Button"${spec.disabled ? ' disabled' : ''} style="font-family:var(--prototype-font);border-radius:var(--prototype-card-radius);${spec.disabled ? 'opacity:.5;cursor:not-allowed;' : ''}">${escape(spec.label)}</button>
    </div>`;
  }

  function install(root) {
    if (root.__dlsButtonPreviewInstalled) return;
    if (typeof root.parseStructuredLanguage !== 'function' || typeof root.renderGeneratedInterface !== 'function') {
      throw new Error('Load standalone-button-preview.js after app.js.');
    }
    root.__dlsButtonPreviewInstalled = true;
    const baseParse = root.parseStructuredLanguage;
    const baseRender = root.renderGeneratedInterface;
    root.parseStructuredLanguage = function (...args) { return enrich(baseParse.apply(this, args)); };
    root.renderGeneratedInterface = function (generated, expanded = false) {
      const spec = buttonSpec(generated);
      return spec ? renderButton(spec, typeof state === 'undefined' ? 'dls' : state.designSystem, expanded)
        : baseRender.apply(this, arguments);
    };

    function updateSummary() {
      if (typeof state === 'undefined' || !state.activeProject) return;
      const generated = root.parseStructuredLanguage(state.editorText, state.activeProject.name);
      const spec = buttonSpec(generated);
      const system = DESIGN_SYSTEMS[state.designSystem];
      const summary = root.document.querySelector('.output-system-summary');
      if (summary) summary.textContent = `${system.name} · ${spec ? '1 component' : `${designSystemComponents().length} components`}`;
      const subtitle = root.document.getElementById('preview-description');
      if (subtitle && spec) subtitle.textContent = `1 component · ${system.name}`;
    }

    // Queue until renderEditor/renderModal has inserted the returned markup.
    for (const name of ['renderOutput', 'renderPreviewModal']) {
      if (typeof root[name] !== 'function') continue;
      const original = root[name];
      root[name] = function (...args) {
        const result = original.apply(this, args);
        root.queueMicrotask(updateSummary);
        return result;
      };
    }
    root.queueMicrotask(function () {
      // Also handle an editor that finished loading before this deferred script.
      const preview = root.document.getElementById('generated-preview');
      if (preview && typeof state !== 'undefined' && state.activeProject && buttonSpec(root.parseStructuredLanguage(state.editorText))) {
        const parsed = root.parseStructuredLanguage(state.editorText, state.activeProject.name);
        preview.innerHTML = root.renderOutput(parsed);
        const validation = root.document.getElementById('validation-state');
        if (validation) { validation.className = 'validation-state valid'; validation.textContent = 'Valid'; }
      }
      updateSummary();
    });
  }
  return { buttonSpec, enrich, renderButton, install };
});
