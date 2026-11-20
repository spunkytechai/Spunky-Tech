import { createHash } from 'node:crypto';

const isDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const isTimestamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) && !Number.isNaN(Date.parse(value));
const asHttps = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u : null; } catch { return null; } };
const sources = new Map([
  ['IN-AP-EGAZETTE', { host: 'apegazette.cgg.gov.in', jurisdiction: 'IN-AP' }],
  ['IN-KERALA-COMPOSE', { host: 'compose.kerala.gov.in', jurisdiction: 'IN-KL' }],
  ['IN-MANIPUR-EGAZETTE', { host: 'manipurgovtpress.nic.in', jurisdiction: 'IN-MN' }],
  ['IN-TELANGANA-EGAZETTE', { host: 'tggazette.cgg.gov.in', jurisdiction: 'IN-TS' }],
  ['IN-HARYANA-EGAZETTE', { host: 'egazetteharyana.gov.in', jurisdiction: 'IN-HR' }],
  ['IN-JK-GAZETTE', { host: 'rgp.jk.gov.in', jurisdiction: 'IN-JK' }]
]);

function assertPortalUrls(sourceId, sourceUrl, documentUrl) {
  const source = sources.get(sourceId);
  if (!source) throw new Error('source_id is not a registered state Gazette source');
  const sourceParsed = asHttps(sourceUrl), documentParsed = asHttps(documentUrl);
  if (!sourceParsed || !documentParsed) throw new Error('source_url and document_url must be HTTPS URLs');
  const allowedDocumentHosts = new Set([source.host]);
  if (sourceId === 'IN-KERALA-COMPOSE') allowedDocumentHosts.add('gazette.kerala.gov.in');
  if (sourceId === 'IN-MANIPUR-EGAZETTE') { allowedDocumentHosts.add('egazettemanipur.mn.gov.in'); allowedDocumentHosts.add('egazette.mn.gov.in'); }
  if (!allowedDocumentHosts.has(sourceParsed.hostname) || !allowedDocumentHosts.has(documentParsed.hostname)) {
    throw new Error('URLs must use the registered government source host');
  }
  return source;
}

export function normalizeStateGazetteCapture(input) {
  if (!input?.source_id || !input?.title?.trim()) throw new Error('source_id and title are required');
  if (!isTimestamp(input.captured_at)) throw new Error('captured_at must be an ISO timestamp in UTC');
  const source = assertPortalUrls(input.source_id, input.source_url, input.document_url);
  if (input.jurisdiction !== source.jurisdiction) throw new Error('jurisdiction does not match registered source');
  if (input.publication_date && !isDate(input.publication_date)) throw new Error('publication_date must be a valid ISO date');
  if (input.commencement_date && !isDate(input.commencement_date)) throw new Error('commencement_date must be a valid ISO date');
  if (input.publication_date && input.commencement_date && input.commencement_date < input.publication_date) {
    throw new Error('commencement_date cannot precede publication_date without an explicit historical explanation');
  }
  return {
    source_id: input.source_id, source_url: input.source_url, document_url: input.document_url,
    title: input.title.trim(), jurisdiction: source.jurisdiction, publication_date: input.publication_date ?? null,
    commencement_date: input.commencement_date ?? null, notification_number: input.notification_number ?? null,
    record_type: input.record_type ?? 'gazette_instrument', captured_at: input.captured_at,
    verification_status: 'primary_source_document_pending_review',
    legal_effect_verified: false, metadata: input.metadata ?? {}
  };
}

export function parseStateGazetteListing({ source_id, records }) {
  if (!sources.has(source_id)) throw new Error('source_id is not a registered state Gazette source');
  if (!Array.isArray(records)) throw new Error('records must be an array');
  return records.flatMap(record => {
    if (!record?.title || !record?.href) return [];
    const source = sources.get(source_id);
    const url = asHttps(record.href);
    if (!url) return [];
    const allowed = sourceIdAllowedDocumentHost(source_id, url.hostname);
    if (!allowed) return [];
    return [{
      source_id, title: String(record.title).trim(), document_url: url.toString(),
      publication_date: isDate(record.date) ? record.date : null,
      record_type: record.type ?? 'gazette_instrument', jurisdiction: source.jurisdiction,
      legal_effect_verified: false, verification_status: 'listing_metadata_only'
    }];
  });
}
function sourceIdAllowedDocumentHost(sourceId, host) {
  const source = sources.get(sourceId);
  if (host === source.host) return true;
  return sourceId === 'IN-KERALA-COMPOSE' && host === 'gazette.kerala.gov.in' ||
    sourceId === 'IN-MANIPUR-EGAZETTE' && ['egazettemanipur.mn.gov.in','egazette.mn.gov.in'].includes(host);
}

export function buildGazetteDocumentRecord(input) {
  const normalized = normalizeStateGazetteCapture(input);
  if (!Buffer.isBuffer(input.bytes) || input.bytes.length === 0) throw new Error('non-empty captured document bytes are required');
  const sha256 = createHash('sha256').update(input.bytes).digest('hex');
  return { ...normalized, sha256, byte_length: input.bytes.length, media_type: input.media_type ?? 'application/pdf' };
}
