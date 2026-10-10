# DLS account deletion API (local candidate, not deployed)

Updated 2026-10-10 UTC. Fixed application origin: https://dlsmagician.empathie.ai . All paths below are relative to this origin. JSON requests use Content-Type: application/json. No account identifier is accepted from clients. Clients must treat a missing route or unexpected response as unavailable, never as successful deletion.

## Preview

GET /api/account/deletion-preview
Authorization: Bearer <current access token>

200 response:

```json
{
  "canDelete": true,
  "confirmationPhrase": "DELETE",
  "confirmationToken": "43-character-base64url-random-secret",
  "expiresAt": "2026-10-10T22:20:00.000Z",
  "effects": {"ownedPrivateProjects": 1, "comments": 2, "memberships": 3},
  "blockers": [],
  "retentionNotice": "Server-provided explanation of removed and retained data."
}
```

`canDelete:false` has null confirmationToken/expiresAt and one or more blockers `{code,message,projectIds?,workspaceIds?}`. Show these messages and do not offer an enabled destructive action. Blocker codes: shared_projects_block_deletion, shared_workspace_requires_admin, deletion_unavailable. The server does not offer ownership transfer. Contacting the workspace administrator or support is the truthful next action. A private project is owned by this user and has no other project memberships, comments/version authors, or workspace administrators who can read it.

Show counts and retentionNotice, require the user to type DELETE, then use an explicit destructive confirmation. Do not substitute sign-out. Store confirmationToken securely before sending execute; it also serves as the recovery receipt. A newer preview invalidates the previous unsubmitted preview. The preview expires in at most five minutes and is bound to the exact bearer, verified subject, local identity and affected data snapshot. A refreshed bearer needs a new preview before a new deletion request.

## Fresh authentication

Both preview and first execute independently verify the actual bearer through Supabase GET /auth/v1/user. Only after upstream verification does the server inspect JWT claims: issuer and audience must match, sub must match the verified user, role must be authenticated, is_anonymous must be false, session_id must be nonempty, exp must be current, and an amr entry for password/oauth/otp/totp/sso/saml/magiclink must be less than five minutes old. Missing claims fail closed. Refresh-only amr, JWT iat, user.last_sign_in_at and user_metadata do not establish freshness. A login on another device does not refresh this session's amr. This is recent Auth authentication; OAuth providers may reuse their own signed-in session. Provider interactive credential entry is not asserted.

A 401 reauthentication_required means perform a new supported sign-in flow, then load a new preview. Refresh alone does not satisfy it. No destructive operation starts on a 401. If provider claims differ in staging, keep deletion disabled until the integration is verified.

## Execute

POST /api/account/deletion
Authorization: Bearer <the exact access token used for preview>

```json
{"confirmationToken":"<securely retained preview token>","confirmation":"DELETE"}
```

Only these two fields are accepted. A target userId/accountId/email causes a 400. First execution re-verifies identity and rechecks freshness, shared ownership and preview fingerprint before consuming the preview. A durable confirmed-operation journal fences the identity before provider removal begins. The adapter hard-deletes the exact verified Supabase Auth subject and independently confirms its absence. Local cleanup is persisted before the completion journal.

200 response:

```json
{"deleted":true,"operationId":"opaque-uuid"}
```

Only deleted:true or a verified recovery state of deleted permits the client to clear its own Keychain/secure session, cached account data and receipt, and show completion. The backend already blocks the old subject immediately on accepted deletion, including old API requests and SSE. Shared project content and versions, including any personal text inside version content, are retained; this user's comments and memberships are removed; retained versions have userId:null and a generic message. Other users' authored content can still mention this person. Private owned projects and now-empty personal workspaces are removed. A minimal persistent identity/operation record prevents reappearance through stale tokens or an application-database restore. Logs/backups and external provider retention require the release review below.

## Recovery after an interrupted response

POST /api/account/deletion-status
No Authorization header required.

```json
{"confirmationToken":"<same securely retained preview token>"}
```

This read-only endpoint returns 200 `{state:"awaiting_confirmation"|"not_started"|"pending"|"deleted",operationId:"opaque-uuid",confirmationExpiresAt?:"ISO8601"}`. It never deletes or retries anything and never returns profile information. A receipt is 256 bits of randomness; only its SHA-256 hash is persisted. Receipt lookup expires seven days after execution starts, or seven days after preview issuance if never executed. Requests are no-store. Do not log the receipt or place it in URLs, analytics, crash reports, or ordinary preferences.

`awaiting_confirmation` means an inert receipt exists but no durable execution has been accepted yet. It includes confirmationExpiresAt. Preserve the receipt: an in-flight execute may still arrive within the preview window. Check status again at or after confirmationExpiresAt. `not_started` is authoritative only after the execution window has expired without an accepted execute; the client may discard this receipt, then start a fresh preview and ask for confirmation again. Inert receipts never lock accounts and are never recovered as deletion operations.

A generic 404 deletion_status_unavailable means unknown or expired. It is NOT proof that deletion did or did not happen. If execute may have started, preserve the receipt/reference and show that completion could not be verified; offer support. Do not automatically create a new preview or report success. `pending` means access is locked and deletion needs recovery; preserve the receipt and session. The server can resume already-confirmed operations on restart. A pending operation fences that account and its owned projects; unrelated accounts remain available. A corrupt or unreadable journal prevents startup. A user-initiated retry may replay the exact original execute body AND original bearer within the seven-day recovery period. This replay resumes only the already-confirmed operation, even if provider deletion makes the old bearer fail /user; it cannot target another account. Never replace the original bearer with a refreshed/new account token for replay. No blind retry of a newly constructed destructive request.

## Errors

Both preview and execute failures use `{error:string,code:string,operationId?:string}`. There is no deleted:true on an error.

- 400 deletion_confirmation_required: wrong/missing phrase, malformed token or extra target fields.
- 401 reauthentication_required: fresh verified authentication needed.
- 409 deletion_preview_stale: expired, changed bearer, wrong subject or changed affected data. Only if execute has not started, load a new preview and reconfirm.
- 409 shared_projects_block_deletion / shared_workspace_requires_admin: ownership must be resolved outside this app.
- 409 account_identity_review_required: ambiguous or missing local identity mapping.
- 409 account_deletion_started: use the original secure receipt or contact support.
- 429 deletion_preview_rate_limited: preview issuance is limited to five per minute and twenty per day for this subject.
- 503 deletion_unavailable: server capability is disabled or incomplete.
- 503 identity_verification_unavailable: Auth verification could not be reached; no new deletion started.
- 503 deletion_pending with operationId: confirmed intent exists, completion is not established. Access is fenced; use status/recovery. Never show complete.

The status route's 404 body has the same error/code schema. Invalid JSON currently follows the server's generic 500 error path; clients must treat every unrecognized/non-200 result as failure.

## Release gates

This endpoint is a reviewed-code candidate only. Production a401210 has no deletion endpoint. No real deletion, account creation, data query, provider change, secret provisioning or deployment was performed.

1. Deploy the authorization/conditional-save candidate plus this patch only after review and approved staging checks.
2. Use a persistent durable volume and exactly one server writer/replica. The JSON store, atomic rename/fsync, in-memory preview and race guards are not a distributed transaction system. Preserve account-deletions.json across deployments and restores. Never roll it back with db.json. Backups/retention and journal disaster recovery need an operator-approved policy before release.
3. Set DLS_ACCOUNT_DELETION_ENABLED=true and DLS_ACCOUNT_DELETION_SINGLE_WRITER=true only after the above is verified. Supply an approved server-only SUPABASE_SERVICE_ROLE_KEY for exactly the SUPABASE_URL project. This candidate accepts the documented JWT service_role format, rejects publishable/anon credentials, and exposes no server credential through /api/config or clients. Provisioning/reusing persistent privileged access needs separate authorization; no credential is inspected or created here.
4. Verify the real project's admin GET/delete behavior, structured user_not_found response, fresh per-session amr values and hard-delete session cascade using disposable staging accounts. Staging must cover both supported native OAuth providers and email sign-in if shipped.
5. Audit actual Supabase Storage ownership, database foreign keys, extra profile stores, billing, analytics, exported data, backups and logs. Storage objects can block Auth deletion. No automatic object reassignment or broad data purge is implemented; provider failure locks the operation and reports pending. Ensure no direct Supabase data path continues trusting an unexpired JWT after account deletion; this application's tombstone cannot secure unrelated services.
6. Verify native typed confirmation, interrupted POST, secure receipt persistence, status recovery, pending failures and local cleanup on both iOS and Android devices before store submission. Use receipt status for response loss. Production deployment and store acceptance are not proven by synthetic tests.

## Primary references checked

- https://supabase.com/changelog (markdown index was unsupported by the retrieval tool; HTML index checked for relevant breaking changes)
- https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
- https://supabase.com/docs/guides/auth/managing-user-data
- https://supabase.com/docs/guides/auth/jwt-fields
- https://raw.githubusercontent.com/supabase/auth-js/master/src/GoTrueAdminApi.ts

- https://raw.githubusercontent.com/supabase/auth-js/master/src/lib/fetch.ts
- https://raw.githubusercontent.com/supabase/auth-js/master/src/lib/constants.ts
- https://raw.githubusercontent.com/supabase/auth/master/internal/api/errors.go
