'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function validateSnapshot(snapshot) {
  for (const key of ['users', 'workspaces', 'projects', 'activities']) {
    if (!Array.isArray(snapshot?.[key])) throw new Error(`Invalid database snapshot: ${key}`);
  }
  return snapshot;
}

function durableWrite(filename, raw) {
  const temporary = `${filename}.tmp`;
  const fd = fs.openSync(temporary, 'w', 0o600);
  try { fs.writeFileSync(fd, raw); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(temporary, filename);
  const directory = fs.openSync(path.dirname(filename), 'r');
  try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
}

// Operators can stage a snapshot without changing the running process's database.
// Consume it once at the next startup, retaining the snapshot for recovery.
function restoreStagedDatabase(dataDir) {
  const staged = path.join(dataDir, 'db.restore.json');
  if (!fs.existsSync(staged)) return false;
  const raw = fs.readFileSync(staged, 'utf8');
  const snapshot = JSON.parse(raw);
  validateSnapshot(snapshot);
  durableWrite(path.join(dataDir, 'db.json'), raw);
  fs.renameSync(staged, path.join(dataDir, 'db.restored.json'));
  return true;
}

function openDatabase(dataDir, seed) {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const filename = path.join(dataDir, 'db.sqlite');
  const sql = new DatabaseSync(filename);
  fs.chmodSync(filename, 0o600);
  sql.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;');
  sql.exec('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, snapshot TEXT NOT NULL CHECK(json_valid(snapshot)))');
  const read = () => {
    const row = sql.prepare('SELECT revision, snapshot FROM state WHERE id=1').get();
    return row && { revision: row.revision, snapshot: validateSnapshot(JSON.parse(row.snapshot)) };
  };
  const backupDir = path.join(dataDir, 'backups');
  function backup(name) {
    fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
    const current = read();
    if (!current) throw new Error('Database is not initialized');
    const destination = path.join(backupDir, name);
    durableWrite(destination, JSON.stringify(current.snapshot, null, 2) + '\n');
    return destination;
  }
  try {
    if (!read()) {
      const legacy = path.join(dataDir, 'db.json');
      const snapshot = validateSnapshot(fs.existsSync(legacy) ? JSON.parse(fs.readFileSync(legacy, 'utf8')) : seed());
      sql.prepare('INSERT OR IGNORE INTO state(id,revision,snapshot) VALUES(1,0,?)').run(JSON.stringify(snapshot));
      // Preserve the original JSON and a recovery snapshot before new writes.
      backup('migration.json');
    }
    const staged = path.join(dataDir, 'db.restore.json');
    if (fs.existsSync(staged)) {
      const snapshot = validateSnapshot(JSON.parse(fs.readFileSync(staged, 'utf8')));
      backup(`before-restore-${Date.now()}.json`);
      sql.prepare('UPDATE state SET snapshot=?, revision=revision+1 WHERE id=1').run(JSON.stringify(snapshot));
      fs.renameSync(staged, path.join(dataDir, 'db.restored.json'));
    }
    // Daily startup snapshots stay on the volume. Operators must also export
    // backups off-volume; these cannot recover a deleted volume.
    const daily = `daily-${new Date().toISOString().slice(0, 10)}.json`;
    if (!fs.existsSync(path.join(backupDir, daily))) backup(daily);
    const dailyFiles = fs.readdirSync(backupDir).filter(name => /^daily-\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort();
    for (const name of dailyFiles.slice(0, -14)) fs.unlinkSync(path.join(backupDir, name));
  } catch (error) { sql.close(); throw error; }
  return {
    read,
    save(snapshot, expectedRevision) {
      validateSnapshot(snapshot);
      const daily = `daily-${new Date().toISOString().slice(0, 10)}.json`;
      if (!fs.existsSync(path.join(backupDir, daily))) backup(daily);
      const result = sql.prepare('UPDATE state SET snapshot=?, revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(snapshot), expectedRevision);
      if (result.changes !== 1) {
        const error = new Error('Database changed in another process. Reload and retry.');
        error.status = 409;
        throw error;
      }
      return expectedRevision + 1;
    },
    backup(name = `manual-${Date.now()}.json`) {
      if (!/^[a-zA-Z0-9_.-]+\.json$/.test(name)) throw new Error('Invalid backup name');
      return backup(name);
    },
    close() { sql.close(); }
  };
}

module.exports = { openDatabase, restoreStagedDatabase, validateSnapshot };
