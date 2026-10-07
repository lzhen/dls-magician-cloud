import { createHash } from 'node:crypto';
import { copyFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const mobile = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const approvedPNG = '8034953ecc3ea499a564ff2fd5843328ad9586c1cb2968cbefb907caa4ba8918';
export const approvedSVG = 'ff93247f4d0ce66df156f4d0950d236606abd10b49f9422eabf9e7723599e09e';
const digest = data => createHash('sha256').update(data).digest('hex');
const target = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';

export function validatePNG(data) {
  if (data.length < 33 || !data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ||
      data.toString('ascii', 12, 16) !== 'IHDR' || data.readUInt32BE(16) !== 1024 ||
      data.readUInt32BE(20) !== 1024 || data[24] !== 8 || data[25] !== 2) {
    throw new Error('DLS AppIcon must be an opaque 8-bit RGB 1024x1024 PNG.');
  }
  if (digest(data) !== approvedPNG) throw new Error('DLS AppIcon differs from the approved original-art export.');
}

export async function prepareIOSIcon(root = mobile, { checkOnly = false } = {}) {
  const svg = await readFile(resolve(root, 'assets/ios/dls-magician-original.svg'));
  if (digest(svg) !== approvedSVG) throw new Error('Original DLS SVG geometry or gradients changed.');
  const source = resolve(root, 'assets/ios/dls-app-icon-1024.png');
  validatePNG(await readFile(source));
  const catalog = JSON.parse(await readFile(resolve(root, target, 'Contents.json'), 'utf8'));
  if (!catalog.images?.some(image => image.filename === 'AppIcon-512@2x.png' &&
      image.idiom === 'universal' && image.platform === 'ios' && image.size === '1024x1024')) {
    throw new Error('iOS AppIcon catalog no longer references the approved universal slot.');
  }
  const destination = resolve(root, target, 'AppIcon-512@2x.png');
  if (!checkOnly) await copyFile(source, destination);
  validatePNG(await readFile(destination));
  return approvedPNG;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await prepareIOSIcon(mobile, { checkOnly: process.argv.includes('--check-only') });
  console.log('PASS: iOS AppIcon matches the approved DLS source. Android assets were not changed.');
}
