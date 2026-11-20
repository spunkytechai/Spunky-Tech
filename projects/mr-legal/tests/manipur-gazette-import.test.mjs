import test from 'node:test';
import assert from 'node:assert/strict';
import { importManipurGazetteCapture, parseArgs } from '../scripts/import-manipur-gazette.mjs';

test('requires a captured listing file',()=>assert.throws(()=>parseArgs([]),/--input/));
test('rejects unknown collector switches',()=>assert.throws(()=>parseArgs(['--wat']),/Unknown option/));
test('imports and manifests observed Manipur records with stable checksums',async()=>{
 const writes=new Map();
 const manifest=await importManipurGazetteCapture({
  args:['--input','manipur.json','--out','/tmp/manipur-capture'],
  readFileImpl:async()=>JSON.stringify({records:[
   {gazette_id:'282/EG/2026-27/20-11-2026',publication_date:'20-11-2026',type:'E.G.',title:'Sample Extraordinary Issue'},
   {gazette_id:'13/WG/2026-27/18-11-2026',publication_date:'18-11-2026',type:'W.G.',title:'Weekly Issue'},
   {gazette_id:'bad-id',publication_date:'not-a-date',type:'W.G.'}
  ]}),
  mkdirImpl:async()=>{},writeFileImpl:async(p,v)=>writes.set(p,v),log:()=>{}
 });
 assert.equal(manifest.observed_record_count,3);
 assert.equal(manifest.normalized_record_count,2);
 assert.equal(manifest.rejected_record_count,1);
 assert.match(manifest.sha256,/^[a-f0-9]{64}$/);
 assert.match(writes.get('/tmp/manipur-capture/manipur-gazettes.jsonl'),/extraordinary_gazette/);
});
