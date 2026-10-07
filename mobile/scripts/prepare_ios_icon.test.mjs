import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approvedPNG, validatePNG, prepareIOSIcon } from './prepare_ios_icon.mjs';

const mobile = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';
async function fixture(t) {
  const root = await mkdtemp(resolve(tmpdir(), 'dls-ios-icon-'));
  await cp(resolve(mobile, 'assets'), resolve(root, 'assets'), { recursive: true });
  await cp(resolve(mobile, 'ios/App/App/Assets.xcassets'), resolve(root, 'ios/App/App/Assets.xcassets'), { recursive: true });
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
test('approved original source and native export pass', async () => {
  assert.equal(await prepareIOSIcon(mobile, { checkOnly: true }), approvedPNG);
});
test('preparation restores a regenerated legacy icon, is idempotent and preserves Android source', async t => {
  const root = await fixture(t);
  const sentinel = resolve(root, 'assets', 'icon.svg');
  await writeFile(sentinel, '<svg>unchanged Android source</svg>');
  await writeFile(resolve(root, target), 'legacy icon');
  await assert.rejects(prepareIOSIcon(root, { checkOnly: true }), /opaque/);
  await prepareIOSIcon(root);
  const first = await readFile(resolve(root, target));
  await prepareIOSIcon(root);
  assert.deepEqual(await readFile(resolve(root, target)), first);
  assert.equal(await readFile(sentinel, 'utf8'), '<svg>unchanged Android source</svg>');
});
test('modified artwork is rejected before copying', async t => {
  const root = await fixture(t);
  const source = resolve(root, 'assets/ios/dls-app-icon-1024.png');
  const data = await readFile(source); data[data.length - 1] ^= 1;
  await writeFile(source, data);
  await assert.rejects(prepareIOSIcon(root), /differs/);
});
test('source SVG and catalog drift are rejected', async t => {
  const root = await fixture(t);
  const svg = resolve(root, 'assets/ios/dls-magician-original.svg');
  const original = await readFile(svg);
  await writeFile(svg, '<svg/>');
  await assert.rejects(prepareIOSIcon(root), /geometry or gradients/);
  await writeFile(svg, original);
  await writeFile(resolve(root, target, '..', 'Contents.json'), '{"images":[]}');
  await assert.rejects(prepareIOSIcon(root), /catalog/);
});
test('non-square, non-RGB or resized image headers are rejected', async () => {
  const data = await readFile(resolve(mobile, 'assets/ios/dls-app-icon-1024.png'));
  for (const mutate of [d => d.writeUInt32BE(512, 16), d => d.writeUInt32BE(512, 20), d => { d[25] = 6; }]) {
    const changed = Buffer.from(data); mutate(changed); assert.throws(() => validatePNG(changed), /opaque/);
  }
});
test('black adaptation preserves six path and gradient geometries without flattening', async () => {
  const original = await readFile(resolve(mobile, 'assets/ios/dls-magician-original.svg'), 'utf8');
  const contrast = await readFile(resolve(mobile, 'assets/ios/dls-magician-dark-contrast.svg'), 'utf8');
  const paths = xml => [...xml.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(match => match[1]);
  const gradients = xml => [...xml.matchAll(/<linearGradient\b([^>]+)>/g)].map(match =>
    Object.fromEntries([...match[1].matchAll(/([\w:]+)="([^"]*)"/g)].map(attribute => [attribute[1], attribute[2]])));
  assert.equal(paths(contrast).length, 6);
  assert.equal(gradients(contrast).length, 6);
  assert.deepEqual(paths(contrast), paths(original));
  assert.deepEqual(gradients(contrast), gradients(original));
  assert.ok(new Set([...contrast.matchAll(/stop-color="([^"]+)"/g)].map(match => match[1])).size > 1);
});
test('contrast-source drift and additional appearance slots are rejected', async t => {
  const root = await fixture(t);
  const contrast = resolve(root, 'assets/ios/dls-magician-dark-contrast.svg');
  const original = await readFile(contrast);
  await writeFile(contrast, Buffer.concat([original, Buffer.from('\n')]));
  await assert.rejects(prepareIOSIcon(root), /contrast gradients/);
  await writeFile(contrast, original);
  const catalogPath = resolve(root, target, '..', 'Contents.json');
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  catalog.images.push({ ...catalog.images[0], appearances: [{appearance:'luminosity',value:'dark'}] });
  await writeFile(catalogPath, JSON.stringify(catalog));
  await assert.rejects(prepareIOSIcon(root), /catalog/);
});
