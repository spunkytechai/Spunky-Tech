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

## Collector reliability and evidence integrity

The Nyaykosh collector supports `--help`, `--details`, `--out`, `--base-url`, and `--retries` (0–8). Transient HTTP statuses and network failures are retried with bounded exponential backoff; permanent client errors are not retried. The capture manifest stores a SHA-256 checksum for the exact JSONL output and records detail-fetch failures without discarding successful catalog records.

Examples:

```bash
npm run data:collect:nyaykosh -- --help
npm run data:collect:nyaykosh -- --details --retries 4
```

Provision and penalty rows are extracted from full-law payloads when present; absent fields are not fabricated. The manifest records counts and SHA-256 checksums for all three JSONL files. A checksum proves file integrity after capture; it does not prove that the source text is legally authoritative or complete. Verify every instrument against the primary Gazette/ministry publication before relying on its legal effect.

## Official state Gazette source discovery

The source registry tracks government portal evidence separately from document corpus coverage. The current verified discovery includes:
- **India Code:** the old `www.indiacode.nic.in` host redirects visitors to `https://indiacode.gov.in/`. The current portal is registered as the canonical host. The adapter does not infer a public API from this redirect.
- **Telangana:** the State Portal identifies the Commissionerate of Printing as the authorized publisher and links `https://tggazette.cgg.gov.in/`. The official explainer describes weekly and extraordinary gazettes, downloadable digital copies, generated issue/job numbers and reports by department, district, month and year.
- **Haryana:** an official e-Gazette public search portal is registered; browser extraction could not confirm its internal document/API routes.
- **Jammu and Kashmir:** Ranbir Government Press publishes a Gazette archive index; browser extraction could not confirm direct document/API routes.
- **Central eGazette state directory:** the public page returned a portal error during this inspection. It is tracked as a discovery route, not treated as a working endpoint.

No portal is treated as an API until endpoints and response schemas are actually documented and tested. Portal discovery records should be stored in `official_portal_captures`; individual documents belong in `official_portal_documents` with a SHA-256 hash and pending verification state.

Run `npm run data:validate:portals` to validate the government source registry. Migration `0003_official_state_portals.sql` adds evidence capture and document ledger tables. The new portal normalizer accepts government portal observations only from HTTPS `.gov.in` / `.nic.in` hosts and marks API availability as unverified unless a separate verified integration is implemented.

## Portal discovery evidence and next acquisition targets

The TinyFish-assisted inspection confirmed that the legacy `www.indiacode.nic.in` portal redirects to `https://indiacode.gov.in/`. This is now the canonical registry URL; the old host is retained as a legacy URL. The inspection did not establish a documented public API for the new portal, so the India Code adapter remains an approved export/source-capture adapter, not an invented scraper.

The Telangana State Portal identifies the Commissionerate of Printing as the authorized publisher and links the public e-Gazette at `https://tggazette.cgg.gov.in/`. Its public description states that it publishes weekly and extraordinary Gazettes, provides downloadable digital copies, generates issue/job numbers, and offers reports by department, district, month and year. The government portal is the discovery source; the linked document portal remains the candidate acquisition endpoint.

Haryana e-Gazette (`https://egazetteharyana.gov.in/`) and the Ranbir Government Press Gazette index (`https://rgp.jk.gov.in/gazette.html`) were discovered as official government publishing/search endpoints, but their detailed routes and machine-readable APIs were not confirmed during this inspection. The Central eGazette state directory returned an error during the browser capture. Each remains marked as a portal-only source until endpoints are independently tested.

The validator's host policy distinguishes official government portals from approved secondary dataset hosts. It does not label GitHub or AWS-hosted data as government-primary material. This distinction is intentional: court-data mirrors require source attribution and separate legal/permission review.

Run `npm test`, `npm run data:validate` and `npm run test:data:python`. Migration `0003_official_state_portals.sql` creates an evidence capture table and a document ledger for portal observations and downloaded Gazette instruments.

## State Gazette acquisition pipeline

The state source registry now includes Andhra Pradesh, Kerala and Manipur in addition to the previously recorded Telangana, Haryana and Jammu & Kashmir sources. The official Manipur Directorate of Printing & Stationery explains that its e-Gazettes are digitally signed and publicly downloadable; it points to a free current archive from 1 August 2025 and a paid legacy archive covering 1947–2020. The Kerala COMPOSE site exposes weekly/extraordinary Gazette services and a search-by-file-number route. The Andhra Pradesh e-Gazette result exposes recent weekly Gazette records, although direct browser extraction returned HTTP 403 during inspection.

The state Gazette importer deliberately consumes a JSON capture produced from a portal observation; it does not claim to be a live scraper. Example:

```bash
npm run data:import:state-gazette -- --source IN-MANIPUR-EGAZETTE --input data/raw/manipur/listing-capture.json
```

Input shape:

```json
{
  "records": [
    {
      "title": "Weekly Gazette",
      "href": "https://egazettemanipur.mn.gov.in/path/to/issue.pdf",
      "date": "2025-08-06",
      "type": "weekly"
    }
  ]
}
```

The importer writes `listing.jsonl` and a SHA-256 manifest, rejects unknown state sources and unregistered document hosts, and marks listing records as metadata-only. A downloaded PDF must still be supplied as bytes to the document capture layer, hashed, and verified against the original Gazette issue before legal effect is asserted. The state-specific capture schema is in migration `0003_official_state_portals.sql`.

## State Gazette sources added in the latest build

- **Andhra Pradesh:** APeGAZETTE search results show recent weekly Gazette records; direct portal extraction returned HTTP 403 in this inspection, so API and direct-download behavior remain unverified.
- **Kerala:** COMPOSE lists weekly and extraordinary Gazette services and a search-by-file-number route. It points to the legacy archive for issues before 2 October 2021.
- **Manipur:** The Directorate of Printing & Stationery states that its Gazette PDFs are digitally signed. It links the free current archive from 1 August 2025 and a fee-based legacy archive (1947–2020), plus weekly and extraordinary listing routes.
- **Telangana, Haryana and Jammu & Kashmir:** Retained as registered official portal discovery sources; API and document paths are not yet fully verified.

The registry now records explicit `approved_hosts` for each source. This is stricter than a broad domain-suffix rule: a source's linked document host must be explicitly associated with that source. Secondary court-data publishers are classified separately and are not treated as government primary sources.

### Source-host validation

Every source registry entry now carries an explicit `approved_hosts` array derived from its registered primary portal and declared official API/archive links. Registry validation checks the canonical URL against that per-source list. Secondary court-data mirrors remain separately classified and are not treated as government publishers. This prevents a broad `.gov.in` suffix rule from silently authorizing unrelated or unregistered hosts.

## State Gazette source discovery — validated scope

Live source inspection expanded the source registry to 12 entries, including six state Gazette sources: Andhra Pradesh, Kerala, Manipur, Telangana, Haryana and Jammu & Kashmir. The latest state-specific work includes an offline listing importer and document capture normalizers. The importer consumes an explicitly captured JSON listing; it does not claim to scrape the live portals or download PDF documents automatically.

Manipur's Directorate of Printing & Stationery states that its e-Gazettes are digitally signed and publicly downloadable. Its page points to a free current archive from 1 August 2025 and a paid legacy archive covering 1947–2020. Kerala COMPOSE describes weekly and extraordinary Gazette services and exposes a search-by-file-number route. Andhra Pradesh search results expose recent weekly Gazettes, but direct portal extraction returned HTTP 403 during this inspection. The Haryana and Jammu & Kashmir entries remain portal discovery sources, not verified automated feeds.

Every registry record now has an explicit `approved_hosts` list. The validation function checks the canonical URL against that record-specific allowlist. Secondary judicial datasets are separately classified; their GitHub/AWS hosting is not represented as government-primary authority.

Commands:
```bash
npm test
npm run data:validate
npm run test:state-gazettes
npm run test:data:python
npm run data:import:state-gazette -- --source IN-MANIPUR-EGAZETTE --input data/raw/manipur/listing-capture.json
```

Migration `0003_official_state_portals.sql` contains portal evidence, official source documents and state Gazette-specific records with content hashes and separate publication/commencement dates. The migration has not been applied to a live database in this environment.


## Gazette PDF acquisition and OCR

The acquisition stage now downloads actual PDF bytes from a source-specific HTTPS host allowlist. It checks the redirect destination, enforces a maximum file size, validates the PDF magic signature, hashes the bytes with SHA-256, deduplicates identical content and writes a JSONL evidence manifest. A successful download is still marked `downloaded_pending_legal_review`; a checksum proves integrity, not legal authority or commencement.

1. Capture a portal listing into JSONL records with `source_id`, `source_url`, `document_url`, `title` and `jurisdiction`.
2. Download the referenced documents:
   ```bash
   npm run data:acquire:state-gazette -- --input data/raw/state-gazettes/listing.jsonl --out data/raw/state-gazettes/documents --max-mb 25
   ```
3. Extract embedded text, falling back to OCR for scanned PDFs when the local tools are installed:
   ```bash
   python scripts/extract_gazette_text.py --input-dir data/raw/state-gazettes/documents --output-dir data/processed/state-gazettes --ocr auto --language eng
   ```

OCR dependencies are Poppler (`pdfinfo`, `pdftoppm`, `pdftotext`) and Tesseract. For multilingual OCR, install the corresponding Tesseract language packs and set `--language eng+hin` or another supported combination. Page-count limits prevent silent partial OCR. The extractor writes text and a separate JSON record containing source-PDF and text SHA-256 hashes, extraction method and status. All extracted text remains pending review; OCR output is not a legal transcription.

### Confirmed Manipur portal route

Live inspection of the Government of Manipur's current e-Gazette portal showed dated issue identifiers and `OPENFILE1.aspx` document-opening routes. An older Directorate listing detail page exposed the document path `/media/gazzete/EOG-212.pdf`, with Gazette number 212, Extra-Ordinary type and publication date 21 November 2025. The PDF endpoint could not be fetched successfully by the current acquisition environment, so this is route discovery evidence only—not a downloaded document or a tested production connector. The current e-Gazette archive is listed as free from 1 August 2025; the Directorate states that the 1947–2020 legacy archive is fee-based.

The central eGazette home page currently displayed recent issues, but the RecentUploads route redirected to an error page during inspection. The central portal is therefore not represented as a working automated feed. No bulk corpus count or legal verification is claimed.

The acquisition script accepts only explicitly registered official hosts, including the known Manipur current and legacy archive hosts. Redirects to unregistered hosts fail closed. Migration `0004_gazette_extraction_evidence.sql` adds fields for final URL, download time and text-extraction evidence; it has not been applied to a live database.
