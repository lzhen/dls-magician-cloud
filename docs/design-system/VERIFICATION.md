# DLS design-system adoption candidate — 18 November 2026

Scope: project creation from dashboard, Projects and templates, using the versioned Empathie native DOM adapter. This is a review candidate, not a production rollout.

## Observed automated results

- Eight Node tests passed: seven actual-entry-point DOM scenarios and one real-HTTP API integration scenario with an isolated temporary database.
- Covered required/whitespace validation and linked errors; pending feedback and synchronous duplicate protection; preserved input and retry after failure; dismissed success/failure versus reopened forms; native cancel callbacks, restored trigger focus and cleared successful drafts; template-specific content/drafts; background workspace refresh during submission; API authentication, validation, persistence, reads and static MIME types.
- Syntax checks passed for server, application and shared adapter.
- Four vendored files are checked against a source-commit/hash manifest. The canonical adapter separately verifies 16 semantic color-role mappings against the existing token export.

## Observed local Chrome interactions

- The browser opened the actual native modal; `dialog:modal` was present and background content was absent from its accessibility tree.
- Initial focus reached Project name. Empty submission showed an associated error and returned focus to that field.
- Shift+Tab wrapped from the first field through Close to Create project while staying inside the dialog.
- Escape restored focus to the creation trigger. Reopening retained the entered name and description.
- A real local API creation returned the new project and opened its editor. After the focus refinement and refreshed versioned assets, focus reached `structured-editor`.
- A preview server restart invalidated the demo session: the resulting request failure left the form open with preserved input and an actionable warning. This is not a simulated backend-success test.

These observations cover a dark desktop browser. Mobile geometry, light product integration, reduced-motion behavior in a browser, screen-reader speech, iOS builds and production binary behavior remain unverified. Browser metadata-extension errors appeared in captured logs; they were not attributed to product source. No claim of a completely clean browser console is made.

## Scope boundaries

The DOM tests stub native showModal/close because jsdom lacks the top layer; browser observations above are separate. Closing invalidates UI effects but does not cancel server creation. Automatic retry and request idempotency are not implemented. Drafts last until reload/sign-out; they are not durable storage.

The five generation tasks are proposed and have not been run. The eight behavior/API tests are not a generation-quality score. Existing React PR #66/#69, other overlays, the remaining products and Figma publication are outside this candidate's verification.
