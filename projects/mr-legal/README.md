# Mr.Legal — Indian Legal Knowledge Platform

Mr.Legal is an open, provenance-first legal information platform for Indian legislation, Gazette instruments and judicial decisions. It is a research and software project, not a substitute for legal advice.

## Current scope
- Central, State and Union Territory legislation.
- Gazette publications and amendment history.
- Supreme Court and High Court judgments.
- Source-level attribution, capture timestamps, hashes and verification states.
- Metadata-first ingestion; no blind bulk mirroring of multi-terabyte archives.

## Judicial metadata collection
- Supreme Court: `python scripts/collect-supreme-metadata.py --year 2025`
- High Courts: `python scripts/collect-high-court-metadata.py --year 2025`
- One High Court partition: `python scripts/collect-high-court-metadata.py --year 2025 --court 27_1`
- Add `--dry-run` to preview High Court sync commands.

## Legislation ingestion
Nyaykosh exposes open, versioned JSON APIs and LegalDocML/Akoma Ntoso XML for the laws it currently covers. Coverage is partial; it is not proof of complete national coverage.

- Catalog: `npm run data:collect:nyaykosh`
- Full law details: `npm run data:collect:nyaykosh -- --details`
- Output: `data/raw/legislation/nyaykosh/laws.jsonl` plus a capture manifest.
- The adapter uses documented `GET /laac-api/v1/laws` and `GET /laac-api/v1/laws/{slug}` routes.

India Code is the official Government of India repository. No undocumented or withdrawn JSON API is assumed: approved exports/source captures can be normalized with `normalizeIndiaCodeRecord`. Gazette instruments can be normalized with `normalizeGazetteInstrument` after recording the original HTTPS document URL and issue date.

**Date semantics:** publication date, commencement date and effective interval are separate. The pipeline never infers commencement from enactment/publication. `resolveVersionAtDate` returns a version only when exactly one effective interval matches; overlaps raise an ambiguity error.

Apply Supabase migrations in order, including `0002_legislation_versions.sql`, to add provision-level text and amendment chronology.

## Development
`npm install`
`npm test`
`npm run data:validate`
`npm run test:data:python`

## Important source policy
India Code and Official Gazette are primary government sources. Nyaykosh is a government structured-data channel, but each instrument still requires a primary-source cross-check before legal effect is asserted. Public court datasets are secondary mirrors of public records and must retain their attribution and license.

## Status
Foundation and legislation adapters implemented. The national corpus has NOT yet been fully collected, reconciled or legally verified.
