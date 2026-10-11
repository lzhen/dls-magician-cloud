const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { restoreStagedDatabase } = require('../storage');
const { openDatabase } = require('../storage');
const { spawnSync } = require('node:child_process');

function databaseFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dls-sqlite-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const snapshot = { settings: {}, users: [], workspaces: [], projects: [{ id: 'preserved', structuredLanguage: 'original' }], activities: [] };
  fs.writeFileSync(path.join(dir, 'db.json'), JSON.stringify(snapshot));
  return { dir, snapshot };
}

test('SQLite migration preserves IDs and original data, and a killed writer retains committed saves', t => {
  const { dir, snapshot } = databaseFixture(t);
  const storage = openDatabase(dir, () => { throw Error('Must migrate'); });
  assert.deepEqual(storage.read().snapshot, snapshot);
  assert.deepEqual(JSON.parse(fs.readFileSync(storage.backup('recovery.json'))), snapshot);
  storage.close();
  const child = spawnSync(process.execPath, ['-e', `const s=require(${JSON.stringify(path.resolve(__dirname, '../storage.js'))}).openDatabase(process.argv[1]);const {snapshot,revision}=s.read();snapshot.projects[0].structuredLanguage='committed';s.save(snapshot,revision);process.kill(process.pid,'SIGKILL');`, dir]);
  assert.equal(child.signal, 'SIGKILL');
  const reopened = openDatabase(dir);
  assert.equal(reopened.read().snapshot.projects[0].structuredLanguage, 'committed');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'db.json'))), snapshot);
  reopened.close();
});

test('stale writers cannot overwrite a newer revision and invalid writes preserve data', t => {
  const { dir } = databaseFixture(t);
  const first = openDatabase(dir), second = openDatabase(dir);
  const a = first.read(), b = second.read();
  a.snapshot.projects[0].structuredLanguage = 'newer';
  first.save(a.snapshot, a.revision);
  assert.throws(() => second.save(b.snapshot, b.revision), error => error.status === 409);
  assert.throws(() => first.save({ projects: [] }, 1), /Invalid database snapshot/);
  assert.equal(second.read().snapshot.projects[0].structuredLanguage, 'newer');
  first.close(); second.close();
});

test('restores a validated backup on startup and preserves the pre-restore state', t => {
  const { dir, snapshot } = databaseFixture(t);
  const original = openDatabase(dir);
  const replacement = structuredClone(snapshot);
  replacement.projects[0].structuredLanguage = 'restored';
  fs.writeFileSync(path.join(dir, 'db.restore.json'), JSON.stringify(replacement));
  original.close();
  const restored = openDatabase(dir);
  assert.deepEqual(restored.read().snapshot, replacement);
  assert.ok(fs.readdirSync(path.join(dir, 'backups')).some(name => name.startsWith('before-restore-')));
  assert.equal(fs.existsSync(path.join(dir, 'db.restore.json')), false);
  restored.close();
});

test('staged restore retains project IDs and is consumed only once', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dls-restore-'));
  t.after(() => fs.rmSync(dir, { recursive: true }));
  const snapshot = { users: [], workspaces: [], projects: [{ id: 'existing-id', structuredLanguage: 'GIVEN\nButton' }], activities: [] };
  fs.writeFileSync(path.join(dir, 'db.restore.json'), JSON.stringify(snapshot));
  assert.equal(restoreStagedDatabase(dir), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'db.json'))), snapshot);
  fs.writeFileSync(path.join(dir, 'db.json'), 'updated');
  assert.equal(restoreStagedDatabase(dir), false);
  assert.equal(fs.readFileSync(path.join(dir, 'db.json'), 'utf8'), 'updated');
  assert.ok(fs.existsSync(path.join(dir, 'db.restored.json')));
});

test('invalid snapshot does not replace existing data', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dls-restore-'));
  t.after(() => fs.rmSync(dir, { recursive: true }));
  fs.writeFileSync(path.join(dir, 'db.json'), 'original');
  fs.writeFileSync(path.join(dir, 'db.restore.json'), '{"projects":[]}');
  assert.throws(() => restoreStagedDatabase(dir), /Invalid database snapshot/);
  assert.equal(fs.readFileSync(path.join(dir, 'db.json'), 'utf8'), 'original');
});
