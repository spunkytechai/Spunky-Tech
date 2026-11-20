import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNyaykoshLaw, normalizeGazetteInstrument, validateLegalInstrument, resolveVersionAtDate, buildAmendmentEvent, normalizeIndiaCodeRecord, fetchNyaykoshCatalog, fetchNyaykoshLaw } from '../lib/legislation.mjs';

test('normalizes Nyaykosh without treating it as Gazette-verified', () => {
  const law = normalizeNyaykoshLaw({ apiSlug:'it-act', title:'Information Technology Act', year:2000, status:'In force', provisions:[{number:'1'}] });
  assert.equal(law.external_id,'it-act'); assert.equal(law.record_type,'central_act');
  assert.equal(law.verification_status,'needs_primary_source_check'); assert.equal(law.metadata.provision_count,1);
  assert.equal(law.effective_from,null);
});
test('requires stable Nyaykosh slug and title', () => {
  assert.throws(()=>normalizeNyaykoshLaw({title:'Missing slug'}),/apiSlug/);
  assert.throws(()=>normalizeNyaykoshLaw({apiSlug:'x'}),/title/);
});
test('keeps Gazette publication and commencement dates distinct', () => {
  const item=normalizeGazetteInstrument({id:'GSR-1-E',title:'Rules',part:'II',section:'3',issueDate:'2026-04-01',commencementDate:'2026-05-01',documentUrl:'https://egazette.gov.in/a.pdf'});
  assert.equal(item.publication_date,'2026-04-01'); assert.equal(item.commencement_date,'2026-05-01'); assert.equal(item.effective_from,'2026-05-01');
});
test('requires HTTPS, publication date, type and jurisdiction', () => {
  const errors=validateLegalInstrument({title:'Rules',original_url:'http://example.com',publication_date:'bad',record_type:'rule',jurisdiction:'IN'});
  assert.ok(errors.some(x=>x.includes('HTTPS'))); assert.ok(errors.some(x=>x.includes('publication_date')));
});
test('resolves exactly one effective version', () => {
  const v=resolveVersionAtDate([{version_label:'old',effective_from:'2020-01-01',effective_to:'2022-01-01'},{version_label:'new',effective_from:'2022-01-01',effective_to:null}],'2023-06-01');
  assert.equal(v.version_label,'new');
});
test('returns null if no version is effective', () => assert.equal(resolveVersionAtDate([{effective_from:'2024-01-01',effective_to:null}],'2023-12-31'),null));
test('rejects overlapping version intervals', () => assert.throws(()=>resolveVersionAtDate([{effective_from:'2020-01-01',effective_to:'2025-01-01'},{effective_from:'2024-01-01',effective_to:null}],'2024-06-01'),/ambiguous/));
test('does not invent commencement for an amendment', () => {
  const e=buildAmendmentEvent({id:'ACT-1',title:'Amendment Act',publicationDate:'2025-02-01',amendsExternalId:'ACT-0'});
  assert.equal(e.publication_date,'2025-02-01'); assert.equal(e.commencement_date,null);
});
test('fetches and normalizes public Nyaykosh catalog', async () => {
  const rows=await fetchNyaykoshCatalog({fetchImpl:async()=>({ok:true,status:200,json:async()=>({laws:[{apiSlug:'it-act',title:'IT Act'}]})})});
  assert.equal(rows.length,1); assert.equal(rows[0].external_id,'it-act');
});
test('fetches one Nyaykosh law and reports HTTP errors', async () => {
  const law=await fetchNyaykoshLaw('it-act',{fetchImpl:async()=>({ok:true,status:200,json:async()=>({apiSlug:'it-act',title:'IT Act'})})});
  assert.equal(law.title,'IT Act');
  await assert.rejects(()=>fetchNyaykoshLaw('missing',{fetchImpl:async()=>({ok:false,status:404})}),/HTTP 404/);
});
test('normalizes India Code metadata with official-repository provenance and cross-check flag', () => {
  const r=normalizeIndiaCodeRecord({actId:'12345',title:'Example Act, 2024',actNumber:'12',year:2024,documentUrl:'https://www.indiacode.nic.in/handle/123456789/12345',enactmentDate:'2024-03-01'});
  assert.equal(r.external_id,'12345'); assert.equal(r.record_type,'central_act');
  assert.equal(r.source_authority,'official_government_repository'); assert.equal(r.verification_status,'needs_gazette_cross_check');
  assert.equal(r.commencement_date,null);
});
