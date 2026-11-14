import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRiderTickEntry} from '../scripts/mcm-reference/compare-live-rider-tick-entry.mjs';
import {beginMcmRiderTick} from '../src/physics/mcm/rider-tick-entry.js';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-rider-tick-entry-wine11.json.br',import.meta.url))));
test('separate rider tick starts the captured crash animation once',()=>{
 const {cases}=fixture();
 for(let i=0;i<cases.length;i++){
  const report=compareLiveRiderTickEntry(cases[i].before,cases[i].after);
  assert.equal(report.entered,i===0);assert.equal(report.comparedWords,505);assert.equal(report.changedWords,i===0?6:0);assert.equal(report.differences,0);
 }
 const c=cases[0],bytes=Buffer.from(c.after.proxyHex,'hex');bytes[0x14]^=1;
 assert.equal(compareLiveRiderTickEntry(c.before,{...c.after,proxyHex:bytes.toString('hex')}).differences,1);
 assert.throws(()=>compareLiveRiderTickEntry(c.before,{...c.after,playerActive:1}),/boundary differs/);
});
test('unconnected null-animation rider branch fails instead of clearing pending state',()=>{
 const rider={flag13c:1};assert.throws(()=>beginMcmRiderTick({rider,animation:{},selectedRecord:null}),/not connected/);assert.equal(rider.flag13c,1);
});
