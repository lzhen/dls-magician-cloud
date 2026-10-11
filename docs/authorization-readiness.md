# DLS authorization: rebased local candidate

Date: 2026-10-10 UTC. Local only; no production deployment or release approval.

## Current source and provenance

- Repository: `lzhen/dls-magician-cloud`, authenticated branch `supabase-auth-protected-routes`.
- Exact production snapshot: `a401210ff9339ae1109afb17a4dc630ddfe20dcd`, supplied by the native release coordinator.
- This candidate rebases the prior October7 authorization review onto the current snapshot. Current server.js, storage.js and package.json are byte-identical to the prior base. Current public/app.js adds the approved accessible logo lockup; that change is preserved.
- The patch applied cleanly to the current snapshot; all other production public assets remain byte-identical. No old UI/assets replaced the current production files.
- Current role contract is in public/app.js: role descriptions and “Only explicitly invited people and workspace administrators can open this project.” The workspace-admin override is READ ONLY; the sentence does not establish edit or member-management inheritance.
- No real application records were read. All tests use disposable synthetic state and mocked Auth/HTTP; no credentials, provider settings, real grants, remote branches or deployment changed.

## Existing rules preserved

The client says: "Only explicitly invited people and workspace administrators can open this project"; sharing a URL does not grant access. Workspace non-admin membership therefore does not grant access to every project.

| Actor | Read project/history/presence | Edit/save/restore versions | Comment/review | Invite new collaborators | Change project roles |
|---|---|---|---|---|---|
| Project owner, explicit project Admin | Yes | Yes | Yes | Yes, including Admin | Yes |
| Workspace Admin without explicit project role | Yes | No | No | No | No |
| Explicit project Editor | Yes | Yes | Yes | Yes, non-Admin roles only | No |
| Explicit project Commenter | Yes | No | Yes | No | No |
| Explicit project Viewer | Yes | No | No | No | No |
| Other workspace member or outsider | No | No | No | No | No |

The owner remains an Admin; there is no ownership-transfer API in this branch. Workspace Admin/Editor may create projects in their own workspace. Only workspace Admin may modify the existing settings record. Unknown or duplicate membership roles fail closed. Comment review includes resolving comments, consistent with the existing review UI.

## Implemented changes

1. Scoped bootstrap workspaces, projects and activities. There is no global `users` response field or directory API in this branch. Nested profiles are returned only through accessible workspaces/projects/activity; the self-session response contains the current user's profile only. Unscoped legacy activity is visible only to its actor.
2. Project GET, all mutations, version restore, comments, sharing, role changes, presence and project SSE require access. Unknown/inaccessible projects return the same generic 404. Members without the required role receive 403. After asynchronous body parsing, mutations recheck current role and session expiry.
3. SSE packets are filtered per recipient using current membership and resource scope. Global subscriptions cannot receive arbitrary project packets. Project creation and workspace changes carry explicit scope; unscoped broadcasts default deny. Removed members receive no future packets; stale presence is removed. Project streams close on the next heartbeat after access removal. Expired tokens cannot receive packets and connections close on heartbeat.
4. Authenticated profile creation no longer auto-enrolls users as Editor in the first workspace. User-editable Auth metadata is used only for display names.
5. Identity is bound to a stable verified Supabase subject. Email alone cannot select a legacy local identity. Only an explicit new invitation placeholder with a confirmed email can be claimed. The claimed placeholder is bound once and loses its invitation marker. A changed, unverified email cannot acquire a new invitation grant. Conflicting mappings fail closed.
6. If a profile existed before its email was confirmed, a later confirmed login can consume an explicit, unused project invitation. This only handles new invitation placeholders: it never migrates legacy ownership, workspace membership or authored history, and never overwrites an existing explicit role. Share attempts against legacy email collisions return 409 for operator review; conflicting subject/invitation mappings fail closed with the existing generic server error path.
7. Client SSE reconnects after token refresh, outside the Supabase Auth callback. Denied project navigation clears stale editor content and does not render/subscribe. Older requests cannot overwrite a newer project route or a different account's view. These are narrow access-flow fixes, not onboarding work.
8. Project-only guests remain discoverable through dashboard/project lists even when their workspace list is empty. Project responses contain only the minimal associated workspace `id`, `name`, and `logo`, not its member directory.

## Verification performed

Environment: Node.js v24.19.0; repository requirement is Node >=22. No dependencies were installed. There is no repository lint/typecheck script in the source package.

- 80 server/authorization tests passed, with mocked Supabase responses, mocked HTTP server/timers, and disposable filesystem fixtures.
- 6 client-flow tests passed against the actual client script in a mocked DOM/VM environment.
- 2 unchanged storage regression tests passed.
- Total: **88 passed, 0 failed, 0 skipped**.
- JavaScript/CJS syntax checks and patch-apply checks are recorded separately in this bundle.
- No network sockets are opened by the authorization tests. Requests never reach Supabase or the production service. Fixture emails use `.invalid`; tokens have synthetic fixture signatures accepted only by the mocked verifier.
- Negative coverage includes unauthenticated/expired tokens, wrong workspace, same-workspace non-member, invalid/duplicate roles, every project route, nested profiles, activity, history, comments, presence, global/project SSE, revoked membership, invitation collisions, unconfirmed/changed email, attempted Admin escalation, owner demotion, and permissions/identity changing while a request body is delayed.

Run from a checkout after applying the candidate:

```sh
node --check server.js
node --check authorization.cjs
node --check public/app.js
node --test tests/*.test.cjs
```

These are focused synthetic tests, not real-browser, real-Supabase, production, native-device or App Store verification.

## Required rollout decisions and gates

### 1. Onboarding decision: keep invite-only, or authorize a separate personal-workspace feature

**Recommended for this existing model: invite-only.** Keep the secure default and approve the small no-access landing state before implementation/deployment. No onboarding UI is implemented by this candidate.

| State | Current source behavior | Proposed exact copy/flow for review |
|---|---|---|
| Signed in, no workspace/project grants | Automatically added to first workspace as Editor; dashboard offers "Create new project" | Heading: "You're signed in." Body: "Ask a workspace administrator to invite you, or open a project invitation link." Do not offer project creation without an eligible workspace. |
| Explicit project guest, no workspace membership | Project can be opened by link; broad APIs previously concealed this distinction | Keep shared projects accessible. Suggested section title: "Projects shared with you". Do not add workspace membership or reveal its directory. |
| User needs a personal new workspace | No workspace-creation API exists | Separate product/engineering scope requiring ownership, workspace creation, storage, and acceptance criteria. Not part of this candidate. |

The secure backend can return an empty workspace/project list today, but deploying that state with the unreviewed current dashboard is blocked. Existing create/settings/edit controls are not fully capability-aware; confirm the role-aware UI/empty state before public release. Do not restore the unsafe auto-grant to mask the UX gap.

### 2. Review historical membership provenance

The forward-only change does **not** audit, remove or validate historical membership grants. Existing first-workspace Editors may have originated from the prior automatic enrollment. Until a responsible operator reviews the origin and intended scope of existing grants, historical access and project-creation rights may remain. No bulk revocation, inference or real membership migration is included. Do not describe those existing grants as verified.

### 3. Resolve ambiguous legacy identities

Legacy records matched by email may not contain a trustworthy Supabase subject binding. A responsible operator must validate intended local-to-Auth identities before rollout and identify users who would lose access under subject-only matching. Do not infer ownership from matching emails, display names, `user_metadata`, or demo seed identities. This bundle contains no real mapping list or migration script.

### 4. Integrate with deletion and validate a staging build

- Account-deletion resolution must recognize a persisted `authUserId` as well as an identical local/Auth ID, and must stop on ambiguous legacy mappings. Coordinate this with the separate deletion candidate before either is shipped.
- Deletion/revocation must remove access in the same data snapshot that SSE checks. This candidate is not a deletion implementation.
- Rebase/apply only to the authenticated web branch after verifying its current SHA, retaining its existing Auth protection and storage behavior.
- With authorized disposable staging accounts, verify login, confirmed invitation, direct-guest navigation, role errors, token refresh during editing, revocation, account deletion and reconnect in a real browser. Review the service worker and cached client refresh on deployment.
- Obtain deployment authorization separately. No remote execution, commit, push, PR, CI or deploy occurred here.

## Remaining limits and separate security work

- `workspace.authProviders` is an app settings record. This patch restricts who may change it; it does **not** enforce Supabase provider selection, SSO or MFA policy. No provider/security configuration was changed.
- Supabase `/auth/v1/user` remains the existing online verifier. Expiry bounds an established stream, but upstream session revocation without local membership removal is not revalidated on every SSE packet. Define a stricter revocation requirement with the deletion/session work if needed; do not claim instantaneous global-logout enforcement from these tests.
- Data remains in the source JSON storage model. Transactional durability, multi-process access, rate limits, invite abuse controls and complete operational security are separate readiness items. This patch is not a general security certification.
- Historical grants, legacy mapping, onboarding/capability UI, real Auth/browser integration, deletion integration, remote CI, production verification and App Store submission remain unverified or gated.

## Official documentation checked

- [Supabase changelog](https://supabase.com/changelog): reviewed relevant current entries; this change adds no Supabase SDK/API feature or database migration. The Markdown endpoint was unsupported by the browsing tool, so the official HTML index was used.
- [Supabase advanced Auth guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide): checked verification/session and refresh behavior. The existing verifier is retained; no secret credentials or real user/session tokens are saved in this bundle.


## Separate bounded concurrency addition (October10)

PATCH /api/projects/:id optionally accepts `expectedUpdatedAt`, the exact string returned by GET. Authorization occurs first; after body parsing the server compares the current value and returns409 without mutation on mismatch (400 for a non-string/empty condition). The compare and update are synchronous in the existing single-process JSON store. All project mutations advance updatedAt monotonically, including same-millisecond writes. Existing clients omitting the field retain existing behavior; native clients should include it and retain drafts on409.

This does not provide transactional safety across multiple server processes, and legacy unguarded writes remain last-write-wins. The feature is local only and is not supported by current production until an approved deployment. Tests cover stale versions, overlapping delayed bodies, same-clock writes, other mutations, authorization-before-conflict, malformed conditions and old-client compatibility.
