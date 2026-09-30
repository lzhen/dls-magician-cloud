const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { restoreStagedDatabase } = require('../storage');

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
