import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareLiveParticlePoolTicks} from '../scripts/mcm-reference/compare-live-particle-pool.mjs';
test('all 399 captured native shared-pool calls match complete pool/particle memory',()=>{
 const {events}=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-particle-pool-wine11.json.br',import.meta.url))));
 const r=compareLiveParticlePoolTicks(events);assert.equal(r.ticks,399);assert.equal(r.comparedWords,7999551);assert.equal(r.changedWords,82751);assert.equal(r.differences,0);
 const changed=Buffer.from(events[2].particlesHex,'hex');changed[0x44]^=1;events[2].particlesHex=changed.toString('hex');
 const bad=compareLiveParticlePoolTicks(events);assert.equal(bad.differences,1);assert.equal(bad.reports[0].firstDifferences[0].offset,0x44);
 events[0].particleStride=68;assert.throws(()=>compareLiveParticlePoolTicks(events),/Full initial particle allocation capture/);
});
