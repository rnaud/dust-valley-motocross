import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {checkpointMemory,loadLiveVisuals} from '../scripts/mcm-reference/live-checkpoint.mjs';
import {floatBits} from '../src/physics/mcm/math.js';
import {resolveMcmWorldMatrix} from '../src/physics/mcm/world-transform.js';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/visual-replay-checkpoint-wine11.json.br',import.meta.url))));
function change(c,address,offset,value){const block=c.blocks.find(b=>b.address===address),bytes=Buffer.from(block.hex,'hex');bytes.writeUInt32LE(value,offset);block.hex=bytes.toString('hex');}

test('live visuals load both component graphs with original matrix words and shared identity',()=>{
 const {checkpoint:c,rows}=fixture(),v=loadLiveVisuals(c),m=checkpointMemory(c);
 assert.equal(c.blockCount,41);assert.equal(v.nodes.size,24);
 assert.equal(v.bike.components.length,8);assert.equal(v.rider.components.length,16);
 for(const object of [v.bike,v.rider]){
  assert.equal(object.components[0].node,object.bodyNode);
  assert.equal(object.components[1].positionEnabled,1);
  for(const {node} of object.components)assert.equal(node,v.nodes.get(node.address));
 }
 for(const node of v.nodes.values()){
  for(const [key,offset] of [['local',0x84],['world',0xc4]])assert.deepEqual(node[key].map(floatBits),Array.from({length:16},(_,i)=>m.u32(node.address+offset+i*4)));
  if(node.firstChild)assert.equal(node.firstChild.parent,node);
 }
 const expected=Buffer.from(rows[0].matrixHex,'hex');
 assert.deepEqual(resolveMcmWorldMatrix(v.bike.bodyNode).map(floatBits),Array.from({length:16},(_,i)=>expected.readUInt32LE(i*4)));
});

test('live visual loading rejects missing nodes, cycles and inconsistent ownership links',()=>{
 const {checkpoint:c}=fixture(),v=loadLiveVisuals(c),child=v.rider.components[1].node;
 for(const [address,offset,value,pattern] of [[v.rider.bodyNode.address,0x110,v.rider.bodyNode.address,/Cyclic transform sibling/],[child.address,0x108,child.address,/Cyclic transform parent/],[child.address,0x110,child.address,/Cyclic transform sibling/],[child.address,0x108,0,/parent\/child mismatch/]]){
  const copy=structuredClone(c);change(copy,address,offset,value);assert.throws(()=>loadLiveVisuals(copy),pattern);
 }
 const missing=structuredClone(c);missing.blocks=missing.blocks.filter(b=>b.address!==child.address);missing.blockCount--;
 assert.throws(()=>loadLiveVisuals(missing),/Missing checkpoint memory/);
 const malformed=structuredClone(c);change(malformed,c.bikeAddress,0x230,33);assert.throws(()=>loadLiveVisuals(malformed),/component count/);
});

test('expanded visual checkpoint retains repeatable motion and exact conditional engine results',async()=>{
 const {compareBikeReplay}=await import('../scripts/mcm-reference/compare-bike.mjs');
 const {compareLiveCheckpointEngine}=await import('../scripts/mcm-reference/compare-live-checkpoint-engine.mjs');
 const input=fixture(),report=compareBikeReplay(input.rows);
 assert.equal(report.comparedBoundaryPairs,800);assert.equal(report.firstMotionDifference,null);
 assert.deepEqual(report.differingRiderWords,{});assert.deepEqual(report.differingEngineWords,{});
 assert.deepEqual(Object.keys(report.differingBikeWords),['0x488','0x48c','0x490','0x494']);
 assert.equal(compareLiveCheckpointEngine(input).differences,0);
});
