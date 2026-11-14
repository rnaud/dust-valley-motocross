import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {compareLiveRiderResponse} from '../scripts/mcm-reference/compare-live-rider-response.mjs';
import {respondMcmRiderSecondary} from '../src/physics/mcm/rider-collision-response.js';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-rider-response-wine11.json.br',import.meta.url))));
test('captured rider crash callback matches all original actor, transform and grid words',()=>{
 const {captured:c}=fixture(),out=Buffer.from(c.outputHex,'hex'),r=compareLiveRiderResponse(c.checkpoint,c.observation,out);
 assert.equal(r.differences,0);assert.equal(r.comparedWords,35376);assert.equal(r.changedWords,20);
 let cursor=0;for(const b of c.observation.blocks){if(b.address===0x51dd630){out[cursor+0x58]^=1;break;}cursor+=b.size;}
 assert.equal(compareLiveRiderResponse(c.checkpoint,c.observation,out).differences,1);
});
test('counterfactual rider contact branches match original execution',()=>{
 const {variants}=fixture();assert.equal(variants.length,26);let count=0;
 for(const [i,c] of variants.entries()){const r=compareLiveRiderResponse(c.checkpoint,c.observation,Buffer.from(c.outputHex,'hex'));assert.equal(r.differences,0,`case ${i}: ${JSON.stringify(r.firstDifferences)}`);count+=r.comparedWords;}
 assert.equal(count,919776);
});
test('rider response rejects missing coefficients and secondary class keeps sentinel 3',()=>{
 const {captured:c}=fixture();c.observation.blocks=c.observation.blocks.filter(b=>b.address!==0x4e21a4);c.observation.blockCount--;assert.throws(()=>compareLiveRiderResponse(c.checkpoint,c.observation,Buffer.from(c.outputHex,'hex')),/Missing|Uncaptured/);
 const rider={contactClass:3},collision={other:{collisionClass:0}};respondMcmRiderSecondary(rider,collision);assert.equal(rider.contactClass,3);rider.contactClass=0xffffffff;respondMcmRiderSecondary(rider,collision);assert.equal(rider.contactClass,0);
});
