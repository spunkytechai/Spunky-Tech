import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStateGazetteCapture, parseStateGazetteListing, buildGazetteDocumentRecord } from '../lib/state-gazettes.mjs';

test('normalizes an official state gazette capture with archive-era scope', () => {
  const row = normalizeStateGazetteCapture({
    source_id:'IN-MANIPUR-EGAZETTE',
    source_url:'https://manipurgovtpress.nic.in/en/gazette/',
    document_url:'https://egazettemanipur.mn.gov.in/file/123.pdf',
    title:'Extraordinary Gazette',
    jurisdiction:'IN-MN',
    captured_at:'2026-11-21T00:00:00Z',
    publication_date:'2026-08-05',
    notification_number:'No. 123'
  });
  assert.equal(row.jurisdiction,'IN-MN');
  assert.equal(row.verification_status,'primary_source_document_pending_review');
});

test('rejects an archive-era mismatch or non-government source URL', () => {
  assert.throws(() => normalizeStateGazetteCapture({
    source_id:'IN-MANIPUR-EGAZETTE',
    source_url:'https://manipurgovtpress.nic.in/en/gazette/',
    document_url:'https://example.com/fake.pdf',
    title:'Fake Gazette',jurisdiction:'IN-MN',captured_at:'2026-11-21T00:00:00Z'
  }), /registered government source host/);
});

test('parses observed listing metadata without promoting a search snippet into a legal claim', () => {
  const rows = parseStateGazetteListing({
    source_id:'IN-MANIPUR-EGAZETTE',
    records:[{title:'Weekly Gazette',href:'https://egazettemanipur.mn.gov.in/abc.pdf',date:'2025-08-06',type:'weekly'}]
  });
  assert.equal(rows.length,1);
  assert.equal(rows[0].record_type,'weekly');
  assert.equal(rows[0].legal_effect_verified,false);
});

test('computes SHA-256 from captured bytes and preserves separate publication/commencement dates', () => {
  const row = buildGazetteDocumentRecord({
    source_id:'IN-KERALA-COMPOSE',
    source_url:'https://compose.kerala.gov.in/home',
    document_url:'https://compose.kerala.gov.in/files/gazette.pdf',
    title:'Kerala Gazette',
    jurisdiction:'IN-KL',
    captured_at:'2026-11-21T00:00:00Z',
    publication_date:'2026-10-01',
    commencement_date:'2026-10-15',
    bytes:Buffer.from('gazette-pdf-placeholder')
  });
  assert.match(row.sha256,/^[a-f0-9]{64}$/);
  assert.equal(row.publication_date,'2026-10-01');
  assert.equal(row.commencement_date,'2026-10-15');
});
