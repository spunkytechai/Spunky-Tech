# Indian legal data collection plan

## Primary legislation and Gazette
1. India Code (Legislative Department): official repository for Central and State Acts and subordinate legislation. Do not assume undocumented or withdrawn APIs; use approved exports or captured permanent document URLs.
2. eGazette of India: notification, commencement instruments, amendments and corrigenda. Capture issue date, part/section, notification number, issuing authority and original PDF URL.
3. Nyaykosh (NeGD): documented public versioned JSON API and LegalDocML/Akoma Ntoso for a partial structured subset. API routes: `GET /laac-api/v1/laws` and `GET /laac-api/v1/laws/{slug}`.
4. State and UT Gazette/legislative department sources: one source register and crawl policy per jurisdiction.

## Judicial data
- Supreme Court public dataset: metadata Parquet at `s3://indian-supreme-court-judgments/metadata/parquet/year=YYYY/metadata.parquet`.
- High Court public dataset: AWS Open Data Registry lists 25 High Courts, 45 benches, structured Parquet metadata and CC BY 4.0. Bucket: `s3://indian-high-court-judgments` (ap-south-1). Treat freshness as observed-at-ingestion, not assumed.
- District courts and tribunals: official source or licensed access only. No aggressive scraping of public court services.
- NJDG: separate aggregate court statistics from case-law records.

## Implemented legislation lane
- Nyaykosh catalog collector: `npm run data:collect:nyaykosh`.
- Fetch complete catalog items by slug: `npm run data:collect:nyaykosh -- --details`.
- Output JSONL and capture manifest under `data/raw/legislation/nyaykosh/`.
- India Code metadata adapter: normalize approved export/source captures; do not assume an undocumented endpoint.
- Gazette adapter: capture notification number, Part/Section, issue/publication date, issuing authority and original PDF URL. Record commencement only when an explicit commencement provision/instrument supports it.
- Amendment events preserve publication and commencement as distinct dates.
- Effective-date queries return a version only when exactly one version interval matches; overlaps are data-quality failures requiring reconciliation.

## Ingestion quality
Every record needs stable external ID, source ID, source URL, captured_at, hash, license basis and verification state. Preserve raw source fields. Unknown court mappings remain unmapped rather than guessed. Conflicting source versions are flagged for human reconciliation. OCR and translations must carry derivation metadata.

## Execution constraints
The Nyaykosh collector requires outbound network access. AWS metadata collectors require AWS CLI v2 and outbound S3 access. Collect metadata first; do not mirror multi-terabyte judgment PDFs. Government repository data is not automatically verified for commencement or current legal effect: cross-check against Gazette/ministry publications.
