import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, importStateGazetteListing } from '../scripts/import-state-gazette-listing.mjs';

test('requires a state source and input capture', () => {
  assert.throws(() => parseArgs([]), /--source is required/);
  assert.throws(() => parseArgs(['--source','IN-MANIPUR-EGAZETTE']), /--input JSON file is required/);
});

test('rejects unknown state sources instead of guessing a portal route', () => {
  assert.throws(() => parseArgs(['--source','IN-UNKNOWN','--input','capture.json']), /No tested listing configuration/);
});

test('imports provided state Gazette listing as normalized metadata JSONL', async () => {
  const writes = new Map();
  const manifest = await importStateGazetteListing({
    args:['--source','IN-MANIPUR-EGAZETTE','--input','capture.json','--out','/tmp/state-gazette-import'],
    readFileImpl:async()=>JSON.stringify({records:[
      {title:'Weekly Gazette 2025',href:'https://egazettemanipur.mn.gov.in/weekly.pdf',date:'2025-08-06',type:'weekly'}
    ]}),
    mkdirImpl:async()=>{},
    writeFileImpl:async(path,value)=>writes.set(path,value),
    log:()=>{}
  });
  assert.equal(manifest.normalized_count,1);
  assert.match(writes.get('/tmp/state-gazette-import/listing.jsonl'),/Weekly Gazette/);
  assert.match(writes.get('/tmp/state-gazette-import/manifest.json'),/sha256/);
});

test('rejects non-registered document URL and counts it as rejected', async () => {
  const writes=new Map();
  const manifest=await importStateGazetteListing({
    args:['--source','IN-MANIPUR-EGAZETTE','--input','capture.json','--out','/tmp/state-gazette-rejected'],
    readFileImpl:async()=>JSON.stringify({records:[
      {title:'Bad Gazette',href:'https://random.example/bad.pdf',date:'2025-08-06'}
    ]}),
    mkdirImpl:async()=>{},writeFileImpl:async(path,value)=>writes.set(path,value),log:()=>{}
  });
  assert.equal(manifest.normalized_count,0);
  assert.equal(manifest.rejected_count,1);
  assert.equal(writes.get('/tmp/state-gazette-rejected/listing.jsonl'),'');
});
