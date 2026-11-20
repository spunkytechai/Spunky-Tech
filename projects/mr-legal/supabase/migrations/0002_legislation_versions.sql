alter table public.legal_records
  add column if not exists source_authority text not null default 'unknown',
  add column if not exists source_payload jsonb not null default '{}'::jsonb;

create table if not exists public.legal_provisions (
  id uuid primary key default gen_random_uuid(),
  legal_record_version_id uuid not null references public.legal_record_versions(id) on delete cascade,
  provision_ref text not null, heading text, provision_text text, parent_ref text,
  language_code text, source_locator text,
  verification_status text not null default 'not_reviewed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(legal_record_version_id, provision_ref, language_code)
);

create table if not exists public.legal_amendment_events (
  id uuid primary key default gen_random_uuid(),
  amending_record_id uuid not null references public.legal_records(id),
  amended_record_id uuid references public.legal_records(id),
  publication_date date, commencement_date date, effective_from date,
  affected_provisions jsonb not null default '[]'::jsonb,
  commencement_instrument_url text,
  verification_status text not null default 'needs_primary_source_check',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint legal_amendment_effective_date_check
    check (effective_from is null or commencement_date is null or effective_from = commencement_date)
);
create index if not exists legal_provisions_version_ref_idx on public.legal_provisions(legal_record_version_id, provision_ref);
create index if not exists legal_amendment_events_timeline_idx on public.legal_amendment_events(amended_record_id, effective_from);
comment on table public.legal_provisions is 'Provision-level text linked to a specific legal text version; source and verification state are retained.';
comment on table public.legal_amendment_events is 'Amendment chronology; publication and commencement are separate facts and must not be inferred from each other.';
