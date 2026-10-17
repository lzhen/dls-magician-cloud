import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { loadDesignSystem, REPO_ROOT } from './design-system.mjs';
import path from 'node:path';

const system = loadDesignSystem();
const bundle = new URL('./.bundle/', import.meta.url);
mkdirSync(bundle, { recursive: true });
writeFileSync(new URL('design-system.json', bundle), JSON.stringify(system, null, 2) + '\n');
writeFileSync(new URL('styles.css', bundle), readFileSync(path.join(REPO_ROOT, 'public/styles.css')));
console.error(`Prepared ${system.components.length} source-bound components for a standalone package.`);
