import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {compareTerrainTraversal} from '../scripts/mcm-reference/compare-terrain-traversal.mjs';
import {traverseMcmTerrain} from '../src/physics/mcm/terrain-traversal.js';
import {clearMcmTerrainNode,selectMcmTerrainNode} from '../src/physics/mcm/terrain-node-select.js';

for(const [kind,words] of [['control',1730257],['selection',1777554],['bounds',1692900],['projection',1692900]]) {
  test(`terrain traversal ${kind} matches original node states and service order`,()=>{
    const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/terrain-traversal-${kind}-wine11.json.br`,import.meta.url))));
    const input=Buffer.from(fixture.inputHex,'hex'),output=Buffer.from(fixture.outputHex,'hex');
    for(const[name,bytes]of[['input',input],['output',output]])assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.provenance[name+'Sha256']);
    assert.deepEqual(compareTerrainTraversal(input,output,fixture.options),{cases:512,words,differences:0,examples:[]});
    output[24+0x182]^=1;
    assert.equal(compareTerrainTraversal(input,output,fixture.options).differences,1);
    assert.throws(()=>compareTerrainTraversal(input,output.subarray(0,-1),fixture.options),/Incomplete/);
  });
}

test('terrain traversal and cleanup reject missing projection and release services',()=>{
  const state=new DataView(new ArrayBuffer(0x210));
  assert.throws(()=>traverseMcmTerrain(1,0,0,[0,0,0],[1,1,1],0,0,16,0,0,{node:()=>state,boundsTests:0}),/Unconnected.*projectBounds/);
  state.setUint32(0x1b8,123,true);
  assert.throws(()=>clearMcmTerrainNode(1,{node:()=>state}),/Unconnected.*free/);
  assert.equal(state.getUint32(0x1b8,true),123,'A missing release cannot silently discard the allocation');
});

test('lazy terrain loading preserves virtual method identity and reloads table after callbacks',()=>{
  const bytes=new ArrayBuffer(0x4000),memory=new DataView(bytes),node=new DataView(bytes,0,0x210),owner=new DataView(bytes,0x3000,0x100),calls=[];
  node.setUint32(0,0x5000,true);node.setInt32(0x1c,0x7fffffff,true);node.setUint32(0x34,128,true);
  const env={node:()=>node,owner:()=>owner,u32:p=>memory.getUint32(p,true),put32:(p,v)=>memory.setUint32(p,v,true),
    allocate(size){calls.push(['allocate',size]);return calls.filter(c=>c[0]==='allocate').length===1?0x1000:0x1400;},
    seek(...args){calls.push(['seek',...args]);},
    read(...args){calls.push(['read',...args]);memory.setUint32(0x1400,256,true);},
    callVirtual(method,self,...args){calls.push(['virtual',method,self,...args]);if(method===0x5014){node.setUint32(0,0x6000,true);return;}assert.equal(method,0x5010);node.setUint32(0x54,0x1800,true);return 0x2200;},
  };
  selectMcmTerrainNode(0,42,43,0,env);
  assert.deepEqual(calls.map(c=>c.slice(0,2)),[['virtual',0x5014],['allocate',1024],['allocate',1024],['seek',42],['read',0x1400],['seek',42],['virtual',0x5010]]);
  assert.equal(memory.getUint32(0x1800,true),0x2200);
  assert.equal(memory.getUint32(0x1000,true),0);
  assert.deepEqual(calls.at(-1),['virtual',0x5010,0,42,0,0]);
});
