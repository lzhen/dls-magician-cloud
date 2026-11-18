const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const directory = path.join(__dirname, '../public/vendor/empathie');
const source = JSON.parse(fs.readFileSync(path.join(directory, 'provenance.json'), 'utf8'));
for (const [name, expected] of Object.entries(source.sha256)) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, name))).digest('hex'), expected, `Vendored ${name} drifted. Review and import a versioned upstream change.`);
}
console.log(`Verified ${Object.keys(source.sha256).length} shared files from ${source.repository}@${source.commit.slice(0, 12)}.`);
