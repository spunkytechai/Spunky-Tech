import { createHash } from 'node:crypto';

const isIsoDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
function parseDdMmYyyy(value) {
  if (typeof value !== 'string') return null;
  const match=value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const iso=`${match[3]}-${match[2]}-${match[1]}`;
  return isIsoDate(iso) ? iso : null;
}
const officialHost='egazettemanipur.mn.gov.in';
const legacyHost='egazette.mn.gov.in';
const pressHost='manipurgovtpress.nic.in';
function normalizeType(value) {
  const text=String(value??'').toUpperCase();
  if (text.includes('W.G.') || text.includes('WEEKLY')) return {record_type:'weekly_gazette',etype:'NSPECIAL'};
  if (text.includes('E.G.') || text.includes('EXTRA')) return {record_type:'extraordinary_gazette',etype:'SPECIAL'};
  return {record_type:'gazette_instrument',etype:'SPECIAL'};
}
export function normalizeManipurGazetteListing(records) {
  if (!Array.isArray(records)) throw new Error('records must be an array');
  return records.flatMap(record=>{
    const id=String(record?.gazette_id??record?.id??'').trim();
    const publicationDate=parseDdMmYyyy(record?.publication_date??record?.date);
    if (!id || !publicationDate) return [];
    const type=normalizeType(record.type??record.etype);
    return [{
      source_id:'IN-MANIPUR-EGAZETTE',
      jurisdiction:'IN-MN',
      gazette_id:id,
      title:String(record.title??'Gazette issue').trim(),
      publication_date:publicationDate,
      record_type:type.record_type,
      etype:record.etype??type.etype,
      detail_url:buildManipurGazetteDownloadUrl(id,record.etype??type.etype),
      legal_effect_verified:false,
      verification_status:'listing_metadata_only'
    }];
  });
}
export function buildManipurGazetteDownloadUrl(gazetteId,etype='SPECIAL') {
  if (typeof gazetteId!=='string' || !gazetteId.trim()) throw new Error('gazette_id is required');
  if (!['SPECIAL','NSPECIAL'].includes(etype)) throw new Error('etype must be SPECIAL or NSPECIAL');
  const url=new URL('/OPENFILE1.aspx',`https://${officialHost}`);
  url.searchParams.set('ID',gazetteId.trim());
  url.searchParams.set('etype',etype);
  return url.toString();
}
export function normalizeManipurGazetteDetail(input) {
  const gazetteId=String(input?.gazette_id??'').trim();
  if (!gazetteId) throw new Error('gazette_id is required');
  const publicationDate=parseDdMmYyyy(input.publication_date);
  if (!publicationDate) throw new Error('publication_date must be DD-MM-YYYY');
  const detailUrl=new URL(input.detail_url);
  if (detailUrl.protocol!=='https:' || ![officialHost,legacyHost,pressHost].includes(detailUrl.hostname)) {
    throw new Error('detail_url must be on the registered official Manipur Gazette host');
  }
  if (!detailUrl.pathname.toLowerCase().includes('openfile1') && !detailUrl.pathname.toLowerCase().includes('details_gazzete')) {
    throw new Error('detail_url path is not a recognized Manipur Gazette route');
  }
  const type=normalizeType(input.type);
  return {
    source_id:'IN-MANIPUR-EGAZETTE', jurisdiction:'IN-MN',
    external_id:gazetteId, notification_number:gazetteId,
    title:String(input.title??'Gazette issue').trim(),
    issuing_authority:input.department??'Directorate of Printing and Stationery, Government of Manipur',
    publication_date:publicationDate, commencement_date:null,
    record_type:type.record_type, original_url:detailUrl.toString(),
    verification_status:'primary_source_document_pending_review',
    legal_effect_verified:false,
    metadata:{gazette_type:input.type??null,department:input.department??null,detail_url:detailUrl.toString(),source:'Manipur eGazette'}
  };
}
export function buildManipurGazettePdfManifest({record,bytes,capturedAt=new Date().toISOString(),downloadUrl}) {
  if (!Buffer.isBuffer(bytes)||!bytes.length) throw new Error('non-empty PDF bytes are required');
  const url=new URL(downloadUrl);
  if (url.protocol!=='https:'||![officialHost,legacyHost,pressHost].includes(url.hostname)) throw new Error('downloadUrl must use a registered official Manipur host');
  const sha256=createHash('sha256').update(bytes).digest('hex');
  return {...record,download_url:url.toString(),sha256,byte_length:bytes.length,media_type:'application/pdf',captured_at:capturedAt,verification_status:'primary_source_document_pending_review'};
}
