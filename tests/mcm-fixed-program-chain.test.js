import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {analyzeFixedProgramChain} from '../scripts/mcm-reference/analyze-fixed-program-chain.mjs';
const live=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/fixed-pixel-live-wine11.json.br',import.meta.url))));
test('native fixed descriptors drive complete program lookup and retained selection',()=>{
 const f=live(),r=analyzeFixedProgramChain(f.rows);
 assert.deepEqual(r,f.chainResult);assert.equal(r.keys,28);
 assert.equal(r.retainedSelections,27);assert.equal(r.retainedVertex,16);
 assert.equal(r.cache.comparisons,407);assert.equal(r.cache.hits,r.keys);
});
test('joined chain rejects mutually consistent captured keys that disagree with computed IDs',()=>{
 const f=live();
 f.rows.find(r=>r.phase==='program-key-fields').key[1]^=1;
 f.rows.find(r=>r.phase==='program-cache-input').key[1]^=1;
 assert.throws(()=>analyzeFixedProgramChain(f.rows),/Computed complete program key/);
});
test('joined chain rejects changed retained selection and missing key producers',()=>{
 let f=live();const entries=f.rows.filter(r=>r.phase==='program-key-entry');
 entries[1].program=entries[0].program;entries[1].priorKey=[...entries[0].priorKey];
 assert.throws(()=>analyzeFixedProgramChain(f.rows),/Selected program differs from retained return/);
 f=live();f.rows=f.rows.filter(r=>!r.phase.startsWith('fixed-pixel-'));
 assert.throws(()=>analyzeFixedProgramChain(f.rows),/Missing computed pixel ID/);
 f=live();f.rows.splice(f.rows.findIndex(r=>r.phase==='program-key-fields'),1);
 assert.throws(()=>analyzeFixedProgramChain(f.rows));
});
test('joined chain refuses unsupported shader paths rather than copying their keys',()=>{
 for(const change of [r=>r.flags|=8,r=>r.flags&=~1,r=>r.shaders[0]=1]){
  const f=live();change(f.rows.find(r=>r.phase==='program-key-entry'));
  assert.throws(()=>analyzeFixedProgramChain(f.rows),/Unsupported/);
 }
});
