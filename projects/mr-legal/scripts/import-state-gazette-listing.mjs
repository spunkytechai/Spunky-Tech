#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildGazetteDocumentRecord, parseStateGazetteListing } from '../lib/state-gazettes.mjs';

const SOURCE_CONFIG = {
  'IN-MANIPUR-EGAZETTE': {
    listing: 'https://manipurgovtpress.nic.in/o_gazette_list',
    extraordinary: 'https://manipurgovtpress.nic.in/eo_gazette_list'
  },
  'IN-KERALA-COMPOSE': {
    listing: 'https://compose.kerala.gov.in/egazetteSearchWithFileNumber',
    archive: 'https://gazette.kerala.gov.in/'
  }
};
export function parseArgs(args = []) {
  const out = { source: null, input: null, output: 'data/raw/state-gazettes', help: false };
  for (let i=0;i<args.length;i+=1) {
    const arg=args[i];
    if (arg==='--help'||arg==='-h') out.help=true;
    else if (['--source','--input','--out'].includes(arg)) {
      if (!args[i+1] || args[i+1].startsWith('--')) throw new Error(`${arg} requires a value`);
      out[arg==='--source'?'source':arg==='--input'?'input':'output']=args[++i];
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (!out.help && !out.source) throw new Error('--source is required');
  if (!out.help && !SOURCE_CONFIG[out.source]) throw new Error('No tested listing configuration for this state source');
  if (!out.help && !out.input) throw new Error('--input JSON file is required; portal-specific page capture is a separate step');
  return out;
}
export async function importStateGazetteListing({ args=process.argv.slice(2), readFileImpl, writeFileImpl=writeFile, mkdirImpl=mkdir, now=()=>new Date(), log=console.log }={}) {
  const options=parseArgs(args);
  if (options.help) { log('State Gazette import utility\nUsage: npm run data:import:state-gazette -- --source IN-MANIPUR-EGAZETTE --input listing.json --out data/raw/state-gazettes\nProvide a JSON capture of the portal listing; this utility validates and normalizes the evidence. It does not scrape or download portal pages.'); return null; }
  const { readFile } = await import('node:fs/promises');
  const read = readFileImpl ?? readFile;
  const payload = JSON.parse(await read(resolve(options.input),'utf8'));
  const observed = Array.isArray(payload.records) ? payload.records : [];
  const rows = parseStateGazetteListing({ source_id: options.source, records: observed });
  const capturedAt=now().toISOString();
  const jsonl=rows.map(row=>JSON.stringify({...row,captured_at:capturedAt})).join('\n')+(rows.length?'\n':'');
  const output=resolve(options.output);
  await mkdirImpl(output,{recursive:true});
  await writeFileImpl(resolve(output,'listing.jsonl'),jsonl,'utf8');
  const manifest={
    source_id:options.source, config:SOURCE_CONFIG[options.source],
    captured_at:capturedAt, listed_item_count:observed.length, normalized_count:rows.length,
    rejected_count:observed.length-rows.length,
    sha256: createHash('sha256').update(jsonl).digest('hex'),
    source_capture_file: options.input,
    note:'Normalized listing metadata only. Downloaded Gazette PDFs must be independently captured, hashed and reviewed before legal use.'
  };
  await writeFileImpl(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n','utf8');
  log(JSON.stringify(manifest,null,2));
  return manifest;
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  importStateGazetteListing().catch(error=>{console.error(error.message);process.exitCode=1;});
}
