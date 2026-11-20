const validDate = value => {
  if (typeof value !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
};
const first = (...values) => values.find(value => value !== undefined && value !== null && value !== '');
const safeHttps = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.toString() : null; } catch { return null; } };

export function normalizeNyaykoshLaw(raw) {
  const slug = first(raw?.apiSlug, raw?.slug, raw?.api_slug);
  const title = first(raw?.title, raw?.name, raw?.shortTitle, raw?.short_title);
  if (!slug || typeof slug !== 'string') throw new Error('Nyaykosh apiSlug is required');
  if (!title || typeof title !== 'string') throw new Error('Nyaykosh title is required');
  const provisions = first(raw.provisions, raw.sections, []);
  const pdfUrl = safeHttps(first(raw.pdfUrl, raw.pdf_url, raw.documents?.pdf));
  const xmlUrl = safeHttps(first(raw.xmlUrl, raw.xml_url, raw.documents?.xml));
  const lawUrl = `https://lawascode.negd.in/laws/${encodeURIComponent(slug)}`;
  const lastUpdated = validDate(first(raw.lastUpdated, raw.last_updated, raw.updatedAt));
  const enactmentYear = Number(first(raw.year, raw.enactmentYear, raw.enactment_year)) || null;
  return {
    external_id: slug, title: title.trim(), record_type: /rule/i.test(title) ? 'rule' : 'central_act',
    jurisdiction: 'IN', issuing_authority: first(raw.authority, raw.issuingAuthority, 'Government of India'),
    original_url: lawUrl, publication_date: validDate(first(raw.publicationDate, raw.publication_date)),
    commencement_date: validDate(first(raw.commencementDate, raw.commencement_date, raw.effectiveFrom, raw.effective_from)),
    effective_from: validDate(first(raw.commencementDate, raw.commencement_date, raw.effectiveFrom, raw.effective_from)),
    effective_to: validDate(first(raw.effectiveTo, raw.effective_to)), legal_status: 'unverified',
    verification_status: 'needs_primary_source_check', source_authority: 'government_structured_secondary',
    metadata: { source: 'Nyaykosh / NeGD', api_slug: slug, enacted_year: enactmentYear,
      reported_status: first(raw.status, raw.legalStatus, null), last_updated: lastUpdated,
      provision_count: Array.isArray(provisions) ? provisions.length : null, provisions,
      pdf_url: pdfUrl, xml_url: xmlUrl, official_gazette_verification_required: true, raw_source: raw }
  };
}

export function normalizeGazetteInstrument(raw) {
  const title = first(raw?.title, raw?.subject, raw?.notificationTitle);
  const url = safeHttps(first(raw?.documentUrl, raw?.document_url, raw?.pdfUrl, raw?.url));
  if (!title || !url) throw new Error('Gazette title and HTTPS document URL are required');
  const publicationDate = validDate(first(raw.issueDate, raw.issue_date, raw.publicationDate, raw.publication_date));
  const commencementDate = validDate(first(raw.commencementDate, raw.commencement_date, raw.effectiveFrom, raw.effective_from));
  return {
    external_id: first(raw.id, raw.notificationNumber, raw.notification_number, null),
    title: title.trim(), record_type: first(raw.recordType, raw.record_type, 'gazette_notification'),
    jurisdiction: first(raw.jurisdiction, 'IN'),
    issuing_authority: first(raw.issuingAuthority, raw.issuing_authority, raw.ministry, null),
    citation: first(raw.notificationNumber, raw.notification_number, raw.gazetteCitation, null),
    original_url: url, publication_date: publicationDate, commencement_date: commencementDate,
    effective_from: commencementDate, effective_to: validDate(first(raw.effectiveTo, raw.effective_to)),
    legal_status: 'unverified', verification_status: 'source_document_pending_review',
    source_authority: 'primary_gazette_document',
    metadata: { part: first(raw.part, null), section: first(raw.section, null), issue_date: publicationDate,
      commencement_date_explicit: Boolean(commencementDate),
      notification_number: first(raw.notificationNumber, raw.notification_number, null),
      parent_instrument: first(raw.parentInstrument, raw.parent_instrument, null), scan_or_ocr_review_required: true }
  };
}

export function normalizeIndiaCodeRecord(raw) {
  const id = first(raw?.actId, raw?.act_id, raw?.id, raw?.handle);
  const title = first(raw?.title, raw?.actTitle, raw?.act_title);
  const url = safeHttps(first(raw?.documentUrl, raw?.document_url, raw?.url, raw?.permalink));
  if (!id) throw new Error('India Code actId is required');
  if (!title) throw new Error('India Code title is required');
  if (!url) throw new Error('India Code HTTPS document URL is required');
  const enactmentDate = validDate(first(raw.enactmentDate, raw.enactment_date));
  const type = String(first(raw.type, raw.category, 'central_act')).toLowerCase();
  return {
    external_id: String(id), title: String(title).trim(),
    record_type: /state/.test(type) ? 'state_act' : /rule|regulation|notification|order|ordinance|circular/.test(type) ? type.replaceAll(' ', '_') : 'central_act',
    jurisdiction: first(raw.jurisdiction, raw.stateCode ? `IN-${raw.stateCode}` : 'IN'),
    issuing_authority: first(raw.ministry, raw.department, 'Legislative Department, Ministry of Law and Justice'),
    citation: first(raw.actNumber && raw.year ? `Act ${raw.actNumber} of ${raw.year}` : null, raw.citation, null),
    original_url: url, publication_date: enactmentDate,
    commencement_date: validDate(first(raw.commencementDate, raw.commencement_date)),
    effective_from: validDate(first(raw.commencementDate, raw.commencement_date)), effective_to: null,
    legal_status: 'unverified', verification_status: 'needs_gazette_cross_check',
    source_authority: 'official_government_repository',
    metadata: { year: Number(first(raw.year, raw.actYear, raw.act_year)) || null,
      act_number: first(raw.actNumber, raw.act_number, null), enactment_date: enactmentDate, raw_source: raw }
  };
}

export function validateLegalInstrument(record) {
  const errors = [];
  if (!record?.title?.trim?.()) errors.push('title is required');
  if (!safeHttps(record?.original_url)) errors.push('original_url must be an HTTPS URL');
  if (!validDate(record?.publication_date)) errors.push('publication_date must be a valid ISO date');
  if (!record?.record_type) errors.push('record_type is required');
  if (!record?.jurisdiction) errors.push('jurisdiction is required');
  for (const field of ['commencement_date', 'effective_from', 'effective_to']) {
    if (record?.[field] !== null && record?.[field] !== undefined && !validDate(record[field])) errors.push(`${field} must be a valid ISO date`);
  }
  if (record?.effective_from && record?.effective_to && record.effective_to <= record.effective_from) errors.push('effective_to must be after effective_from');
  return errors;
}

export function resolveVersionAtDate(versions, date) {
  if (!validDate(date)) throw new Error('Requested date must be a valid ISO date');
  const active = versions.filter(version => {
    if (!validDate(version.effective_from)) return false;
    const start = version.effective_from, end = version.effective_to ?? null;
    if (end !== null && !validDate(end)) throw new Error('Version effective_to must be a valid ISO date');
    if (end !== null && end <= start) throw new Error('Version effective_to must be after effective_from');
    return start <= date && (end === null || date < end);
  });
  if (active.length > 1) throw new Error('Legal version timeline is ambiguous: overlapping effective intervals');
  return active[0] ?? null;
}

export function buildAmendmentEvent(input) {
  if (!input?.id || !input?.title) throw new Error('Amendment id and title are required');
  return { external_id: input.id, title: input.title,
    publication_date: validDate(input.publicationDate ?? input.publication_date),
    commencement_date: validDate(input.commencementDate ?? input.commencement_date),
    amends_external_id: input.amendsExternalId ?? input.amends_external_id ?? null,
    affected_provisions: Array.isArray(input.affectedProvisions) ? input.affectedProvisions : [],
    verification_status: 'needs_primary_source_check' };
}

function listFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ['laws', 'items', 'results', 'data']) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.[key]?.laws)) return payload[key].laws;
  }
  throw new Error('Nyaykosh API response did not contain a recognized law list');
}
export async function fetchNyaykoshCatalog({ fetchImpl = fetch, baseUrl = 'https://lawascode.negd.in/laac-api/v1' } = {}) {
  const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/laws`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Nyaykosh catalog request failed: HTTP ${response.status}`);
  return listFromPayload(await response.json()).map(normalizeNyaykoshLaw);
}
export async function fetchNyaykoshLaw(slug, { fetchImpl = fetch, baseUrl = 'https://lawascode.negd.in/laac-api/v1' } = {}) {
  if (!slug || typeof slug !== 'string') throw new Error('Nyaykosh apiSlug is required');
  const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/laws/${encodeURIComponent(slug)}`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Nyaykosh law request failed: HTTP ${response.status}`);
  return normalizeNyaykoshLaw(await response.json());
}
