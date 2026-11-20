import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SOURCES = new Map([
  ['IN-EGAZETTE-CENTRAL', { hosts: ['egazette.gov.in'], jurisdiction: 'IN-CENTRAL' }],
  ['IN-AP-EGAZETTE', { hosts: ['apegazette.cgg.gov.in'], jurisdiction: 'IN-AP' }],
  ['IN-KERALA-COMPOSE', { hosts: ['compose.kerala.gov.in', 'gazette.kerala.gov.in'], jurisdiction: 'IN-KL' }],
  ['IN-MANIPUR-EGAZETTE', { hosts: ['manipurgovtpress.nic.in', 'egazettemanipur.mn.gov.in', 'egazette.mn.gov.in'], jurisdiction: 'IN-MN' }],
  ['IN-TELANGANA-EGAZETTE', { hosts: ['tggazette.cgg.gov.in'], jurisdiction: 'IN-TS' }],
  ['IN-HARYANA-EGAZETTE', { hosts: ['egazetteharyana.gov.in'], jurisdiction: 'IN-HR' }],
  ['IN-JK-GAZETTE', { hosts: ['rgp.jk.gov.in'], jurisdiction: 'IN-JK' }]
]);
const isTimestamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) && !Number.isNaN(Date.parse(value));
function officialHttpsUrl(value, source) {
  let url;
  try { url = new URL(value); } catch { throw new Error('source_url and document_url must be valid HTTPS URLs'); }
  if (url.protocol !== 'https:' || !source.hosts.includes(url.hostname) || url.username || url.password) {
    throw new Error('URLs must use the registered government source host over HTTPS');
  }
  return url;
}

export function normalizeGazetteDownload(input) {
  const source = SOURCES.get(input?.source_id);
  if (!source) throw new Error('source_id is not a registered Gazette source');
  if (!input.title?.trim()) throw new Error('title is required');
  if (input.jurisdiction !== source.jurisdiction) throw new Error('jurisdiction does not match registered source');
  if (!isTimestamp(input.captured_at)) throw new Error('captured_at must be an ISO timestamp in UTC');
  officialHttpsUrl(input.source_url, source);
  officialHttpsUrl(input.document_url, source);
  const finalUrl = officialHttpsUrl(input.final_url ?? input.document_url, source);
  if (!Buffer.isBuffer(input.bytes) || input.bytes.length < 8 || !input.bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new Error('download does not have a valid PDF signature');
  }
  const sha256 = createHash('sha256').update(input.bytes).digest('hex');
  return {
    source_id: input.source_id, source_url: input.source_url, document_url: input.document_url,
    final_url: finalUrl.toString(), title: input.title.trim(), jurisdiction: source.jurisdiction,
    publication_date: input.publication_date ?? null, commencement_date: input.commencement_date ?? null,
    notification_number: input.notification_number ?? null, record_type: input.record_type ?? 'gazette_instrument',
    captured_at: input.captured_at, downloaded_at: input.downloaded_at ?? input.captured_at,
    sha256, byte_length: input.bytes.length, media_type: 'application/pdf',
    verification_status: 'downloaded_pending_legal_review', legal_effect_verified: false,
    legal_review_required: true
  };
}

export async function acquireGazetteDocuments({ records, output_dir, fetch_impl = globalThis.fetch,
  write_file_impl = writeFile, mkdir_impl = mkdir, now = () => new Date(), max_bytes = 25 * 1024 * 1024,
  timeout_ms = 30000 } = {}) {
  if (!Array.isArray(records)) throw new Error('records must be an array');
  if (!output_dir) throw new Error('output_dir is required');
  if (typeof fetch_impl !== 'function') throw new Error('fetch implementation is unavailable');
  if (!Number.isSafeInteger(max_bytes) || max_bytes < 1) throw new Error('max_bytes must be a positive safe integer');
  const output = resolve(output_dir);
  await mkdir_impl(output, { recursive: true });
  const manifest = [], seen = new Set();
  let duplicate_count = 0, downloaded_count = 0;
  for (const record of records) {
    const source = SOURCES.get(record?.source_id);
    if (!source) throw new Error('source_id is not a registered Gazette source');
    officialHttpsUrl(record.source_url, source);
    const requestedUrl = officialHttpsUrl(record.document_url, source);
    const response = await fetch_impl(requestedUrl.toString(), { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(timeout_ms), headers: { accept: 'application/pdf,application/octet-stream;q=0.9' } });
    if (!response.ok) throw new Error(\`download failed with HTTP ${response.status} for ${requestedUrl.hostname}\`);
    const finalUrl = response.url || requestedUrl.toString();
    officialHttpsUrl(finalUrl, source);
    const contentLength = Number(response.headers?.get?.('content-length'));
    if (Number.isFinite(contentLength) && contentLength > max_bytes) throw new Error(\`document exceeds max_bytes (${max_bytes})\`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > max_bytes) throw new Error(\`document exceeds max_bytes (${max_bytes})\`);
    const capturedAt = now().toISOString();
    const row = normalizeGazetteDownload({ ...record, final_url: finalUrl, bytes, captured_at: record.captured_at ?? capturedAt, downloaded_at: capturedAt });
    const fileName = \`${row.sha256}.pdf\`;
    if (seen.has(row.sha256)) {
      duplicate_count += 1;
      manifest.push({ ...row, file_name: fileName, duplicate_of_sha256: row.sha256 });
      continue;
    }
    seen.add(row.sha256);
    await write_file_impl(resolve(output, fileName), bytes, { flag: 'wx' }).catch(async error => {
      if (error?.code !== 'EEXIST') throw error;
    });
    downloaded_count += 1;
    manifest.push({ ...row, file_name: fileName });
  }
  const jsonl = manifest.map(row => JSON.stringify(row)).join('\n') + (manifest.length ? '\n' : '');
  await write_file_impl(resolve(output, 'manifest.jsonl'), jsonl, 'utf8');
  const summary = {
    captured_at: now().toISOString(), requested_count: records.length, manifest_record_count: manifest.length, downloaded_count,
    duplicate_count, failed_count: 0, legal_effect_verified_count: 0,
    note: 'PDF integrity and provenance captured. No document is legally verified by acquisition alone.'
  };
  await write_file_impl(resolve(output, 'acquisition-summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
  return summary;
}
