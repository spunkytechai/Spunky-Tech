const validDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
};
const httpsUrl = value => {
  try { const u = new URL(value); return u.protocol === 'https:' ? u : null; }
  catch { return null; }
};
const approvedHost = host => host === 'gov.in' || host.endsWith('.gov.in') || host === 'nic.in' || host.endsWith('.nic.in');
const secondaryDatasetHost = host => host === 'github.com' || host.endsWith('.github.io') || host === 'registry.opendata.aws' || host.endsWith('.amazonaws.com') || host.endsWith('.s3.amazonaws.com');

export function normalizeOfficialPortalCapture(input) {
  if (!input?.source_id) throw new Error('source_id is required');
  if (!input?.page_title?.trim()) throw new Error('page_title is required');
  if (!validDate(input.observed_at)) throw new Error('observed_at must be an ISO timestamp in UTC');
  const requested = httpsUrl(input.requested_url);
  const final = httpsUrl(input.final_url);
  if (!requested || !final || !approvedHost(requested.hostname) || !approvedHost(final.hostname)) {
    throw new Error('requested_url and final_url must use an approved host');
  }
  return {
    source_id: input.source_id,
    requested_url: requested.toString(),
    canonical_url: final.toString(),
    page_title: input.page_title.trim(),
    observed_at: input.observed_at,
    api_available: false,
    access_method: input.access_method ?? 'public_portal',
    verification_status: 'portal_only_api_unverified',
    notes: input.notes ?? null,
    evidence: input.evidence ?? {}
  };
}

export function validateSourceRegistry(rows) {
  const errors = [];
  const ids = new Set();
  if (!Array.isArray(rows)) return ['source registry must be an array'];
  for (const [index, row] of rows.entries()) {
    const prefix = `row ${index + 1}`;
    if (!row?.id || typeof row.id !== 'string') errors.push(`${prefix}: id is required`);
    else if (ids.has(row.id)) errors.push(`${prefix}: duplicate id ${row.id}`);
    else ids.add(row.id);
    if (!row?.name?.trim?.()) errors.push(`${prefix}: name is required`);
    const url = httpsUrl(row?.url);
    if (!url) errors.push(`${prefix}: url must be HTTPS`);
    else {
      const approved = row.authority_level === 'secondary_dataset_from_public_court_records'
        ? secondaryDatasetHost(url.hostname)
        : (Array.isArray(row.approved_hosts) && row.approved_hosts.includes(url.hostname));
      if (!approved) errors.push(`${prefix}: url host must match its explicit source host allowlist`);
    }
    if (!row?.authority_level) errors.push(`${prefix}: authority_level is required`);
    if (!row?.jurisdiction) errors.push(`${prefix}: jurisdiction is required`);
  }
  return errors;
}

export function buildPortalDocumentManifest({ source_id, source_url, captured_at, documents }) {
  if (!source_id) throw new Error('source_id is required');
  if (!httpsUrl(source_url) || !approvedHost(new URL(source_url).hostname)) throw new Error('source_url must use an approved government host');
  if (!validDate(captured_at)) throw new Error('captured_at must be an ISO timestamp in UTC');
  if (!Array.isArray(documents)) throw new Error('documents must be an array');
  const normalized = documents.map((doc, index) => {
    if (!doc?.title?.trim()) throw new Error(`document ${index + 1}: title is required`);
    if (!httpsUrl(doc.url)) throw new Error(`document ${index + 1}: URL must be HTTPS`);
    if (!/^[a-f0-9]{64}$/i.test(doc.sha256 ?? '')) throw new Error(`document ${index + 1}: SHA-256 is invalid`);
    if (doc.publication_date && !/^\d{4}-\d{2}-\d{2}$/.test(doc.publication_date)) throw new Error(`document ${index + 1}: publication date is invalid`);
    return { ...doc, verification_status: 'primary_source_document_pending_review' };
  });
  return { source_id, source_url, captured_at, document_count: normalized.length,
    documents: normalized, completeness_status: 'unknown_until_reconciled' };
}
