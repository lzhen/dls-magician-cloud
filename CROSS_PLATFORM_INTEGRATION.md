# Cross-platform integration staging

This branch was created from the current Railway production line (`supabase-auth-protected-routes`) so cross-platform work can be reconciled without changing the deployed branch.

## Verified branch situation

- Railway production currently follows `supabase-auth-protected-routes`.
- `main` contains 7 newer commits that include cross-platform delivery work.
- The production branch contains 86 commits that are not on `main`, including the current editor, behavior engine, component autocomplete/preview, tests, and production fixes.
- Therefore, `main` should not replace the production branch directly.

## Staged here

- Platform delivery documentation.
- A minimal Manifest V3 Chrome launcher shell.

## Still to reconcile from `main`

- Native Capacitor wrapper files under `mobile/`.
- Native CI build/release-check workflows.
- Native icon assets.

## Preserve from production

Do not overwrite the current production editor, auth/persistence, behavior runtime, PWA/legal implementation, or Railway serving configuration when integrating cross-platform files.

## Verification gate

Before any production branch change, rerun the existing component and behavior tests and perform a signed-in smoke test for standalone component generation, component autocomplete, click, and hover behavior.
