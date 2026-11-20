# Indian legal data collection plan

## Primary legislation and Gazette
1. India Code (Legislative Department): Central and State Acts, subordinate legislation, section text and document metadata.
2. eGazette of India: notifications, commencement instruments, amendments and corrigenda. Gazette publication is the primary evidence for publication and commencement.
3. Nyaykosh (NeGD): structured LegalDocML/Akoma Ntoso and versioned APIs for the subset it currently exposes. Reported coverage is partial (217+ provisions mapped), not a full national corpus.
4. State and UT Gazette/legislative department sources: one source register and crawl policy per jurisdiction.

## Judicial data
- Supreme Court public dataset: metadata Parquet at s3://indian-supreme-court-judgments/metadata/parquet/year=YYYY/metadata.parquet. Start with 2025; expand after validating schema and ingestion.
- High Court public dataset: AWS Open Data Registry lists 25 High Courts, raw JSON and structured Parquet, quarterly updates and CC BY 4.0. Bucket: s3://indian-high-court-judgments (ap-south-1). Inventory keys and metadata before download.
- District courts and tribunals: official source or licensed access only. No aggressive scraping of public court services.
- NJDG: separate aggregate court statistics from case-law records.

## Ingestion quality
Every record needs stable external ID, source ID, source URL, captured_at, hash, license basis and verification state. Preserve raw source fields. Unknown court mappings remain unmapped rather than guessed. Conflicting source versions are flagged for human reconciliation. OCR and translations must carry derivation metadata.

## First executable lane
`python scripts/collect-supreme-metadata.py --year 2025`
Requires AWS CLI v2. Metadata only, not PDFs. The source repository reports CC BY 4.0; retain attribution and verify the current license before redistribution.
