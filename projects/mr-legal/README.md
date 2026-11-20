# Mr.Legal — Indian Legal Knowledge Platform

Mr.Legal is an open, provenance-first legal information platform for Indian legislation, Gazette instruments and judicial decisions. It is a research and software project, not a substitute for legal advice.

## Current scope
- Central, State and Union Territory legislation.
- Gazette publications and amendment history.
- Supreme Court and High Court judgments.
- Source-level attribution, capture timestamps, hashes and verification states.
- Metadata-first ingestion; no blind bulk mirroring of multi-terabyte archives.

## First collection lane: Supreme Court metadata
Requires AWS CLI v2:
`python scripts/collect-supreme-metadata.py --year 2025`
Repeat `--year` to select more years. The script downloads public metadata Parquet only.

## Development
`npm install`
`npm test`
`npm run data:validate`

## Important source policy
India Code and Official Gazette are primary government sources. Public court datasets are secondary mirrors of public records and must retain their attribution and license. The Supreme Court dataset repository reports CC BY 4.0; verify current license before redistribution. High Court AWS Open Data Registry reports CC BY 4.0, 25 High Courts, JSON and Parquet metadata, and quarterly updates.

## Status
Foundation and metadata adapter implemented. The national corpus has NOT yet been fully collected, reconciled or legally verified.
