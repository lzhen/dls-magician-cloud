# DLS native mobile layout

This update takes general native navigation patterns from the publicly observable ChatGPT app, with DLS branding and semantic colors. It is not an implementation of OpenAI private design tokens and does not turn the structured workflow editor into chat.

- Projects uses a single-column recent-project list: name first, description and status/time secondary. The new-workflow action sits in the bottom safe area; workspace choice and search remain available.
- The editor keeps Projects → Intent → Preview. Native capsule selectors, content-growing intent fields, restrained focus color and a full-width preview action replace the previous desktop-like rails. Share and comments share one clearly labeled navigation action; the preview keeps its existing design-system menu and Interface/Flow/JSON outputs.
- Shares, comments and Account retain native sheets/forms and existing dismissal/draft safeguards. Shared primary/secondary actions use a consistent capsule treatment. Colors come from DLSTheme; new DLSMobile values define our own 16pt inset/card radius, 44pt target minimum and 720pt reading width.
- Original transparent 3D hat assets, light/dark contrast and static noninteractive branding are retained. No ChatGPT assets or marks are included.

## Functional boundaries

No API, role, data model, preview renderer, authentication or production data changes. Preview and JSON use the same existing snapshot. Preview generation is synchronous and local: it has no new AI request or invented loading state. On compile failure, existing behavior clears the snapshot and preserves input; it does not retain/show an old result. Server opening/saving/collaboration keep existing loading, failure, refresh and conflict handling. Creation deliberately blocks repeat submission after an uncertain response and asks the user to refresh first, avoiding duplicate projects.

Sample workspace state is labeled as on-device. Actual cloud access still requires the existing account/workspace permissions. Tests use isolated fixtures and local sample data, not production projects.

## Release gates

Local Xcode16.4/Swift6.1.2 with iOS18.6 simulator cannot compile or execute the iOS26 toolbar glass-specific branch guarded by compiler>=6.2. A new-SDK build and newer-iOS inspection remain required; prior TestFlight13 predates this code. Manual VoiceOver, smallest-screen and newer-iOS appearance acceptance is not implied by unit/UI tests.

Pre-push checks completed after the user restored the Apple session: team allowance19h12m of25h available; exact task remainder17m30s (original1800s minus Builds6–13 totaling750s). Latest Cloud execution remains successfulBuild13 at02a7686 with no active DLS execution; remote release head matches. These checks authorize one existing-workflow build inside the remaining cap, without new credentials or permissions. Actual build/upload/TestFlight results must be recorded separately after completion.

Public App Store release also needs the separate account deletion, server-backed moderation, privacy and reviewer-access gates. The isolated store-safety preparation is not production-ready and is not merged here. Existing internal TestFlight status is not public release.

## Contrast check

Calculated from unchanged semantic token sRGB values: primary text on white 16.82:1; secondary text on white 8.25:1; muted text on white 5.52:1; secondary text on warm gray 7.56:1; dark primary text on dark surface 16.87:1. These checks cover these exact pairs, not a claim of a complete rendered accessibility audit.

## Local validation

Full existing suite:47unit tests and14UI tests passed, zero failures (evidence/native-layout-full.xcresult). Covers creation, Intent→Preview/Flow/JSON, design-system selection, keyboard, shares/comments, viewer/commenter restrictions,409 recovery, offline persistence, maximum DynamicType and landscape. After removing unused presentation helpers, final source compiled again and the sample creation/collaboration test passed with additional assertions that Account is hittable and opens beside the static brand (evidence/native-layout-account.xcresult). Existing internal test attachments were not exported or uploaded. No screenshots are deliverables.
