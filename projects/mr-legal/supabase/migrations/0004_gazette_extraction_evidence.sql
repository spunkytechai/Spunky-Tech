-- Persist download and OCR provenance separately from legal verification.
alter table state_gazette_documents
  add column if not exists final_url text,
  add column if not exists downloaded_at timestamptz,
  add column if not exists extracted_text_sha256 char(64),
  add column if not exists extraction_method text,
  add column if not exists extraction_status text,
  add column if not exists extracted_text_location text,
  add column if not exists extraction_metadata jsonb not null default '{}'::jsonb;

create index if not exists state_gazette_documents_downloaded_idx
  on state_gazette_documents(downloaded_at desc);

create index if not exists state_gazette_documents_extraction_status_idx
  on state_gazette_documents(extraction_status);

comment on column state_gazette_documents.final_url is 'Final HTTPS URL after redirects; must remain on the source-specific approved host list.';
comment on column state_gazette_documents.extracted_text_sha256 is 'Checksum of extracted UTF-8 text; does not attest transcription accuracy.';
comment on column state_gazette_documents.extraction_status is 'Technical extraction state only; never a legal verification state.';
comment on column state_gazette_documents.legal_effect_verified is 'Set only after a separate human legal review against the authoritative instrument.';
