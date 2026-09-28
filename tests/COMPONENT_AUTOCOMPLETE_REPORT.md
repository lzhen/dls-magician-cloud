# Component autocomplete

## Behavior

The structured-intent editor offers a searchable component list while typing in GIVEN, WHEN, THEN, and AND fields. The list is derived from `DLSComponentPreview.registry`: currently all 35 component types. Aliases such as dropdown, toggle, text field, and radio button are searched too. Each option shows its name, aliases and category.

Focus an empty field, type a component prefix, type `/`, press Control-Space, or use the new `+ Component` button to browse. Use Up/Down then Enter, or click/tap an option. Escape closes without changing text. Tab retains normal focus navigation and never accepts an option. Enter without a highlighted choice remains a newline. Only the component phrase near the caret is replaced, preserving surrounding text. There is no suggestion inside quoted labels or URLs; IME composition is not intercepted. The popup moves above/below the field to fit the viewport and is rendered outside clipping editor panes.

Native insertion preserves undo in the tested Chromium browser. A setRangeText fallback sends a single input event when native insertion is unavailable. The existing editor input handler remains responsible for preview updates and autosave; autocomplete makes no network calls itself and does not change persistence or authentication.

## Validation actually run

- Node 22.16.0 syntax check: passed.
- 86 Node unit tests: passed; zero failures.
- 27 isolated Chromium browser checks: passed; zero page JavaScript errors.
- Desktop and 390px mobile fixture screenshots were visually inspected.

Checks cover registry completeness, aliases, caret replacement, suffix preservation, quotes, keyboard selection, mouse/touch selection, undo, one input event per insertion, save-scheduling dispatch, IME events, fallback insertion, field rerenders, all four intent block types, clipping/scroll dismissal, and viewport sizes down to 390x340.

Local testing used the registry definitions extracted from the read production component-preview.js (blob `1def672cab6e9d0862991de5d45526d6a70780e5`). The browser fixture reproduces the editor's intent-field markup and input-handler path, recording preview updates and save scheduling with local counters. It does not authenticate, call the backend, or modify saved projects. These checks are not a signed-in production end-to-end test, real-device Safari/Firefox test, real keyboard-IME test, or screen-reader certification. Existing renderer tests were not rerun as part of this change.

Source hashes of tested new files:

- component-autocomplete.js: `7964c01d9540d0c66d6ffe65cff1105fd6f84f99`
- component-autocomplete.css: `7d58adf49c37306dd7dba6801c6dff457dcd8515`
- component-autocomplete.test.cjs: `21e4564044cb33702f846ebe0183e7917bcd0463`
- autocomplete-browser.py: `8cfbce184d40ed6d5351bb8788968b3f27bdfc8f`

## Reproduce

```sh
node --check public/component-autocomplete.js
node --test tests/component-autocomplete.test.cjs
python tests/autocomplete-browser.py
```

The browser script requires Python Playwright and Chromium, with an optional CHROMIUM_PATH. It reads the repository's real registry at runtime and loads an isolated fixture; screenshots are test artifacts. Load the autocomplete stylesheet after the existing styles and its script after component-preview.js. No source changes to app.js or component-preview.js are required.
