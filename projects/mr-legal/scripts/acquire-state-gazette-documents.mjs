#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { acquireGazetteDocuments } from '../lib/gazette-acquisition.mjs';

export function parseArgs(args = []) {
  const out = { input: null, output: 'data/raw/state-gazettes/documents', max_mb: 25, help: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') out.help = true;
    else if (['--input', '--out', '--max-mb'].includes(arg)) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${arg} requires a value`);
      const value = args[++i];
      if (arg === '--input') out.input = value;
      else if (arg === '--out') out.output = value;
      else out.max_mb = Number(value);
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (!out.help && !out.input) throw new Error('--input JSON or JSONL file is required');
  if (!Number.isFinite(out.max_mb) || out.max_mb <= 0) throw new Error('--max-mb must be a positive number');
  return out;
}

export async function runAcquisition({ args = process.argv.slice(2), log = console.log } = {}) {
  const options = parseArgs(args);
  if (options.help) {
    log('Gazette PDF acquisition\\nUsage: npm run data:acquire:state-gazette -- --input records.jsonl --out data/raw/state-gazettes/documents [--max-mb 25]\\nInput rows require source_id, source_url, document_url, title and jurisdiction. Downloads are restricted to registered official hosts.');
    return null;
  }
  const raw = await readFile(resolve(options.input), 'utf8');
  let records;
  if (options.input.toLowerCase().endsWith('.jsonl')) records = raw.split(/\\r?\\n/).filter(Boolean).map(line => JSON.parse(line));
  else {
    const parsed = JSON.parse(raw);
    records = Array.isArray(parsed) ? parsed : parsed.records;
  }
  const summary = await acquireGazetteDocuments({ records, output_dir: options.output, max_bytes: Math.floor(options.max_mb * 1024 * 1024) });
  log(JSON.stringify(summary, null, 2));
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runAcquisition().catch(error => { console.error(error.message); process.exitCode = 1; });
}
