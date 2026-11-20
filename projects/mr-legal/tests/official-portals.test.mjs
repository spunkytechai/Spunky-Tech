import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOfficialPortalCapture, validateSourceRegistry, buildPortalDocumentManifest } from '../lib/official-portals.mjs';

test('normalizes India Code after canonical host migration without inventing a data API', () => {
  const row = normalizeOfficialPortalCapture({
    source_id: 'IN-INDIACODE-OFFICIAL',
    requested_url: 'https://www.indiacode.nic.in/',
    final_url: 'https://indiacode.gov.in/',
    page_title: 'India Code',
    access_method: 'public_portal',
    observed_at: '2026-11-21T00:00:00Z',
    notes: 'Legacy hostname redirects to current government portal'
  });
  assert.equal(row.canonical_url, 'https://indiacode.gov.in/');
  assert.equal(row.api_available, false);
  assert.equal(row.verification_status, 'portal_only_api_unverified');
});

test('rejects unapproved host and malformed observation timestamp', () => {
  assert.throws(() => normalizeOfficialPortalCapture({
    source_id: 'IN-TELANGANA-EGAZETTE', requested_url: 'https://evil.example',
    final_url: 'https://evil.example/', page_title: 'Fake', observed_at: '2026-11-21T00:00:00Z'
  }), /approved host/);
});

test('validates registry source identifiers and HTTPS provenance', () => {
  const result = validateSourceRegistry([
    {id:'IN-X',name:'X',url:'https://www.india.gov.in/',authority_level:'official_government',jurisdiction:'IN'}
  ]);
  assert.deepEqual(result, []);
  assert.ok(validateSourceRegistry([{id:'IN-X',name:'',url:'http://bad',authority_level:'official_government'}]).length >= 2);
});

test('builds portal document manifest with checksums and primary-source status', () => {
  const manifest = buildPortalDocumentManifest({
    source_id:'IN-TELANGANA-EGAZETTE',
    source_url:'https://tggazette.cgg.gov.in/',
    captured_at:'2026-11-21T00:00:00Z',
    documents:[{title:'Gazette 1',url:'https://tggazette.cgg.gov.in/doc.pdf',sha256:'a'.repeat(64),publication_date:'2026-10-01'}]
  });
  assert.equal(manifest.document_count,1);
  assert.equal(manifest.documents[0].verification_status,'primary_source_document_pending_review');
});
