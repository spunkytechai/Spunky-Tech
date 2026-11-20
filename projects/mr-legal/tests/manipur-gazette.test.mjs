import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeManipurGazetteListing, normalizeManipurGazetteDetail, buildManipurGazetteDownloadUrl } from '../lib/manipur-gazette.mjs';

test('normalizes Manipur current extraordinary Gazette listing rows', () => {
  const rows = normalizeManipurGazetteListing([
    { gazette_id:'282/EG/2026-27/20-11-2026', publication_date:'20-11-2026', type:'E.G.', title:'Notification' },
    { gazette_id:'13/WG/2026-27/18-11-2026', publication_date:'18-11-2026', type:'W.G.', title:'Weekly notification' }
  ]);
  assert.equal(rows.length,2);
  assert.equal(rows[0].record_type,'extraordinary_gazette');
  assert.equal(rows[1].record_type,'weekly_gazette');
  assert.equal(rows[0].legal_effect_verified,false);
});

test('constructs official OPENFILE1 link with encoded Gazette id', () => {
  const url=buildManipurGazetteDownloadUrl('282/EG/2026-27/20-11-2026','SPECIAL');
  assert.ok(url.startsWith('https://egazettemanipur.mn.gov.in/OPENFILE1.aspx?'));
  assert.ok(url.includes('282%2FEG%2F2026-27'));
  assert.ok(url.includes('etype=SPECIAL'));
});

test('normalizes detail capture and extracts department and title only from observed fields', () => {
  const row=normalizeManipurGazetteDetail({
    gazette_id:'282/EG/2026-27/20-11-2026', publication_date:'20-11-2026',
    type:'SPECIAL', department:'Finance Department', title:'Finance Rules Amendment',
    detail_url:'https://egazettemanipur.mn.gov.in/OPENFILE1.aspx?ID=282&etype=SPECIAL'
  });
  assert.equal(row.issuing_authority,'Finance Department');
  assert.equal(row.title,'Finance Rules Amendment');
  assert.equal(row.publication_date,'2026-11-20');
  assert.equal(row.verification_status,'primary_source_document_pending_review');
});

test('rejects invalid Manipur Gazette dates and unknown detail hosts', () => {
  assert.throws(()=>normalizeManipurGazetteDetail({
    gazette_id:'x', publication_date:'99-99-2026', type:'SPECIAL', detail_url:'https://evil.example/a'
  }));
});
