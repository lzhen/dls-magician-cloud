'use strict';

const fs = require('fs');
const path = require('path');

// Operators can stage a snapshot without changing the running process's database.
// Consume it once at the next startup, retaining the snapshot for recovery.
function restoreStagedDatabase(dataDir) {
  const staged = path.join(dataDir, 'db.restore.json');
  if (!fs.existsSync(staged)) return false;
  const raw = fs.readFileSync(staged, 'utf8');
  const snapshot = JSON.parse(raw);
  for (const key of ['users', 'workspaces', 'projects', 'activities']) {
    if (!Array.isArray(snapshot[key])) throw new Error(`Invalid database snapshot: ${key}`);
  }
  const temporary = path.join(dataDir, 'db.json.restore.tmp');
  fs.writeFileSync(temporary, raw, { mode: 0o600 });
  fs.renameSync(temporary, path.join(dataDir, 'db.json'));
  fs.renameSync(staged, path.join(dataDir, 'db.restored.json'));
  return true;
}

module.exports = { restoreStagedDatabase };
