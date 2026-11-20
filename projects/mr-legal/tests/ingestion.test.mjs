import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeJudgmentMetadata, validateIngestionRecord, deduplicateRecords, buildAttribution } from '../lib/ingestion.mjs';

test('normalizes Supreme Court metadata and retains provenance', () => {
  const row = normalizeJudgmentMetadata({ title:'Example v State', citation:'2024 INSC 1', decision_date:'2024-01-10', court:'Supreme Court of India' }, { sourceId:'IN-SC-OPEN-DATA', sourceUrl:'https://example.org/metadata.parquet', license:'CC-BY-4.0', capturedAt:'2026-11-21T00:00:00.000Z' });
  assert.equal(row.court_id, 'IN-SC');
  assert.equal(row.decision_date, '2024-01-10');
  assert.equal(row.provenance.source_id, 'IN-SC-OPEN-DATA');
  assert.equal(row.provenance.attribution_required, true);
});

test('rejects records without title, valid date, source identity or safe source URL', () => {
  const errors = validateIngestionRecord({ title:'', decision_date:'not-a-date', provenance:{ source_id:'', source_url:'javascript:alert(1)' } });
  assert.ok(errors.some(x => x.includes('title')));
  assert.ok(errors.some(x => x.includes('decision_date')));
  assert.ok(errors.some(x => x.includes('source_id')));
  assert.ok(errors.some(x => x.includes('source_url')));
});

test('deduplicates by stable external identifier and keeps newest capture', () => {
  const result = deduplicateRecords([
    { external_id:'SC/1', provenance:{captured_at:'2026-01-01T00:00:00Z'}, title:'old' },
    { external_id:'SC/1', provenance:{captured_at:'2026-02-01T00:00:00Z'}, title:'new' }
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'new');
});

test('creates attribution string for CC BY data', () => {
  assert.match(buildAttribution({name:'Dataset',publisher:'Contributors',url:'https://example.org',license:'CC-BY-4.0'}), /CC BY 4.0/);
});
