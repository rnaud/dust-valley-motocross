import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {evaluateCollisionSound} from '../scripts/mcm-reference/compare-collision-sound.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/collision-sound-wine11.json',import.meta.url)));
test('collision sound selection and device calls match 512 original cases with exact shared RNG consumption',()=>{
 assert.equal(fixture.source.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../scripts/mcm-reference/collision-sound-oracle.c',import.meta.url))).digest('hex'),fixture.source.oracleSha256);
 assert.equal(fixture.fixtures.length,512);
 for(const {input,output}of fixture.fixtures)assert.deepEqual(evaluateCollisionSound(input),output);
});
test('busy channels consume seven draws then stop slot zero; available channels consume one',()=>{
 for(const {input,output}of fixture.fixtures){
  if(input.playingMask===63){assert.equal(output.randomCalls,7);assert.equal(output.choice,0);assert.ok(output.trace.some((v,i)=>i%3===0&&v===3&&output.trace[i+1]===0&&output.trace[i+2]===1));}
  if(input.playingMask===0)assert.equal(output.randomCalls,1);
  const volumeCalls=output.trace.filter((v,i)=>i%3===0&&v===5).length;assert.equal(volumeCalls,input.volume===-1?0:1);
 }
});
