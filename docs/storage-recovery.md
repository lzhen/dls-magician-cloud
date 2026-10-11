# SQLite storage and recovery

The server imports the existing `data/db.json` once into `data/db.sqlite`. All
users, grants, project IDs, comments and versions are retained. The original JSON
is left intact and `data/backups/migration.json` is written before serving traffic.
Subsequent writes use a SQLite snapshot transaction, WAL and `synchronous=FULL`.
A revision comparison refuses stale process writes with HTTP 409. A failed save
reloads committed state instead of exposing an uncommitted in-memory mutation.

Run one server replica on the existing Railway `/app/data` volume. This is still
a single-process collaboration service; it is not a horizontally scaled database
or a normalized relational schema. Existing project `expectedUpdatedAt` checks
continue to protect browser drafts. SQLite revision checks add storage protection.

## Backup and restore

`npm run backup` produces a validated JSON snapshot under `data/backups`. Daily
snapshots are also created at startup and before the first write of a new UTC day.
Startup prunes daily snapshots to 14; migration and explicit recovery snapshots
are retained. Copy backups to a separately managed, encrypted destination: copies
on this same volume do not protect against volume loss. No off-volume retention
policy is asserted by this change.

For recovery, stop the service, copy a chosen JSON backup to
`/app/data/db.restore.json`, then restart. Startup validates the staged snapshot,
preserves the current SQLite state as `backups/before-restore-*.json`, commits
the replacement, and renames the staged file to `db.restored.json`. An invalid
snapshot fails startup without replacing committed data. Never restore while
another replica is writing. The migration JSON is stale after new SQLite writes;
do not roll back to the old server without first exporting the current snapshot.

## Request boundaries

API requests are limited to 120 per source address per minute before Auth calls.
Only Railway's trusted proxy header is used in Railway; elsewhere the socket
address is used. Browser origins must match `DLS_ALLOWED_ORIGINS` (comma separated)
or the default production/local origins. Cross-site browser mutations are refused.
Native clients may omit Origin but still need a valid Bearer token and role grant.
The limiter is local to the single replica and resets on restart; it is not a
distributed abuse-control system. Request bodies remain bounded to 1 MB.

## Validation and remaining release gates

The automated suite covers role isolation, invitations, draft conflicts, killed
writer recovery, migration, stale process writes, staged restore and request
boundaries. Live Supabase account/browser testing, historical grant provenance,
off-volume backups and a real-user pilot remain separate release gates. No real
user memberships were altered by this migration.
