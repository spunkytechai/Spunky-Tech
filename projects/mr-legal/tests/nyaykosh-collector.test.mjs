import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCollectorArgs, collectNyaykosh, createRetryingFetch } from '../scripts/collect-nyaykosh.mjs';

test('help is parseable without network access', () => {
  assert.equal(parseCollectorArgs(['--help']).help, true);
});

test('rejects missing option values and misspelled flags', () => {
  assert.throws(() => parseCollectorArgs(['--out']), /requires a value/);
  assert.throws(() => parseCollectorArgs(['--detials']), /Unknown option/);
});

test('validates retry limits and requires HTTPS API base URL', () => {
  assert.throws(() => parseCollectorArgs(['--retries', '9']), /between 0 and 8/);
  assert.throws(() => parseCollectorArgs(['--base-url', 'http://example.test']), /HTTPS/);
});

test('retries transient HTTP responses and returns successful response', async () => {
  let calls = 0;
  const retryFetch = createRetryingFetch({
    retries: 2, sleep: async () => {},
    fetchImpl: async () => {
      calls += 1;
      return calls < 2 ? { ok: false, status: 503 } : { ok: true, status: 200 };
    }
  });
  const response = await retryFetch('https://example.test');
  assert.equal(response.ok, true);
  assert.equal(calls, 2);
});

test('does not retry permanent HTTP client errors', async () => {
  let calls = 0;
  const retryFetch = createRetryingFetch({
    retries: 3, sleep: async () => {},
    fetchImpl: async () => { calls += 1; return { ok: false, status: 404 }; }
  });
  const response = await retryFetch('https://example.test');
  assert.equal(response.status, 404);
  assert.equal(calls, 1);
});

test('writes a manifest with SHA-256 checksum and preserves catalog on detail failure', async () => {
  const writes = new Map();
  const manifest = await collectNyaykosh({
    args: ['--details', '--out', '/tmp/mr-legal-test-output'],
    fetchCatalog: async () => [{ external_id: 'it-act', title: 'IT Act' }],
    fetchLaw: async () => { throw new Error('temporary outage'); },
    mkdirImpl: async () => {},
    writeFileImpl: async (path, content) => writes.set(path, content),
    log: () => {}
  });
  assert.equal(manifest.record_count, 1);
  assert.equal(manifest.failed_detail_fetches.length, 1);
  assert.match(manifest.sha256_laws_jsonl, /^[a-f0-9]{64}$/);
  assert.match(writes.get('/tmp/mr-legal-test-output/laws.jsonl'), /it-act/);
});
