import { mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadDesignSystem, REPO_ROOT } from './design-system.mjs';

const output = path.resolve(process.argv[2] || fileURLToPath(new URL('./.showcase/', import.meta.url)));
const system = loadDesignSystem();
mkdirSync(output, { recursive: true });
for (const name of ['index.html', 'showcase.css', 'showcase.js']) {
  copyFileSync(new URL('./showcase/' + name, import.meta.url), path.join(output, name));
}
writeFileSync(path.join(output, 'data.json'), JSON.stringify({
  ...system,
  stylesheet: readFileSync(path.join(REPO_ROOT, 'public/styles.css'), 'utf8'),
  repositoryUrl: 'https://github.com/lzhen/dls-magician-cloud',
  sourceRef: 'feat/dls-mcp-mvp-20261017'
}) + '\n');
console.log(`Built DLS Magician component explorer at ${output}`);
