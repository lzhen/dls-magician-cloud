/* Empathie DOM adapter 0.1.0. No framework or production dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EmpathieDOM = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function Button(element, { loadingLabel = 'Saving…' } = {}) {
    if (element.tagName !== 'BUTTON') throw new TypeError('Button requires a native button.');
    element.dataset.eComponent = 'Button';
    const original = element.innerHTML;
    let disabled = element.disabled;
    let loading = false;
    return {
      setDisabled(value) { disabled = Boolean(value); element.disabled = disabled || loading; },
      setLoading(value) {
        loading = Boolean(value);
        element.disabled = disabled || loading;
        if (loading) {
          element.setAttribute('aria-busy', 'true');
          element.textContent = loadingLabel;
        } else {
          element.removeAttribute('aria-busy');
          element.innerHTML = original;
        }
      }
    };
  }

  function Field(control) {
    if (!control.id || !control.labels?.length) throw new TypeError('Field requires an ID and associated visible label.');
    const error = control.ownerDocument.getElementById(`${control.id}-error`);
    if (!error) throw new TypeError('Field requires its persistent error element.');
    const descriptions = control.getAttribute('aria-describedby') || '';
    control.dataset.eComponent = 'Field';
    return {
      setError(message = '') {
        error.textContent = message;
        error.hidden = !message;
        control.setAttribute('aria-invalid', message ? 'true' : 'false');
        const ids = [descriptions, message ? error.id : ''].filter(Boolean).join(' ');
        if (ids) control.setAttribute('aria-describedby', ids);
        else control.removeAttribute('aria-describedby');
      }
    };
  }

  function Dialog(element, { onDismiss, returnFocus, initialFocus, fallbackFocus } = {}) {
    if (element.tagName !== 'DIALOG' || typeof element.showModal !== 'function') {
      throw new TypeError('Dialog requires native HTML dialog support.');
    }
    if (!element.getAttribute('aria-labelledby') && !element.getAttribute('aria-label')) {
      throw new TypeError('Dialog requires an accessible name.');
    }
    element.dataset.eComponent = 'Dialog';
    let disposed = false;
    let outsideStart = false;
    const dismiss = () => { if (!disposed) onDismiss?.(); };
    const cancel = (event) => { event.preventDefault(); dismiss(); };
    const outside = (event) => {
      const rect = element.getBoundingClientRect();
      return event.target === element && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
    };
    const pointerDown = (event) => { outsideStart = outside(event); };
    const pointerUp = (event) => { if (outsideStart && outside(event)) dismiss(); outsideStart = false; };
    const trap = (event) => {
      if (event.key !== 'Tab') return;
      const targets = [...element.querySelectorAll('button, input, textarea, select, a[href], [tabindex]')]
        .filter((node) => !node.disabled && node.type !== 'hidden' && node.tabIndex >= 0 && node.getClientRects().length && !node.closest('[hidden], [inert]'));
      const first = targets[0], last = targets[targets.length - 1];
      if (!first) { event.preventDefault(); return; }
      const active = element.ownerDocument.activeElement;
      if (event.shiftKey && (active === first || !targets.includes(active))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (active === last || !targets.includes(active))) { event.preventDefault(); first.focus(); }
    };
    element.addEventListener('cancel', cancel);
    element.addEventListener('pointerdown', pointerDown);
    element.addEventListener('pointerup', pointerUp);
    element.addEventListener('keydown', trap);
    return {
      open() { element.showModal(); initialFocus?.focus(); },
      destroy({ restoreFocus = true } = {}) {
        if (disposed) return;
        disposed = true;
        element.removeEventListener('cancel', cancel);
        element.removeEventListener('pointerdown', pointerDown);
        element.removeEventListener('pointerup', pointerUp);
        element.removeEventListener('keydown', trap);
        if (element.open) element.close();
        if (restoreFocus) {
          const target = returnFocus?.isConnected ? returnFocus : fallbackFocus?.();
          target?.focus();
        }
      }
    };
  }

  function AsyncForm(form, { submit, onSuccess, validate = () => ({}), loadingLabel = 'Saving…', pendingMessage = 'Saving…', failureMessage = 'Could not save. Your input is preserved. Try again.' }) {
    const button = Button(form.querySelector('[type="submit"]'), { loadingLabel });
    const controls = [...form.querySelectorAll('input:not([type="hidden"]), textarea, select')];
    const fields = new Map(controls.map((control) => [control.name, { control, field: Field(control) }]));
    const status = form.querySelector('[data-e-status]');
    const error = form.querySelector('[data-e-error]');
    if (!status || !error) throw new TypeError('AsyncForm requires pre-mounted status and error regions.');
    const disabled = new Map(controls.map((control) => [control, control.disabled]));
    let active = true, pending = false;
    const resetPending = () => {
      pending = false;
      button.setLoading(false);
      controls.forEach((control) => { control.disabled = disabled.get(control); });
      status.textContent = '';
    };
    const input = (event) => { fields.get(event.target.name)?.field.setError(); error.textContent = ''; };
    const handler = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!active || pending) return;
      const data = new form.ownerDocument.defaultView.FormData(form);
      const errors = validate(data);
      let firstInvalid;
      fields.forEach(({ control, field }, name) => {
        const message = errors[name] || (!control.checkValidity() ? control.validationMessage : '');
        field.setError(message);
        if (message && !firstInvalid) firstInvalid = control;
      });
      error.textContent = '';
      if (firstInvalid) { firstInvalid.focus(); return; }
      pending = true; // Synchronous guard before the first await.
      status.textContent = pendingMessage;
      button.setLoading(true);
      controls.forEach((control) => { control.disabled = true; });
      let result;
      try { result = await submit(data); }
      catch (_) {
        if (active) { resetPending(); error.textContent = failureMessage; }
        return;
      }
      if (!active) return; // Dismissed sessions cannot navigate or mutate a reopened form.
      resetPending();
      onSuccess(result);
    };
    form.noValidate = true;
    form.addEventListener('submit', handler);
    form.addEventListener('input', input);
    return {
      get pending() { return pending; },
      destroy() {
        active = false;
        form.removeEventListener('submit', handler);
        form.removeEventListener('input', input);
      }
    };
  }

  return Object.freeze({ version: '0.1.0', Button, Field, Dialog, AsyncForm });
});
