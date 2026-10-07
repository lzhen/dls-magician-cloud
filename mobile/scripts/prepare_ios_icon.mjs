import { createHash } from 'node:crypto';
import { copyFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const mobile = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const approvedPNG = 'b5b6db3f4b1f0525a3e3834bae9d9d33859f200fb83607a72c9a6671f898dad6';
export const approvedContrastSVG = '04c90b6c198cbcae31dd716f8ed4fc71a245da0535be2b3f79a59e5c5027ed45';
export const approvedWrapperSVG = 'b7fb42a1b4fa8353bf638c0e1a770f937f404ffd04b34d4600357776f2f7a093';
export const approvedSVG = 'ff93247f4d0ce66df156f4d0950d236606abd10b49f9422eabf9e7723599e09e';
const digest = data => createHash('sha256').update(data).digest('hex');
const target = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';

export function validatePNG(data) {
  if (data.length < 33 || !data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ||
      data.toString('ascii', 12, 16) !== 'IHDR' || data.readUInt32BE(16) !== 1024 ||
      data.readUInt32BE(20) !== 1024 || data[24] !== 8 || data[25] !== 2) {
    throw new Error('DLS AppIcon must be an opaque 8-bit RGB 1024x1024 PNG.');
  }
  if (digest(data) !== approvedPNG) throw new Error('DLS AppIcon differs from the approved black-background export.');
}

export async function prepareIOSIcon(root = mobile, { checkOnly = false } = {}) {
  const svg = await readFile(resolve(root, 'assets/ios/dls-magician-original.svg'));
  if (digest(svg) !== approvedSVG) throw new Error('Original DLS SVG geometry or gradients changed.');
  if (digest(await readFile(resolve(root, 'assets/ios/dls-magician-dark-contrast.svg'))) !== approvedContrastSVG ||
      digest(await readFile(resolve(root, 'assets/ios/dls-app-icon-1024-source-wrapper.svg'))) !== approvedWrapperSVG) {
    throw new Error('Approved DLS contrast gradients or black canvas changed.');
  }
  const source = resolve(root, 'assets/ios/dls-app-icon-1024.png');
  validatePNG(await readFile(source));
  const catalog = JSON.parse(await readFile(resolve(root, target, 'Contents.json'), 'utf8'));
  if (catalog.images?.length !== 1 || !catalog.images?.some(image => !image.appearances && image.filename === 'AppIcon-512@2x.png' &&
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
