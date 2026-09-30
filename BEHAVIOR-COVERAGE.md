# DLS Magician behavior coverage

Product: https://dlsmagician.empathie.ai/
Behavior demos: https://dlsmagician.empathie.ai/behavior-lab.html

This is a bounded prototype vocabulary, not a claim to implement every possible software behavior. The original editor remains the authoring interface. The lab supplies 60 examples using the same renderer and runtime as the editor.

## Executable interface outcomes

| Family | Outcomes |
| --- | --- |
| Visibility | Show, hide, toggle a named component |
| Disclosure | Open/close dialog and menu, expand/collapse accordion |
| Control state | Enable/disable, check/uncheck, switch on/off |
| Values | Set input/textarea/select/date/slider value, clear field |
| Content | Update displayed text or button label |
| Focus | Focus/blur an input or control |
| Forms | Native submit, validation of required/type constraints, reset initial values, explicit validation message |
| Feedback | Tooltip, status message, busy state, progress |
| Composition | Multiple outcomes separated by semicolons or AND; quoted semicolons preserved |

Supported event vocabulary: click/tap, double click, right click, hover/pointer enter, pointer leave, focus, blur, input, change, select, check, uncheck, toggle, key down/up, Enter, Escape, submit, reset, drag start, drag over, drop, scroll, load.

Specify the target label when multiple instances exist, e.g. `WHEN click the button labeled "Run"` and `THEN update the input labeled "Name" value to "Ada"`. Incompatibilities, unrecognized rules, missing parameters, and ambiguous targets are shown as notices rather than silently reported as executed. Individual WHEN blocks bind to subsequent THEN/AND blocks up to the next WHEN. A generated preview instance resets when the authoring text or design system causes a re-render.

Tooltips close on pointer/focus leave and Escape. Dialogs have a close control. Showing an existing target prepares it hidden unless that would also hide its own trigger or it is an accordion. Drag/drop handles event responses only; moving/reordering items and file handling are not implemented. Progress is an explicit value, not an upload measurement. Toast feedback is a status region rather than an auto-dismiss notification service. Setting a value does not dispatch another event chain. Load effects run once per rendered instance.

## Explicit simulations

Navigation displays its intended destination without navigating the editor away. Save, delete, login/logout, upload/download, fetch, search/sort/filter, undo/redo display a labeled simulation message. They do not make requests, persist state, implement data transformations, download files, or authenticate. Actual implementations require product-specific data and backend connections.

## Outside this iteration

Real server actions, authorization, CRUD, persistence, async success/failure, routing history, list transformations, drag reordering, gestures, animation timelines, media playback, clipboard, device APIs, and chained conditional workflows remain unimplemented. These can be added as separate adapters with explicit data contracts.

## Validation

484 Node tests pass across the full repository, including 79 new outcome/interaction tests. New tests cover 60 example compilations, safe destinations, unknown effects, unique targeting, quoted values, multiple effects, rendering semantics, tooltip regression, and autocomplete. Browser checks cover dialog opening/closing, visibility, control enable/disable, values and selected options, switch state, content updates, progress, form validation/reset, input/keyboard events, multiple effects, and labeled simulation feedback. Compilation tests are distinct from browser execution checks.
