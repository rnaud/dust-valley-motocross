import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {loadLiveActorTree} from '../scripts/mcm-reference/live-actor-tree.mjs';
import {analyzeGridTrace} from '../scripts/mcm-reference/analyze-grid-trace.mjs';
const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/ai-actor-tree-wine11.json.br',import.meta.url))));
const json=name=>JSON.parse(f.files[name+'.json']),checkpoint=json('checkpoint'),collision=json('collision');
test('atomic actor hierarchy distinguishes bike render base from actor subobject',()=>{
 for(const [name,value] of Object.entries(f.files))assert.equal(createHash('sha256').update(value).digest('hex'),f.provenance.fileSha256[name]);
 assert.equal((f.files['cleanup.log'].match(/restored=1/g)||[]).length,44);assert.match(f.files['cleanup.log'],/debugger=0 clean=1/);
 const tree=loadLiveActorTree(checkpoint,collision,json('actor-tree'));
 assert.equal(tree.nodes.size,76);assert.equal(tree.root.address,0x1951910);assert.equal(tree.rider.parent.address,checkpoint.bikeAddress+0x404);
 const player=tree.nodes.get(0x51dd978);assert.equal(player.parent.parent,tree.rider.parent.parent);
 assert.equal(player.parent.update,0x420760);assert.equal(tree.rider.parent.update,0x420760);
 assert.ok(tree.order.indexOf(player.address)<tree.order.indexOf(tree.rider.address));
 const rows=f.files['grid.jsonl'].trim().split('\n').map(JSON.parse),result=analyzeGridTrace(checkpoint,collision,rows);
 assert.equal(result.calls.length,83);assert.equal(result.words,4096548);assert.deepEqual(result.differences,[]);
 assert.deepEqual(result.calls.filter(c=>c.caller===0x40ea7c).map(c=>c.collider),[0x1b0e160,0x1b23b10,0x1b0e160,0x1b23b10,0x1b0e160,0x1b23b10]);
});
test('actor tree rejects mismatched boundaries, omitted nodes, and changed captured links',()=>{
 const changed=json('actor-tree');changed.captureId+='x';assert.throws(()=>loadLiveActorTree(checkpoint,collision,changed));
 const missing=json('actor-tree');missing.nodes.pop();assert.throws(()=>loadLiveActorTree(checkpoint,collision,missing),/Missing actor link/);
 const corrupt=json('actor-tree'),rider=corrupt.nodes.find(n=>n.address===0x523c2a0),bytes=Buffer.from(rider.hex,'hex');bytes[0x18]^=1;rider.hex=bytes.toString('hex');assert.throws(()=>loadLiveActorTree(checkpoint,collision,corrupt),/overlap differs/);
});
