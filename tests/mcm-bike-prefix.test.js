import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {analyzeBikePrefix} from '../scripts/mcm-reference/analyze-bike-prefix.mjs';
const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-world-prefix-wine11.json.br',import.meta.url))));
const entry=()=>JSON.parse(f.files['world-entry.json']),rows=()=>f.files['world-bike-prefix.jsonl'].trim().split('\n').map(JSON.parse);
test('original bike prefix preserves incoming locals except seven explicit stores',()=>{
 for(const [name,value]of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,46);assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);
 const r=analyzeBikePrefix(entry(),rows());assert.equal(r.calls.length,10);assert.equal(r.words,15860);assert.deepEqual(r.differences,[]);assert.deepEqual(r.firstCallDifferences,[]);
 assert.deepEqual(r.incomingDifferences.map(d=>d.offset),[0xbf8,0xbfc]);
 assert.equal(new Set(r.calls.map(c=>c.stackAddress)).size,1);
 assert.deepEqual(r.calls.map(c=>c.caller),Array.from({length:10},(_,i)=>i%2?0x45915b:0x459126));
});
test('changed inherited stack values and missing prefix returns stay visible',()=>{
 const trace=rows(),b=Buffer.from(trace[1].stackHex,'hex');b[84]^=1;trace[1].stackHex=b.toString('hex');assert.equal(analyzeBikePrefix(entry(),trace).differences.length,1);
 const initial=entry(),stack=Buffer.from(initial.stackHex,'hex');stack[84]^=1;initial.stackHex=stack.toString('hex');assert.equal(analyzeBikePrefix(initial,rows()).firstCallDifferences.length,1);
 assert.throws(()=>analyzeBikePrefix(entry(),rows().slice(0,-1)),/Incomplete bike prefix/);
});
