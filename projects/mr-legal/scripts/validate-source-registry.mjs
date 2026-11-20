import fs from 'node:fs';
const registry = JSON.parse(fs.readFileSync(new URL('../data/source-registry.json', import.meta.url), 'utf8'));
const required = ['id','name','publisher','jurisdiction','category','authority_level','url','access_method','license_status','coverage_status'];
const seen = new Set();
const errors = [];
for (const [i, item] of registry.entries()) {
  for (const key of required) if (typeof item[key] !== 'string' || !item[key].trim()) errors.push(`Entry ${i}: missing ${key}`);
  if (seen.has(item.id)) errors.push(`Entry ${i}: duplicate id ${item.id}`);
  seen.add(item.id);
  try { if (new URL(item.url).protocol !== 'https:') errors.push(`Entry ${i}: URL must use HTTPS`); }
  catch { errors.push(`Entry ${i}: invalid URL`); }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Source registry valid. Entries: ${registry.length}`);
