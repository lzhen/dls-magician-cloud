# DLS Magician: native iOS first slice

This is an isolated SwiftUI app, not a website wrapper. Open `DLSMagician.xcodeproj`; the existing Capacitor project and deployed web files were not edited. The application bundle ID remains `design.zhenli.dlsmagician`.

## Current web UI alignment

The native views now reuse the current web design system from the verified `a401210` CSS, including its final overrides. `DesignSystem/tokens.json` is a byte-identical copy of the shared canonical cross-platform tokens. `scripts/generate_theme.py` generates `DLSTheme.swift`; use `--check` to reject token/adapter drift. Project generation also derives the accent asset from these tokens.

Implemented mappings include charcoal/warm-light surfaces, off-white primary actions in both themes, neutral Microsoft-before-Google provider rows, centered 30-point Georgia welcome text, the black hat tile and sans-serif brand lockup, 14-point-radius project cards, real status/accent metadata, and a bordered monospaced workflow pane. Email expands beneath the same magic-link row used by the website. Existing unsupported functions were not added as inert buttons.

The gradient correction restores the web’s responsive sign-in background (violet radial glow at mobile dark widths, the later warm light override), exact translucent auth-card stops, and project-card gradient with the correct per-accent glow colors, 160-point circle, offsets, blur and opacity. Reusable gold-action, dashboard-hero and avatar gradient definitions are generated from the same tokens; they do not add new product features. Neutral providers and generic primary actions retain their original source treatment. Account uses the source 22-point regular Georgia heading in the native navigation bar, a circular gradient avatar with the signed-in user’s actual initials/color, and the white full-width sign-out style. Its existing sign-out operation and support links are unchanged.

CSS layer order, stop locations and angles are preserved. The adapter computes linear endpoints and farthest-corner radial sizes from each rendered rectangle; width <= 760 selects the source mobile auth role. SwiftUI color interpolation, blur and compositing still need side-by-side device validation. The desktop two-column auth panel and shell lighting are outside this single-card native slice.

Native adaptations are explicit: scalable system UI fonts, 44-point minimum touch targets, native navigation/search/keyboard, a single column at accessibility text sizes, and the canonical stronger editable-field outline. Native status text uses readable semantic text with the original accent dot/border. The source CSS includes very small desktop text; these native adaptations do not change the public website. No pixel-perfect or simulator-rendered result is claimed without an Xcode/device run.

Authentication, Keychain, URL validation, API transport, role checks, drafts, session state and conditional-save logic were preserved byte for byte during this styling pass. The only model additions are optional `ProjectSummary.accent` and `WorkspaceUser.color`, read from existing API fields to preserve project-card and account-avatar colors. No permission, session or save field changed.

## What is implemented

- Native sign-in screen with the exact approved DLS hat asset and adaptive gold accent.
- Google and Microsoft OAuth through Apple's `ASWebAuthenticationSession`, with Supabase's official Swift Auth SDK pinned to 2.55.3. Email links use the same PKCE callback and must be opened on the originating device within the app's ten-minute attempt window.
- Keychain persistence for session, PKCE verifier and pending attempt. Data uses `AfterFirstUnlockThisDeviceOnly`, with no cross-app access group. Credentials and callback URLs are never logged.
- Callback scheme, host and path validation; authorization starts only at the existing Supabase project's HTTPS authorize endpoint. Token fragments and token query values are rejected. Duplicate callbacks, expired attempts, cancelled-session callbacks and exchange/sign-out races are guarded.
- Restored sessions are refreshed by the SDK, then checked against the real `/api/session` and `/api/bootstrap` before showing a workspace. An unavailable backend never becomes a simulated login.
- Native workspace/project list, search, pull-to-refresh, project-only invitation support and an honest empty-access state.
- Native workflow editor with role-aware editing, explicit Save, recoverable on-device drafts, confirmation before leaving with edits, and server-generated output. PATCH is only sent after re-reading the project and current access. Drafts remain after errors.
  Editing requires project ownership or exactly one explicit project Admin/Editor membership. Workspace-admin-only access remains read-only; unknown or duplicate project roles never grant editing.
- Account view, external privacy/help links and device sign-out. External pages use the system browser; app screens use SwiftUI.

## Source provenance

- Production API/web source: `lzhen/dls-magician-cloud` branch `supabase-auth-protected-routes`, commit `a401210ff9339ae1109afb17a4dc630ddfe20dcd`.
- Installed build's wrapper/branding baseline: commit `11462f3d290aeca3f338c5919ff0e628f3cff42d`.
- Approved 1024px hat PNG Git blob: `ae2c562a2dc73bc5c0d8bdd72a876c3492593993`.
- Actual live `app.js` Git blob: `06a2e97387c5653fc92460912566efa4e7b09611`; SHA-256 `e1b95f965a399f3f8b26e79da0a6edeb2d4c31165b822ef1ed8499de13addfbc`.
- Supabase Swift 2.55.3: commit `9c8c9d283b13a369f52cc78d8639648d8a17f5d3`. Only its `Auth` product is linked.
- The project generator, not a hand-maintained hidden setup, lists all source files and targets. Running `python scripts/generate_project.py` regenerates the project and asset catalogs deterministically.

## Simulator compile workflow

The isolated `.github/workflows/dls-swiftui-check.yml` runs only for `lzhen/dls-magician-cloud` on `native/dls-swiftui-20261010`, using the standard `macos-15` runner, Xcode 16.4, read-only repository permissions and a 30-minute limit. It resolves the pinned SDK, builds an unsigned simulator app, runs unit/UI tests, and retains logs, the generated package resolution and real test captures. It does not sign, archive or deploy. The runner versions were checked against the [official runner image inventory](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-Readme.md).

`DLSMagicianUITests/LoginSmokeTests.swift` launches the actual app on a fresh simulator, requires the real public configuration request to reach login, captures the login view, then expands the empty email form. It performs no OAuth, sends no email and injects no authenticated state. A network/configuration outage is a test failure, not a simulated pass. CI needs only `native-ios/` and the new workflow, not this investigation’s sibling source snapshots. CI results remain pending until the parent publishes and runs the branch.

## Required configuration, not changed here

1. Approve and add exactly `design.zhenli.dlsmagician://auth/callback` to the existing Supabase project's Auth Redirect URLs. Existing web redirect URLs stay in place. No wildcard is needed.
2. Verify the already-configured Google and Azure providers remain enabled. Their provider-console callback remains the Supabase callback, `https://vxlwnvwijnzimjvgpeug.supabase.co/auth/v1/callback`; this native scheme is a Supabase redirect destination, not a replacement provider-console callback.
3. Verify the existing email template follows the Supabase redirect so PKCE email links return to this scheme. No template or provider configuration was changed.
4. On a Mac, resolve the pinned Swift package, compile and run simulator/device tests, then choose the authorized signing/build settings. This candidate uses the existing team ID from the prior project but creates no signing credentials or profiles.

Universal Links could further improve link ownership and email handoff, but require associated-domain configuration and a verified AASA file. This first slice uses an exact registered custom scheme with PKCE and the system authentication session. Another app intercepting a custom-scheme code cannot redeem it without this app's verifier.

## Validation

Executed on Linux:

- `node --test scripts/api-contract.test.cjs`: passed. Runs the inspected production server in a temporary directory, with an explicitly local test identity fixture. Covers unauthenticated rejection, real session/bootstrap/detail shapes, PATCH persistence and parsed output, and the absent deletion endpoint. It does not authenticate a real user or mutate production.
- `python scripts/validate_project.py`: five checks passed. Verifies source inclusion/build-phase references, target/scheme/callback configuration, exact approved icon, and Git blob hashes for the production snapshot.
- `python scripts/generate_theme.py --check`: passed. The SwiftUI theme matches the canonical design tokens.
- `python scripts/validate_theme.py`: four source checks passed for generated gradient fidelity, source CSS values, actual view placement and protected behavior hashes. These are source checks, not rendered native tests.

Not executed here:

- Xcode/Swift compilation, Swift package dependency resolution nine unit XCTest methods in `NativeContractTests.swift`, and one UI smoke test in `LoginSmokeTests.swift`.
- ASWebAuthenticationSession on device, Google/Microsoft/email success, cancel/retry, background/cold launch, token refresh, Keychain failure and sign-out during exchange.
- VoiceOver, Dynamic Type, keyboard/safe-area/iPad runtime checks or signed archive/TestFlight upload.

The cloud environment has no Swift toolchain, Xcode or iOS SDK. Static checks are not a compiled-app pass. The SPM version is exact; `Package.resolved` must be generated and committed after the first real Xcode resolution, rather than manufacturing a resolved transitive lockfile.

Suggested Mac checks from this directory:

```
xcodebuild -resolvePackageDependencies -project DLSMagician.xcodeproj -scheme DLSMagician
xcodebuild -project DLSMagician.xcodeproj -scheme DLSMagician -destination 'generic/platform=iOS Simulator' build CODE_SIGNING_ALLOWED=NO
xcodebuild -showdestinations -project DLSMagician.xcodeproj -scheme DLSMagician
# Select an available simulator ID from the previous command:
xcodebuild -project DLSMagician.xcodeproj -scheme DLSMagician -destination 'platform=iOS Simulator,id=SIMULATOR_ID' test CODE_SIGNING_ALLOWED=NO
```

Minimum OS is iOS 16 because this implementation uses native `NavigationStack` and the current Auth SDK. The earlier wrapper targeted iOS 15. The user accepted the iOS 16 minimum on 2026-10-10. Current Supabase Swift requires Swift 6.1-capable Xcode; the app itself is compiled in Swift 5 language mode.

## Release gates and limits

- The existing production API had insufficient project authorization. The separate reviewed authorization candidate must be resolved before exposing this client to users. UI role checks do not secure a backend.
- Account deletion is absent from the API. This preview says so explicitly; there is no fake deletion action. This is an App Store readiness gap.
- Supabase custom-scheme allowlisting and real-provider/device validation are still pending. A native source candidate does not prove sign-in works in TestFlight.
- Save sends `expectedUpdatedAt` along with the workflow. The separate reviewed backend candidate checks it atomically and returns 409 without changing the project when it is stale. Current production `a401210` ignores this extra field, so until that backend patch is deployed the native GET-before-PATCH check is only best effort and no lost-update guarantee is claimed. A 409 keeps the local draft.
- Comments, version history, sharing/member management, project creation and the web component-preview/editor feature set are outside this first slice. No new AI/LLM behavior was invented: generated workflow output comes from the existing deterministic API parser.
- The first slice refreshes the list on demand. It does not yet implement the web app's event stream/presence UI.
- Upgrading from the remote-origin wrapper requires signing in again. Browser/WebView sessions are not extracted or silently transferred to the native Keychain.
- API host, project issuer and callback are deliberately fixed to the verified existing service. A future backend move requires an explicit reviewed code/config update.

## Primary references

- [Supabase Swift OAuth](https://supabase.com/docs/reference/swift/auth-signinwithoauth)
- [Supabase Swift PKCE exchange](https://supabase.com/docs/reference/swift/auth-exchangecodeforsession)
- [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase native deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Apple ASWebAuthenticationSession](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession)
- [Supabase Swift 2.55.3 source](https://github.com/supabase/supabase-swift/tree/v2.55.3)
