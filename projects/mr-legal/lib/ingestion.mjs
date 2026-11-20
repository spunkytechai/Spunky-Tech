const safeDate = value => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

export function normalizeJudgmentMetadata(raw, context = {}) {
  const externalId = raw.cnr && raw.decision_date
    ? [raw.cnr, safeDate(raw.decision_date), raw.order_number].filter(Boolean).join('|')
    : raw.case_id || raw.citation || raw.path || raw.cnr || null;
  const courtNameFromCode = context.courtCode ? context.courtCodes?.[context.courtCode] : null;
  const isSupremeCourt = /supreme court/i.test(raw.court || '');
  const isMappedHighCourt = Boolean(context.courtCode && courtNameFromCode);
  return {
    external_id: externalId,
    title: String(raw.title || '').trim(),
    petitioner: raw.petitioner ?? null,
    respondent: raw.respondent ?? null,
    citation: raw.citation ?? null,
    decision_date: safeDate(raw.decision_date),
    court_id: isSupremeCourt ? 'IN-SC' : isMappedHighCourt ? `IN-HC-${context.courtCode}` : 'IN-HC-UNMAPPED',
    court_name: courtNameFromCode || raw.court || null,
    court_code: isMappedHighCourt ? context.courtCode : null,
    judge: raw.judge ?? null,
    author_judge: raw.author_judge ?? null,
    disposal_nature: raw.disposal_nature ?? null,
    order_number: raw.order_number ?? null,
    language_codes: Array.isArray(raw.available_languages) ? raw.available_languages : [],
    source_document_path: raw.path ?? null,
    source_record: raw,
    provenance: {
      source_id: context.sourceId ?? null,
      source_url: context.sourceUrl ?? null,
      license: context.license ?? 'unknown',
      captured_at: context.capturedAt ?? new Date().toISOString(),
      attribution_required: String(context.license || '').toUpperCase().includes('CC-BY')
    }
  };
}

export function validateIngestionRecord(record) {
  const errors = [];
  if (typeof record?.title !== 'string' || !record.title.trim()) errors.push('title is required');
  if (record?.decision_date && !safeDate(record.decision_date)) errors.push('decision_date must be a valid date');
  if (!record?.provenance?.source_id) errors.push('provenance.source_id is required');
  try {
    const url = new URL(record?.provenance?.source_url);
    if (!['https:', 'http:'].includes(url.protocol)) errors.push('provenance.source_url must use http(s)');
  } catch { errors.push('provenance.source_url must be a valid URL'); }
  return errors;
}

export function deduplicateRecords(records) {
  const byId = new Map();
  for (const record of records) {
    const key = record.external_id || `${record.title}|${record.decision_date || ''}`;
    const previous = byId.get(key);
    if (!previous || Date.parse(record.provenance?.captured_at || 0) >= Date.parse(previous.provenance?.captured_at || 0)) byId.set(key, record);
  }
  return [...byId.values()];
}

export function buildAttribution(dataset) {
  const license = String(dataset.license || '').replaceAll('-', ' ');
  return `${dataset.name} by ${dataset.publisher}. Source: ${dataset.url}. Licensed under ${license}; attribution retained by Mr.Legal.`;
}
