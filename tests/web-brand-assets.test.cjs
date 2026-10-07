const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const publicDir = path.join(__dirname, '../public');
const read = (file) => fs.readFileSync(path.join(publicDir, file), 'utf8');

test('light and dark DLS artwork preserve all six paths and gradients', () => {
  const light = read('logo-light.svg');
  const dark = read('logo.svg');
  for (const source of [light, dark]) {
    assert.equal((source.match(/<path\b/g) || []).length, 6);
    assert.equal((source.match(/<linearGradient\b/g) || []).length, 6);
  }
  const geometry = (source) => [...source.matchAll(/<path[^>]*\bd="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(geometry(light), geometry(dark));
});

test('brand CSS uses theme-specific artwork without flattening filters', () => {
  const css = read('styles.css');
  assert.match(css, /background: url\('\/logo\.svg'\) center \/ contain no-repeat/);
  assert.match(css, /\[data-theme="light"\] \.brand-symbol\s*\{[^}]*logo-light\.svg/);
  const rules = css.match(/[^{}]*(?:brand-symbol|auth-visual::before)[^{}]*\{[^}]*\}/g);
  for (const rule of rules) assert.doesNotMatch(rule, /filter:[^;]*(?:invert|brightness)/);
});

test('web install icons have the expected PNG dimensions', () => {
  for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512], ['apple-touch-icon.png', 180]]) {
    const bytes = fs.readFileSync(path.join(publicDir, 'icons', file));
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  }
  assert.match(read('index.html'), /logo-light\.svg/);
  assert.match(read('sw.js'), /logo-light\.svg/);
});
