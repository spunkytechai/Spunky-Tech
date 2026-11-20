#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchNyaykoshCatalog, fetchNyaykoshLaw } from '../lib/legislation.mjs';
const args=process.argv.slice(2);
const option=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;};
const output=resolve(option('--out')||'data/raw/legislation/nyaykosh');
const details=args.includes('--details');
const baseUrl=option('--base-url')||'https://lawascode.negd.in/laac-api/v1';
async function main(){
 const startedAt=new Date().toISOString(), catalog=await fetchNyaykoshCatalog({baseUrl}), records=[], failures=[];
 if(details){for(const item of catalog){try{records.push(await fetchNyaykoshLaw(item.external_id,{baseUrl}));}catch(error){failures.push({api_slug:item.external_id,error:error.message});records.push(item);}}}
 else records.push(...catalog);
 await mkdir(output,{recursive:true});
 await writeFile(resolve(output,'laws.jsonl'),records.map(x=>JSON.stringify(x)).join('\\n')+(records.length?'\\n':''),'utf8');
 const manifest={dataset:'Nyaykosh / NeGD structured legislation',api_base_url:baseUrl,catalog_url:`${baseUrl.replace(/\\/$/,'')}/laws`,started_at:startedAt,captured_at:new Date().toISOString(),detail_fetch_enabled:details,record_count:records.length,failed_detail_fetches:failures,authority_note:'Government structured legal data; verify each instrument against its primary Gazette/ministry publication before asserting legal effect.',records_file:'laws.jsonl'};
 await writeFile(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\\n','utf8'); console.log(JSON.stringify(manifest,null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
