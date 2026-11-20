#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeManipurGazetteListing } from '../lib/manipur-gazette.mjs';

const BASE='https://egazettemanipur.mn.gov.in';
const ROUTES={ordinary:'/OPENFILE1.aspx',extraordinary:'/OPENFILE1.aspx'};
export function parseArgs(args=[]) {
 const out={input:null,out:'data/raw/state-gazettes/manipur',help:false};
 for(let i=0;i<args.length;i+=1){
  const a=args[i];
  if(a==='--help'||a==='-h') out.help=true;
  else if(a==='--input'||a==='--out'){
   if(!args[i+1]||args[i+1].startsWith('--')) throw new Error(`${a} requires a value`);
   out[a==='--input'?'input':'out']=args[++i];
  } else throw new Error(`Unknown option: ${a}`);
 }
 if(!out.help&&!out.input) throw new Error('--input JSON listing capture is required');
 return out;
}
export async function importManipurGazetteCapture({args=process.argv.slice(2),readFileImpl,writeFileImpl=writeFile,mkdirImpl=mkdir,now=()=>new Date(),log=console.log}={}) {
 const options=parseArgs(args);
 if(options.help){log('Manipur eGazette import utility\nUsage: npm run data:import:manipur -- --input listing.json --out data/raw/state-gazettes/manipur\nProvide a capture from the official eGazette listing. This tool validates and normalizes observed records; it does not scrape or bulk-download PDFs.');return null;}
 const {readFile}=await import('node:fs/promises');
 const read=readFileImpl??readFile;
 const payload=JSON.parse(await read(resolve(options.input),'utf8'));
 const records=normalizeManipurGazetteListing(payload.records);
 const capturedAt=now().toISOString();
 const jsonl=records.map(r=>JSON.stringify({...r,captured_at:capturedAt})).join('\n')+(records.length?'\n':'');
 const out=resolve(options.out);
 await mkdirImpl(out,{recursive:true});
 await writeFileImpl(resolve(out,'manipur-gazettes.jsonl'),jsonl,'utf8');
 const manifest={
  source_id:'IN-MANIPUR-EGAZETTE',
  source_url:BASE,
  capture_started_at:capturedAt,
  listing_input:options.input,
  observed_record_count:Array.isArray(payload.records)?payload.records.length:0,
  normalized_record_count:records.length,
  rejected_record_count:(Array.isArray(payload.records)?payload.records.length:0)-records.length,
  sha256:createHash('sha256').update(jsonl).digest('hex'),
  listing_route:BASE+'/',
  ordinary_listing_route:'https://manipurgovtpress.nic.in/en/o_gazette_list/',
  extraordinary_listing_route:'https://manipurgovtpress.nic.in/en/eo_gazette_list/',
  note:'Metadata listing capture only. Download PDFs individually through official open-file links, record bytes and hash, and review the original Gazette before legal reliance.'
 };
 await writeFileImpl(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n','utf8');
 log(JSON.stringify(manifest,null,2));
 return manifest;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 importManipurGazetteCapture().catch(e=>{console.error(e.message);process.exitCode=1;});
}
