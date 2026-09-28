# WHEN behavior suggestions

## Change

WHEN now offers `+ Behavior` and a behavior-only autocomplete list instead of component names. GIVEN, THEN, and AND retain their existing component suggestions. Each behavior includes a short definition and category; the popup heading, count, empty state, placeholder, and accessibility help match the active field. Existing field contents are not migrated or rewritten.

The 24 authoring choices are Click (including tap aliases), Double click, Right click, Hover, Pointer leave, Focus, Blur, Type / input, Value change, Select, Check, Uncheck, Toggle, Key down, Key up, Press Enter, Press Escape, Submit, Reset, Drag start, Drag over, Drop, Scroll, and Load.

Type a prefix such as `cli` or `hov`; use `/`, Control-Space, or the browse button for the full list. Mouse/touch selection and Up/Down then Enter insert the choice. The existing caret-safe replacement, quote/URL protections, IME guard, Escape dismissal, Tab navigation, and native undo path remain in place. Selecting a behavior sends one input event through the existing preview-update/save-scheduling handler. Opening the list does not change text or schedule a save.

Examples: `cli the button` becomes `click the button`; `hov over the button labeled "Save"` becomes `hover over the button labeled "Save"`. Component targets and quoted labels are preserved. `switch` resolves to a Switch component in GIVEN and the Toggle behavior in WHEN.

This is an authoring-vocabulary change, not a behavior execution engine. It does not attach generated event listeners, interpret arbitrary WHEN/THEN instructions, perform backend actions, or modify authentication/persistence. The existing parser continues to receive the text entered in each intent field. The component renderer is unchanged.

Autocomplete JavaScript and CSS URLs in index.html use `?v=when-behaviors-1` so the prior service-worker asset cache does not reuse the previous autocomplete files for the new page.

## Verification actually run

- Node 22.16.0 syntax check passed.
- 164 Node tests passed: 86 unchanged component-autocomplete regression tests plus 78 new behavior tests; zero failures.
- 65 isolated Chromium browser checks passed; zero page JavaScript errors. This includes all 24 behavior choices, field-specific labels and catalogs, caret/target preservation, keyboard and mouse/touch insertion, one input event per acceptance, save-scheduling dispatch, undo, IME-event guards, quoted-text protections, empty states, rerenders without duplicate buttons, and viewports down to 390 x 340.
- Desktop and mobile screenshots were visually inspected.

The local run used the 35-entry component registry copied from the previously read production component-preview.js blob `1def672cab6e9d0862991de5d45526d6a70780e5`. The local registry-only fixture is not committed. The browser fixture reproduces intent-field markup and the relevant editor input-handler path, with output updates and save scheduling recorded locally. These are not full renderer tests, signed-in production tests, backend persistence tests, real-device keyboard/IME tests, or screen-reader certification. There were no network calls or saved-project mutations in these tests.

The old all-fields browser expectation was updated deliberately: WHEN inserts `hover`; the other three fields still insert `a slider`. All other prior autocomplete scenarios remain covered.

## Reproduce from the repository

```sh
node --check public/component-autocomplete.js
node --test tests/component-autocomplete.test.cjs tests/when-behavior.test.cjs
python tests/autocomplete-browser.py
```

The browser script requires Node, Python Playwright, and Chromium, with optional `CHROMIUM_PATH`. In the full repository it reads the real renderer registry directly. Generated screenshots are local test artifacts, not production screenshots.
