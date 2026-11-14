import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';
import {loadLiveCollisionWorld} from '../scripts/mcm-reference/live-collision-world.mjs';
import {compareLiveCollisionGrid} from '../scripts/mcm-reference/compare-live-collision-grid.mjs';
import {updateMcmCollisionGrid} from '../src/physics/mcm/collision-grid.js';
const fixture=()=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/live-collision-grid-wine11.json.br',import.meta.url))));
const write=(o,a,v)=>{const b=o.blocks.find(b=>a>=b.address&&a+4<=b.address+b.size),bytes=Buffer.from(b.hex,'hex');bytes.writeUInt32LE(v,a-b.address);b.hex=bytes.toString('hex');};
test('captured shared collision grid matches every original memory word',()=>{
 const {checkpoint,observation,outputHex}=fixture(),output=Buffer.from(outputHex,'hex'),r=compareLiveCollisionGrid(checkpoint,observation,output);
 assert.equal(r.differences,0);assert.equal(r.comparedWords,28618);assert.equal(r.changedWords,6);assert.equal(r.objects,4);assert.equal(r.cells,4097);assert.equal(r.entries,16);
 output[0x100]^=1;assert.equal(compareLiveCollisionGrid(checkpoint,observation,output).differences,1);
});
test('live graph preserves shared identity when every object unlinks and reinserts',()=>{
 const {checkpoint,observation}=fixture(),w=loadLiveCollisionWorld(checkpoint,observation),cell=w.grid.cells[4096];
 const order=()=>{const result=[];for(let n=cell.next;n;n=n.next)result.push(n.owner);return result;};
 assert.deepEqual(order(),[0,2,1,3]);assert.equal(cell.next,w.objects[0].entries[0]);
 for(const o of w.objects)updateMcmCollisionGrid(o,w.grid,w.enabled);
 assert.deepEqual(order(),[0,1,2,3]);assert.equal(cell.next.previous,cell);
 assert.equal(w.objects[3].entries[0].next,null);
});
test('collision graph loader rejects mismatched captures, overlapping state and broken links',()=>{
 const a=fixture();a.observation.captureId='wrong';assert.throws(()=>loadLiveCollisionWorld(a.checkpoint,a.observation),/boundary/);
 const b=fixture();write(b.observation,b.observation.managerAddress+0xf8+240,99);assert.throws(()=>loadLiveCollisionWorld(b.checkpoint,b.observation),/Overlapping/);
 const c=fixture(),w=loadLiveCollisionWorld(c.checkpoint,c.observation);write(c.observation,w.objects[0].entriesAddress,0xdeadbeef);assert.throws(()=>loadLiveCollisionWorld(c.checkpoint,c.observation),/Dangling/);
 const d=fixture(),x=loadLiveCollisionWorld(d.checkpoint,d.observation);write(d.observation,x.objects[3].entriesAddress+4,x.objects[0].entriesAddress);assert.throws(()=>loadLiveCollisionWorld(d.checkpoint,d.observation),/linked list/);
 const e=fixture(),y=loadLiveCollisionWorld(e.checkpoint,e.observation);write(e.observation,y.objects[0].entriesAddress+8,3);assert.throws(()=>loadLiveCollisionWorld(e.checkpoint,e.observation),/ownership/);
});
