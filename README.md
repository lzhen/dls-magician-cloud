# DLS Magician Cloud

A runnable full-stack MVP for a cloud collaboration version of **DLS Magician**. The app preserves the original dark, high-contrast visual identity while turning the product into a shared workspace for designers and engineers.

## What is implemented

- Real Supabase Auth for Microsoft, Google, and email magic-link sign-in, with a company SSO integration point.
- Team workspace dashboard with recent projects, shared workspaces, templates, and activity.
- Three-pane collaborative editor:
  - structured language using `GIVEN / WHEN / THEN / AND`;
  - generated JSON;
  - live executable-flow preview.
- Autosave, validation, named versions, line-by-line comparison, and version restore.
- Project sharing with Admin, Editor, Commenter, and Viewer roles.
- Comments anchored to structured language, generated JSON, or the preview.
- Workspace authentication settings, including provider toggles, SSO enforcement, and MFA policy.
- Real-time updates and presence using Server-Sent Events. Open the app in separate browsers or incognito windows and sign in with different providers to test collaboration.
- Supabase-backed authentication profiles with row-level security; workspace demo content remains in `data/db.json`.

## Run it

No package installation is required. Node.js 22 or newer is the only dependency.

### macOS one-click start

Double-click `start.command`. It starts the local server and opens the product in your default browser. The first time macOS may ask you to confirm that the script can run.

### Terminal

```bash
cd dls-magician-cloud
npm start
```

Open:

```text
http://localhost:3000
```

The app is connected to Supabase project `rosofbnimiothwxsabyr`. Override its public runtime configuration when deploying:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

In Supabase Auth, add the deployed app URL and `http://localhost:3000` to the redirect allowlist. Enable Google and Azure providers with credentials from their respective developer consoles. Email magic links work through the project's configured SMTP service. Company SSO requires a Supabase SSO connection and verified domain.

## Product flow

1. Choose a trusted identity provider.
2. Enter the shared team workspace.
3. Create a project or open a recent project.
4. Co-author structured intent.
5. Review generated JSON and the live flow.
6. Comment, share, assign roles, save a review version, and restore previous work.
7. Configure organization identity and security policies in Settings.

## Architecture

```text
Browser UI
  ├── Supabase Auth (OAuth, PKCE, and email OTP)
  ├── Workspace and project management
  ├── Structured-language parser
  ├── JSON generator and live flow renderer
  └── Real-time collaboration client
          │
          ▼
Node.js server (no external packages)
  ├── Supabase access-token verification
  ├── Project / comment / version / permission APIs
  ├── Server-Sent Events for collaboration and presence
  └── JSON persistence in data/db.json
```

## Authentication and protected routes

The browser persists and refreshes the Supabase session. Every workspace API call and collaboration stream carries the current access token in an authorization header, and the server verifies it with Supabase before returning or mutating data. Tokens are never placed in URLs. Unauthenticated API requests return `401`; unauthenticated SPA routes render the login screen. Auth users are mirrored into `public.profiles` by a database trigger, with RLS limiting each profile to its owner. The browser SDK is pinned to an exact version and protected with Subresource Integrity.

The user-facing paths are:

- Microsoft OIDC
- Google OIDC
- Company SSO through SAML or OIDC
- Time-limited email magic links

Before a public launch, also add:

- PostgreSQL or another durable transactional database;
- encrypted secret management;
- CSRF protection and rate limits;
- verified email and domain ownership;
- audit-log retention;
- WebSocket or managed realtime infrastructure for character-level co-editing;
- object storage for imported documents and exports.

## Docker

```bash
docker build -t dls-magician-cloud .
docker run --rm -p 3000:3000 dls-magician-cloud
```

## Reset workspace demo data

Stop the server, delete `data/db.json`, and start the app again. The server recreates the seeded workspace.

## Included previews

- `screenshots/login.png` — passwordless identity-provider entry
- `screenshots/dashboard.png` — shared team workspace
- `screenshots/editor.png` — structured language, generated JSON, and live flow
# dls-magician-cloud
