import fs from 'node:fs';
import { validateSourceRegistry } from '../lib/official-portals.mjs';
const registry = JSON.parse(fs.readFileSync(new URL('../data/source-registry.json', import.meta.url), 'utf8'));
const errors = validateSourceRegistry(registry);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Source registry valid. Entries: ${registry.length}`);
