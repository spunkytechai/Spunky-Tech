create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.legal_sources (
  id text primary key, name text not null, publisher text not null,
  jurisdiction text not null, category text not null, authority_level text not null,
  source_url text not null, access_method text not null,
  license_status text not null default 'review_required',
  coverage_status text not null default 'unverified',
  last_checked_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_sources_url_https check (source_url like 'https://%')
);

create table if not exists public.legal_records (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.legal_sources(id),
  external_id text, title text not null, record_type text not null,
  jurisdiction text not null, issuing_authority text, citation text,
  language_code text, original_url text not null, publication_date date,
  commencement_date date, effective_from date, effective_to date,
  legal_status text not null default 'unverified',
  verification_status text not null default 'not_reviewed',
  source_hash text, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(source_id, external_id)
);

create table if not exists public.legal_record_versions (
  id uuid primary key default gen_random_uuid(),
  legal_record_id uuid not null references public.legal_records(id) on delete cascade,
  version_label text, effective_from date, effective_to date,
  source_url text not null, source_hash text, text_storage_key text,
  verification_status text not null default 'not_reviewed',
  created_at timestamptz not null default now()
);

create table if not exists public.legal_chunks (
  id uuid primary key default gen_random_uuid(),
  legal_record_version_id uuid not null references public.legal_record_versions(id) on delete cascade,
  parent_reference text, heading text, content text not null,
  language_code text, chunk_index integer not null,
  embedding vector(768), metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(legal_record_version_id, chunk_index)
);

create index if not exists legal_records_jurisdiction_type_idx on public.legal_records(jurisdiction, record_type);
create index if not exists legal_records_effective_idx on public.legal_records(effective_from, effective_to);
create index if not exists legal_records_status_idx on public.legal_records(verification_status, legal_status);
create index if not exists legal_chunks_record_idx on public.legal_chunks(legal_record_version_id);
create index if not exists legal_chunks_embedding_idx on public.legal_chunks using hnsw (embedding vector_cosine_ops);

comment on table public.legal_sources is 'Upstream legal source registry; provenance and license status are mandatory.';
comment on table public.legal_records is 'Canonical legal instruments and judicial decisions; unverified records are not authoritative.';
comment on table public.legal_record_versions is 'Versioned legal texts with effective-date intervals.';
comment on table public.legal_chunks is 'Retrieval chunks; embeddings optional until an approved model is configured.';
