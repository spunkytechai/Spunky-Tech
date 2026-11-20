import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('source registry has unique IDs and complete provenance fields', () => {
  const rows = JSON.parse(fs.readFileSync(new URL('../data/source-registry.json', import.meta.url), 'utf8'));
  const ids = rows.map(row => row.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(rows.length >= 6);
  for (const row of rows) {
    for (const field of ['name','publisher','jurisdiction','url','license_status','coverage_status']) assert.ok(row[field]);
    assert.equal(new URL(row.url).protocol, 'https:');
  }
});

test('jurisdiction inventory contains 28 states and 8 union territories', () => {
  const rows = JSON.parse(fs.readFileSync(new URL('../data/jurisdictions.json', import.meta.url), 'utf8'));
  assert.equal(rows.filter(row => row.type === 'state').length, 28);
  assert.equal(rows.filter(row => row.type === 'union_territory').length, 8);
  assert.equal(new Set(rows.map(row => row.code)).size, 36);
});
