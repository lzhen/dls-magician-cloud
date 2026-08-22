# DLS Magician Cloud

A runnable full-stack MVP for a cloud collaboration version of **DLS Magician**. The app preserves the original dark, high-contrast visual identity while turning the product into a shared workspace for designers and engineers.

## What is implemented

- Passwordless sign-in entry points for Microsoft, Google, company SSO, and email magic link.
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
- Persistent local data stored in `data/db.json`.

## Run it

No package installation is required. Node.js 20 or newer is the only dependency.

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

Provider buttons intentionally map to different demo collaborators:

- Microsoft → Jen Lee
- Google → Alex Kim
- Company SSO → Maria Garcia
- Email magic link → a collaborator created from the entered email

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
  ├── Passwordless authentication flow (simulated in MVP)
  ├── Workspace and project management
  ├── Structured-language parser
  ├── JSON generator and live flow renderer
  └── Real-time collaboration client
          │
          ▼
Node.js server (no external packages)
  ├── Session cookie and demo provider adapter
  ├── Project / comment / version / permission APIs
  ├── Server-Sent Events for collaboration and presence
  └── JSON persistence in data/db.json
```

## Production authentication

The UI and workspace policy model are ready for real provider integration, but the included authentication adapter is deliberately simulated because OAuth and SAML require organization credentials, redirect URLs, certificates, and secret storage.

For production, replace `ensureUserForProvider()` and `/api/auth/login` in `server.js` with an identity platform such as Supabase Auth, Auth0, Clerk, WorkOS, or a direct OIDC/SAML implementation. Keep the four user-facing paths:

- Microsoft OIDC
- Google OIDC
- Company SSO through SAML or OIDC
- Time-limited email magic links

The production service should also add:

- PostgreSQL or another durable transactional database;
- encrypted secret management;
- signed, rotating sessions;
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

## Reset demo data

Stop the server, delete `data/db.json`, and start the app again. The server recreates the seeded workspace.

## Included previews

- `screenshots/login.png` — passwordless identity-provider entry
- `screenshots/dashboard.png` — shared team workspace
- `screenshots/editor.png` — structured language, generated JSON, and live flow
# dls-magician-cloud
