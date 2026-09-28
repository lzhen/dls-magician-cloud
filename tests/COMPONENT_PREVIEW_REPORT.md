# Intent-sized component previews

## Implemented behavior

A shared registry replaces the button-only adapter in the editor. All 35 registered preview types use the same scope rules: a single component stays standalone; a composition contains only the requested components; containers are rendered only when explicitly requested. The project title does not supply campaign content. GIVEN alone is sufficient for a static component. Placeholder WHEN/THEN instructions do not become labels or content.

Registered types: Button, Input, Textarea, Select, Checkbox, Radio, Switch, Slider, DatePicker, Upload, Card, Surface, Form, Layout, Dialog, List, Table, Tabs, Accordion, Alert, Badge, Avatar, Progress, Spinner, Tooltip, Divider, Heading, Text, Image, Breadcrumb, Pagination, Menu, Link, Icon, Skeleton.

This includes all component categories formerly named by the built-in output mappings, such as Status card, Select field, Inline insight, Paper, Layout, Field, and Message. Their aliases resolve to registry types.

## Examples

- `a checkbox labeled "Accept"`: one checkbox, no card.
- `a dropdown with options "Small", "Medium", "Large"`: one dropdown with those options.
- `an email input and a button labeled "Continue"`: two standalone components, no extra container.
- `a card with an input labeled "Email" and a button labeled "Save"`: a card containing those two controls; three component instances total.
- `a table with columns "Name", "Status"`: only that table, with an explicit no-data state rather than invented rows.
- `a button that opens a dialog`: initially only the button, not an already-open dialog. Arbitrary natural-language behavior execution is not implemented by this change.

Labels, placeholders, selected options, disabled/checked states, numeric slider/progress values, and specified list items/columns are parsed. Checkbox, switch, radio, select, range, tabs, accordion, tooltip, and dismissible dialog previews have local interactions. There are no simulated saves, automatic uploads, or claims that a backend action completed.

JSON exposes the requested component tree, actual instance count, and selected design-system reference bindings. The toolbar and expanded-preview count track the same tree. Compound anatomy, such as tabs within a tab group, is counted as one component; an explicitly nested input or button is a separate instance.

Unrecognized standalone requests receive a notice instead of an unrelated workflow. Recognized unsupported types in mixed requests are reported. The parser is a constrained alias/property parser, not a general natural-language model. Previews are limited to 20 component instances, with an explicit warning when capped.

## Verification performed

- Node 22.16.0 syntax check: passed.
- 205 unit tests: passed, zero failures.
- 228 local Chromium browser checks: passed, zero failures and no page JavaScript errors.
- Browser checks covered all 35 types across four design-system reference selections; output counts and JSON; common keyboard interactions; expanded-preview ID uniqueness; live input updates; nested compositions; HTML escaping; legacy workflow dispatch; and 390px viewport overflow checks in dark and light modes.
- A desktop composition screenshot was visually inspected.

The browser run used `tests/browser-fixture.html`, which reproduces the relevant production parser and output-dispatch functions. It is not a test of a signed-in production workspace, Supabase authentication, server persistence, or publishing. The legacy workflow renderer itself is represented by a fallback stub in this fixture. No WCAG conformance or screen-reader certification is claimed.

Tested source Git blob hashes, matched against the GitHub writes:

- `public/component-preview.js`: `1def672cab6e9d0862991de5d45526d6a70780e5`
- `public/component-preview.css`: `24230787061bd1e452cae7b9da82d3ec528b1648`

## Reproduce

```sh
node --check public/component-preview.js
node --test tests/component-preview*.test.cjs
python tests/browser-check.py
```

The browser check requires Python Playwright and Chromium. It uses `CHROMIUM_PATH`, an installed `chromium`, or Playwright's browser installation. It loads the fixture and source files into an isolated local page and does not sign in or edit saved projects. Generated test screenshots and JSON results are local test artifacts.

## Integration and limits

Load `component-preview.css` after `styles.css`, and `component-preview.js` after `app.js`. Remove the old `standalone-button-preview.js` script tag; do not install both adapters. The previous adapter and its tests remain in the repository for history, but are not used by the updated editor.

These are HTML/CSS component previews with DLS, Material UI, and Ant Design reference mappings, not native imports of every external library component. Connected-system styling is a local reference preview, not a newly implemented live MCP import. JSON explicitly marks `implementation: "html-preview"`. Extending the vocabulary requires adding a registry entry, a renderer, styles, and tests.
