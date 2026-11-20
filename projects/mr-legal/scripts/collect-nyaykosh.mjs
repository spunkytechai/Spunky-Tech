#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fetchNyaykoshCatalog, fetchNyaykoshLaw } from '../lib/legislation.mjs';

const DEFAULT_BASE_URL = 'https://lawascode.negd.in/laac-api/v1';
const USAGE = `Nyaykosh legislation collector

Usage:
  npm run data:collect:nyaykosh -- [options]

Options:
  --details             Fetch each law's full detail record after the catalog
  --out <directory>    Output directory (default: data/raw/legislation/nyaykosh)
  --base-url <url>     API base URL (default: ${DEFAULT_BASE_URL})
  --retries <number>   Retries for transient failures (default: 3, max: 8)
  --help               Show this help

Outputs:
  laws.jsonl           One normalized law record per line
  manifest.json        Capture metadata, checksum and detail failures

Every imported record still requires primary Gazette verification before legal reliance.`;

export function parseCollectorArgs(args = []) {
  const options = { help: false, details: false, out: 'data/raw/legislation/nyaykosh', baseUrl: DEFAULT_BASE_URL, retries: 3 };
  const valued = new Map([['--out', 'out'], ['--base-url', 'baseUrl'], ['--retries', 'retries']]);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--details') options.details = true;
    else if (valued.has(arg)) {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      options[valued.get(arg)] = value;
      index += 1;
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (!Number.isInteger(Number(options.retries)) || Number(options.retries) < 0 || Number(options.retries) > 8) throw new Error('--retries must be an integer between 0 and 8');
  options.retries = Number(options.retries);
  if (!options.help && !/^https:\/\//i.test(options.baseUrl)) throw new Error('--base-url must use HTTPS');
  return options;
}

export function createRetryingFetch({ fetchImpl = fetch, retries = 3, delayMs = 350, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const retryable = new Set([408, 425, 429, 500, 502, 503, 504]);
  return async (...args) => {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await fetchImpl(...args);
        if (response.ok || !retryable.has(response.status) || attempt === retries) return response;
        const header = response.headers?.get?.('retry-after');
        const seconds = Number(header);
        const wait = header && Number.isFinite(seconds) && seconds >= 0 ? Math.min(seconds * 1000, 30000) : Math.min(delayMs * (2 ** attempt), 5000);
        await sleep(wait);
      } catch (error) {
        if (attempt === retries) throw error;
        await sleep(Math.min(delayMs * (2 ** attempt), 5000));
      }
    }
  };
}

export async function collectNyaykosh({ args = process.argv.slice(2), fetchCatalog = fetchNyaykoshCatalog, fetchLaw = fetchNyaykoshLaw, fetchImpl = fetch, mkdirImpl = mkdir, writeFileImpl = writeFile, log = console.log, now = () => new Date() } = {}) {
  const options = parseCollectorArgs(args);
  if (options.help) { log(USAGE); return null; }
  const output = resolve(options.out);
  const startedAt = now().toISOString();
  const retryFetch = createRetryingFetch({ fetchImpl, retries: options.retries });
  const catalog = await fetchCatalog({ baseUrl: options.baseUrl, fetchImpl: retryFetch });
  const records = [], failures = [];
  if (options.details) {
    for (const item of catalog) {
      try { records.push(await fetchLaw(item.external_id, { baseUrl: options.baseUrl, fetchImpl: retryFetch })); }
      catch (error) { failures.push({ api_slug: item.external_id, error: error.message }); records.push(item); }
    }
  } else records.push(...catalog);
  await mkdirImpl(output, { recursive: true });
  const jsonl = records.map(record => JSON.stringify(record)).join('\n') + (records.length ? '\n' : '');
  await writeFileImpl(resolve(output, 'laws.jsonl'), jsonl, 'utf8');
  const manifest = {
    dataset: 'Nyaykosh / NeGD structured legislation',
    api_base_url: options.baseUrl,
    catalog_url: `${options.baseUrl.replace(/\/$/, '')}/laws`,
    started_at: startedAt,
    captured_at: now().toISOString(),
    detail_fetch_enabled: options.details,
    retry_limit: options.retries,
    record_count: records.length,
    sha256_laws_jsonl: createHash('sha256').update(jsonl, 'utf8').digest('hex'),
    failed_detail_fetches: failures,
    authority_note: 'Government structured legal data; verify each instrument against its primary Gazette/ministry publication before asserting legal effect.',
    records_file: 'laws.jsonl'
  };
  await writeFileImpl(resolve(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  log(JSON.stringify(manifest, null, 2));
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  collectNyaykosh().catch(error => { console.error(error.message); process.exitCode = 1; });
}
