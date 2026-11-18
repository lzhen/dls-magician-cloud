# Empathie DOM adapter — review candidate 0.1.0

Use this adapter for existing native-JavaScript products. The existing React exports and PR #69 remain separate implementations; this adapter shares semantic token values and interaction requirements, not React APIs. It does not require a framework migration or assert Figma/code parity.

## Selection and defaults

| Need | Choose | Default behavior and reason | Avoid |
| --- | --- | --- | --- |
| One small edit with useful surrounding context | Inline form | Preserve the surrounding task; retain unfinished input when collapsed. | Opening a modal for every minor edit. |
| A bounded multi-field task before returning to the workspace | Modal Dialog | Focus the first useful field, contain Tab navigation, keep Cancel/Close/Escape available, restore trigger focus. DLS project creation is the first candidate. | A modal for a multi-step, navigable workflow. |
| Contextual information alongside a primary task | Non-modal panel | Keep the underlying task operable and expose a named close action. | Adding aria-modal without making the background inert. |
| A focused mobile task requiring platform navigation | Native sheet or page | Select with the platform and task; define draft retention and return navigation. Native adapters are not included here. | Treating every narrow-screen dialog as an implemented native sheet. |
| An immediate persistent boolean setting | Switch | Apply the setting immediately and expose its state. | Using a switch for task completion or form consent. |
| Selection, consent, or multiple choices | Checkbox | Space toggles; label expands the target; preserve mixed state when applicable. | Substituting a toggle button solely because it looks similar. |

## Exact API

Load `empathie-dom.css` after the product stylesheet and `empathie-dom.js` before the product entry point. The browser global is `EmpathieDOM`; CommonJS receives the same exports.

- `Button(nativeButton, { loadingLabel? })` returns `setLoading(boolean)` and `setDisabled(boolean)`. Native disabled state blocks activation. A meaningful label remains while pending; no anchor-as-button adapter exists.
- `Field(inputOrTextareaOrSelect)` requires a unique ID, associated visible label, and a persistent `<id>-error` element. Returns `setError(message?)`; existing hint descriptions are retained.
- `Dialog(nativeDialog, { onDismiss, returnFocus?, initialFocus?, fallbackFocus? })` returns `open()` and `destroy({ restoreFocus? })`. Native `showModal` supplies top-layer/inert behavior. Cancellation and backdrop pointer activation request product-owned dismissal. Tab and Shift+Tab stay within enabled visible controls.
- `AsyncForm(form, { submit, onSuccess, validate?, loadingLabel?, pendingMessage?, failureMessage? })` returns `pending` and `destroy()`. `submit(FormData)` returns a Promise; `validate(FormData)` returns field-name-to-message errors. Required children: one submit button, labeled fields with error elements, and already-mounted `[data-e-status]`/`[data-e-error]` live regions.

AsyncForm registers its own submit handler. Do not attach a second creation handler. Capture form values before disabling fields; guard duplicate activation before awaiting. Request failure preserves values and permits retry. `onSuccess` handles navigation separately from the request, so a failed refresh cannot be mislabeled as a failed creation. Destroy invalidates all outstanding UI effects; it does **not** cancel server work or guarantee request idempotency.

## DLS adoption candidate

Scope: dashboard and Projects “New project”, plus template-based creation. Product code owns template content, workspaces, category, API calls, draft retention, success navigation and authorization. The adapter owns button/field behavior, modal lifecycle and async submission protection. Existing sharing, history and account overlays are not migrated or certified.

Drafts are kept in memory separately for blank creation and each template. Closing retains input; active success clears that draft. Reloading or signing out clears it. Closing a pending form warns that creation can still finish and asks the user to check Projects before retrying. No automatic retry is performed.

The DLS application remains dark. The adapter provides light token overrides through `data-empathie-theme="light"` for future adoption; that does not establish a complete light product experience. Reduced motion disables this adapter's transitions and animations.

## Evidence and acceptance

The product PR runs syntax checks and jsdom tests against the actual application entry point for validation, duplicate submissions, failure/retry, close/reopen races, native cancellation callbacks, draft reset and template behavior. jsdom dialog methods are stubbed: these tests do not establish browser top-layer behavior, rendered contrast, mobile geometry or screen-reader speech. Browser observations must be recorded separately.

Suggested generation evaluation tasks are in `evaluation-tasks.json`. They are a proposed benchmark, not completed model runs. Do not report task count or behavior-test count as model-generation reliability.

## Known scope boundaries

- #66/#69 remain independently reviewable; this adapter does not merge or certify their React implementation.
- No npm package publication, product production release, native implementation or Figma mutation is implied.
- Shared Care tokens currently specify a 3-second fade; the 16 November review recorded a 6-second product fade. Preserve both until a product decision resolves the scope. This adapter changes neither.
- Voice, illustration, icon authorship and full expressive-system work remain subsequent work.

References: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog and https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/.
