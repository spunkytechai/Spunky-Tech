-- Official state Gazette capture registry and document evidence ledger.
create table if not exists official_portal_captures (
  id uuid primary key default gen_random_uuid(),
  source_id text not null,
  requested_url text not null,
  canonical_url text not null,
  page_title text not null,
  observed_at timestamptz not null,
  access_method text not null default 'public_portal',
  api_available boolean not null default false,
  verification_status text not null default 'portal_only_api_unverified',
  notes text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists official_portal_captures_source_observed_idx
  on official_portal_captures(source_id, observed_at desc);

create table if not exists official_portal_documents (
  id uuid primary key default gen_random_uuid(),
  source_id text not null,
  source_url text not null,
  title text not null,
  document_url text not null,
  sha256 char(64) not null,
  publication_date date,
  notification_number text,
  issuing_authority text,
  jurisdiction text not null,
  verification_status text not null default 'primary_source_document_pending_review',
  captured_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(source_id, sha256)
);
create index if not exists official_portal_documents_jurisdiction_date_idx
  on official_portal_documents(jurisdiction, publication_date desc);
create index if not exists official_portal_documents_source_idx
  on official_portal_documents(source_id, captured_at desc);

comment on table official_portal_captures is
  'Evidence of observed official-government portal routes; this does not imply an API is available.';
comment on table official_portal_documents is
  'Captured Gazette or legislation documents with hashes and pending legal verification.';
