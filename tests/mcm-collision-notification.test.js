import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {evaluateCollisionNotification} from '../scripts/mcm-reference/compare-collision-notification.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/collision-notification-wine11.json',import.meta.url)));
test('collision notification, spatial attenuation and random stream match 1536 original cases',()=>{
 assert.equal(fixture.source.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../scripts/mcm-reference/collision-notification-oracle.c',import.meta.url))).digest('hex'),fixture.source.oracleSha256);
 assert.equal(fixture.fixtures.length,1536);
 for(const {input,output}of fixture.fixtures)assert.deepEqual(evaluateCollisionNotification(input),output);
});
test('notification gates preserve RNG and rider impacts bypass random sample selection',()=>{
 let played=0;
 for(const {input,output}of fixture.fixtures){
  if(!input.selected||input.crash||output.volume<=-2500){assert.equal(output.randomCalls,0);assert.deepEqual(output.trace,[]);}
  if(input.type===1){assert.equal(output.randomCalls,0);if(output.trace.length){assert.deepEqual(output.trace,[6,6,0,5,6,output.volume>>>0]);played++;}}
 }
 assert.ok(played>0);
});
