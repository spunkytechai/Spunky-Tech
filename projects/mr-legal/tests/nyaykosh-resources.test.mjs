import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNyaykoshProvision, normalizeNyaykoshPenalty } from '../lib/legislation.mjs';
import { collectNyaykosh } from '../scripts/collect-nyaykosh.mjs';

test('normalizes provision rows and retains parent law provenance', () => {
  const row = normalizeNyaykoshProvision({ number: '43A', heading: 'Compensation', text: 'Provision text' }, 'it-act');
  assert.equal(row.law_external_id, 'it-act');
  assert.equal(row.provision_ref, '43A');
  assert.equal(row.heading, 'Compensation');
  assert.equal(row.text, 'Provision text');
  assert.equal(row.verification_status, 'needs_primary_source_check');
});

test('rejects a provision without a stable section reference', () => {
  assert.throws(() => normalizeNyaykoshProvision({ heading: 'No number' }, 'it-act'), /provision reference/);
});

test('normalizes penalty schedule rows without asserting their legal correctness', () => {
  const row = normalizeNyaykoshPenalty({ breach: 'Failure to protect data', max_penalty: '₹250 crore', section: 'S. 33' }, 'dpdp-2023');
  assert.equal(row.law_external_id, 'dpdp-2023');
  assert.equal(row.maximum_penalty, '₹250 crore');
  assert.equal(row.provision_ref, '33');
  assert.equal(row.verification_status, 'needs_primary_source_check');
});

test('writes provisions and penalties as separate JSONL datasets', async () => {
  const writes = new Map();
  const manifest = await collectNyaykosh({
    args: ['--details', '--out', '/tmp/mr-legal-resource-output'],
    fetchCatalog: async () => [{ external_id: 'dpdp-2023', title: 'DPDP Act' }],
    fetchLaw: async () => ({
      external_id: 'dpdp-2023', title: 'DPDP Act',
      metadata: { raw_source: {
        provisions: [{ number: '9', heading: 'Children data', text: 'Text' }],
        penalties: [{ breach: 'Failure to comply', max_penalty: '₹200 crore', section: 'S. 9' }]
      } }
    }),
    mkdirImpl: async () => {},
    writeFileImpl: async (path, value) => writes.set(path, value),
    log: () => {}
  });
  assert.equal(manifest.provision_count, 1);
  assert.equal(manifest.penalty_count, 1);
  assert.match(writes.get('/tmp/mr-legal-resource-output/provisions.jsonl'), /Children data/);
  assert.match(writes.get('/tmp/mr-legal-resource-output/penalties.jsonl'), /200 crore/);
});
