import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGazetteDownload, acquireGazetteDocuments } from '../lib/gazette-acquisition.mjs';

const base = {
  source_id: 'IN-MANIPUR-EGAZETTE', source_url: 'https://manipurgovtpress.nic.in/en/gazette/',
  document_url: 'https://egazettemanipur.mn.gov.in/files/weekly-2026.pdf', title: 'Weekly Gazette 2026',
  jurisdiction: 'IN-MN', captured_at: '2026-11-21T00:00:00Z'
};
const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF');

test('normalizes a PDF capture with content hash and pending legal review', () => {
  const row = normalizeGazetteDownload({ ...base, bytes: pdf, final_url: base.document_url });
  assert.equal(row.media_type, 'application/pdf');
  assert.equal(row.byte_length, pdf.length);
  assert.match(row.sha256, /^[a-f0-9]{64}$/);
  assert.equal(row.legal_effect_verified, false);
  assert.equal(row.verification_status, 'downloaded_pending_legal_review');
});

test('rejects URLs outside the source-specific official host allowlist', () => {
  assert.throws(() => normalizeGazetteDownload({ ...base, document_url: 'https://attacker.example/file.pdf', final_url: 'https://attacker.example/file.pdf', bytes: pdf }), /registered government source host/);
});

test('rejects HTML error pages even when returned with a PDF content type', () => {
  assert.throws(() => normalizeGazetteDownload({ ...base, final_url: base.document_url, bytes: Buffer.from('<html>blocked</html>'), content_type: 'application/pdf' }), /PDF signature/);
});

test('downloads PDFs, deduplicates identical content and writes a manifest', async () => {
  const files = new Map();
  const result = await acquireGazetteDocuments({ records: [base, { ...base, title: 'Duplicate title' }], output_dir: '/out',
    now: () => new Date('2026-11-21T01:00:00Z'), fetch_impl: async () => new Response(pdf, { status: 200, headers: { 'content-type': 'application/pdf' } }),
    mkdir_impl: async () => {}, write_file_impl: async (path, data) => files.set(path, data) });
  assert.equal(result.downloaded_count, 1);
  assert.equal(result.duplicate_count, 1);
  assert.equal(files.size, 3);
  const rows = files.get('/out/manifest.jsonl').trim().split('\\n').map(JSON.parse);\n  assert.equal(rows.length, 2);\n  assert.match(rows[0].verification_status, /downloaded_pending_legal_review/);\n  assert.equal(rows[1].duplicate_of_sha256, rows[0].sha256);
});

test('rejects oversized responses before writing them', async () => {
  await assert.rejects(() => acquireGazetteDocuments({ records: [base], max_bytes: 8, output_dir: '/out',
    fetch_impl: async () => new Response(pdf, { status: 200 }), mkdir_impl: async () => {}, write_file_impl: async () => {} }), /exceeds max_bytes/);
});

test('rejects redirects that leave the registered government host set', async () => {
  await assert.rejects(() => acquireGazetteDocuments({ records: [base], output_dir: '/out',
    fetch_impl: async () => ({ ok: true, status: 200, url: 'https://attacker.example/payload.pdf', headers: new Headers(), arrayBuffer: async () => pdf }),
    mkdir_impl: async () => {}, write_file_impl: async () => {} }), /registered government source host/);
});
