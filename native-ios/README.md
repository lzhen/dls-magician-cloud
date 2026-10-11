# DLS Magician native iOS

SwiftUI owns authentication, workspace navigation, project creation, structured GIVEN/WHEN/THEN editing, raw source, saving/recovery, sharing and comments. Bundle ID is `design.zhenli.dlsmagician`; minimum iOS is 16. Existing gradient theme and hat assets are preserved.

## Prototype workflow

Intent and Preview operate on one draft. Interface, Flow and JSON use the same compiled snapshot. DLS, Material and Ant are built-in HTML style mappings, not imports of the original component libraries. System selection is local to this device, user and project; it is not sent in the source-save API. Changing it resets temporary preview interaction state.

Only the interactive prototype canvas uses WKWebView. It renders bundled local assets, uses nonpersistent storage, receives no authentication token and cannot navigate to remote pages. CSP denies network requests, external images and form submissions. Native navigation never loads the website. Asset origin and hashes are recorded in `DLSMagician/PreviewAssets/provenance.json`.

Non-component intents use the original Web workflow renderer. Parsing recognizes trimmed, case-insensitive headings and extracts the same ordered entities as Web; 15 independently generated production golden cases cover seed workflows, whitespace, boundaries and incomplete input. Regenerate fixtures with `node scripts/generate_web_corpus.cjs <production-checkout>` and legacy assets with `python3 scripts/extract_web_legacy.py <production-checkout>` at the provenance commit.

Unsent comments and membership drafts require explicit discard before closing. Status, design-system and help text respect the full accessibility text-size range within scrolling content.

Incomplete drafts can be saved. Local drafts preserve their original server revision. A 409 retains the local text and requires explicit manual reconciliation; there is no automatic merge. Share/Comments first save unsaved source and refresh permissions. Existing server endpoints remain authoritative. Copying a project link grants no access. Adding membership sends no email. Comments are flat, position-labeled entries with Resolve/Reopen, not threaded replies. Unknown write results require refresh before retry.

## Validation

Generate the Xcode project with `python3 scripts/generate_project.py`. Run `python3 scripts/validate_project.py` and `python3 scripts/generate_theme.py --check`. Run `node scripts/api-contract.test.cjs <production-checkout>` for the isolated server contract; it creates temporary SQLite fixtures, uses only local mock authentication and does not inherit production environment variables. The exact Supabase dependency resolution is retained. Use existing cached packages when available.

Build and test using Xcode with an available iPhone simulator. Simulator Keychain tests require ad-hoc signing (`CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- DEVELOPMENT_TEAM=`). The DEBUG-only editor fixture intercepts every API request and uses synthetic identities; Release excludes its implementation and activation route. Unit tests cover source preservation, deterministic preview output, API payloads, roles, draft recovery and collaboration revisions. UI tests cover interactive preview, source save, sharing/comments, denied Viewer actions, 409 recovery, offline restoration and largest-text landscape layout.

## Distribution boundaries

Local simulator tests do not prove real-provider login, installation on a physical iPhone or production writes. The existing Xcode Cloud workflow on `native/dls-swiftui-20261010` archives this native project and distributes to the existing internal TestFlight group. Never substitute old Capacitor build 4.

Public App Store submission still requires verified account-deletion backend availability, login-policy compliance, applicable UGC safeguards, accurate privacy disclosures, reviewer access and approved screenshots/contact details. The client deletion candidate is not proof its backend is deployed. This change does not modify production services, authentication providers, credentials, membership data or spending limits.
