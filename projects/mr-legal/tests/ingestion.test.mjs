import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeJudgmentMetadata, validateIngestionRecord, deduplicateRecords, buildAttribution } from '../lib/ingestion.mjs';

test('normalizes Supreme Court metadata while preserving original fields and provenance', () => {
  const row = normalizeJudgmentMetadata({
    title: 'Example v. State', petitioner: 'Example', respondent: 'State',
    citation: '2024 INSC 1', case_id: 'SC/1/2024', decision_date: '2024-01-10',
    court: 'Supreme Court of India', year: 2024, path: 'data/pdf/year=2024/english/example.pdf'
  }, { sourceId: 'IN-SC-OPEN-DATA', sourceUrl: 'https://indian-supreme-court-judgments.s3.amazonaws.com/metadata/parquet/year=2024/metadata.parquet', license: 'CC-BY-4.0', capturedAt: '2026-11-21T00:00:00.000Z' });
  assert.equal(row.title, 'Example v. State');
  assert.equal(row.court_id, 'IN-SC');
  assert.equal(row.decision_date, '2024-01-10');
  assert.equal(row.provenance.source_id, 'IN-SC-OPEN-DATA');
  assert.equal(row.provenance.license, 'CC-BY-4.0');
});

test('rejects records without title, source identity, URL or valid date', () => {
  const errors = validateIngestionRecord({ title: '', decision_date: 'not-a-date', provenance: { source_id: '', source_url: 'javascript:alert(1)' } });
  assert.ok(errors.some(x => x.includes('title')));
  assert.ok(errors.some(x => x.includes('decision_date')));
  assert.ok(errors.some(x => x.includes('source_id')));
  assert.ok(errors.some(x => x.includes('source_url')));
});

test('deduplicates by stable external identifier and keeps the newest capture', () => {
  const records = [
    { external_id: 'SC/1', provenance: { captured_at: '2026-01-01T00:00:00.000Z' }, title: 'old' },
    { external_id: 'SC/1', provenance: { captured_at: '2026-02-01T00:00:00.000Z' }, title: 'new' },
    { external_id: 'SC/2', provenance: { captured_at: '2026-01-01T00:00:00.000Z' }, title: 'other' }
  ];
  const result = deduplicateRecords(records);
  assert.equal(result.length, 2);
  assert.equal(result.find(x => x.external_id === 'SC/1').title, 'new');
});

test('builds required attribution text for CC BY 4.0 dataset reuse', () => {
  assert.match(buildAttribution({ name: 'Indian Supreme Court Judgments', publisher: 'vanga contributors', url: 'https://github.com/vanga/indian-supreme-court-judgments', license: 'CC-BY-4.0' }), /CC BY 4.0/);
});

test('maps a High Court partition code using the supplied source registry', () => {
  const row = normalizeJudgmentMetadata({ title: 'A v B', cnr: 'ABC123', decision_date: '2024-02-03', court: 'Bombay High Court' }, {
    sourceId: 'IN-HC-OPEN-DATA', sourceUrl: 'https://example.org/metadata.parquet', courtCode: '27_1',
    courtCodes: { '27_1': 'Bombay High Court' }
  });
  assert.equal(row.court_id, 'IN-HC-27_1');
  assert.equal(row.court_name, 'Bombay High Court');
  assert.equal(row.external_id, 'ABC123|2024-02-03');
});

test('uses order number in High Court cross-source identity when available', () => {
  const row = normalizeJudgmentMetadata({ title: 'A v B', cnr: 'ABC123', decision_date: '2024-02-03', order_number: 'ORD-9' }, {
    sourceId: 'IN-HC-OPEN-DATA', sourceUrl: 'https://example.org/metadata.parquet', courtCode: '27_1',
    courtCodes: { '27_1': 'Bombay High Court' }
  });
  assert.equal(row.external_id, 'ABC123|2024-02-03|ORD-9');
});

test('does not guess an unknown High Court partition mapping', () => {
  const row = normalizeJudgmentMetadata({ title: 'A v B', cnr: 'ABC123', decision_date: '2024-02-03' }, {
    sourceId: 'IN-HC-OPEN-DATA', sourceUrl: 'https://example.org/metadata.parquet', courtCode: '99_99', courtCodes: {}
  });
  assert.equal(row.court_id, 'IN-HC-UNMAPPED');
});
