import test from 'node:test';
import assert from 'node:assert/strict';
import {compareLiveTerrain} from '../scripts/mcm-reference/compare-live-terrain.mjs';
const observation=()=>{
 const leaf={offset:32,bias:0,scale:1,level:0,shift:0,bankIndex:0};
 const root={offset:16,bias:0,scale:1,level:1,shift:8,bankIndex:0,children:Array(256).fill(leaf)};
 const banks=[512,580,4624].map(size=>({size,compressed:false,data:Buffer.alloc(size,7)}));
 const terrain={root,nodes:new Map([[16,root],[32,leaf]]),heightScale:.5,worldToGrid:2,banks:[banks]};
 const prefix=Buffer.alloc(0xa08),tree=Buffer.alloc(1048*2);
 prefix.writeFloatLE(.5,0x40);prefix.writeFloatLE(2,0xa04);prefix.writeUInt32LE(0x100,0x44);prefix.writeUInt32LE(1,0x9f8);
 for(const [index,node] of [root,leaf].entries()){
  const at=index*1048;tree.writeUInt32LE(index?0x200:0x100,at);tree.writeFloatLE(node.bias,at+4);tree.writeFloatLE(node.scale,at+8);
  tree.writeUInt32LE(node.level,at+12);tree.writeUInt32LE(node.shift,at+16);tree.writeUInt32LE(node.bankIndex,at+20);
  if(!index)for(let i=0;i<256;i++)tree.writeUInt32LE(0x200,at+24+i*4);
 }
 return {terrain,data:{prefix,tree,banks:Buffer.concat(banks.map(b=>b.data))}};
};

test('live terrain comparison preserves byte, node and scale differences',()=>{
 const {terrain,data}=observation();assert.equal(compareLiveTerrain(terrain,data).nodeDifferences,0);
 data.banks[100]^=1;data.tree.writeFloatLE(3,1048+4);data.prefix.writeFloatLE(4,0xa04);
 const r=compareLiveTerrain(terrain,data);
 assert.equal(r.byteDifferences,1);assert.equal(r.nodeDifferences,1);assert.equal(r.scaleDifferences,1);
 assert.notEqual(r.bankSha256,r.decodedBankSha256);
});

test('live terrain comparison rejects truncated, dangling and orphaned nodes',()=>{
 const {terrain,data}=observation();
 assert.throws(()=>compareLiveTerrain(terrain,{...data,banks:data.banks.subarray(1)}),/Truncated terrain banks/);
 assert.throws(()=>compareLiveTerrain(terrain,{...data,tree:data.tree.subarray(1)}),/Truncated terrain observation/);
 data.tree.writeUInt32LE(0x300,24);assert.throws(()=>compareLiveTerrain(terrain,data),/Missing terrain node/);
 data.tree.writeUInt32LE(0x200,24);
 const orphan=Buffer.alloc(1048);orphan.writeUInt32LE(0x300);
 assert.throws(()=>compareLiveTerrain(terrain,{...data,tree:Buffer.concat([data.tree,orphan])}),/Unreachable/);
 assert.throws(()=>compareLiveTerrain(terrain,{...data,tree:Buffer.concat([data.tree,data.tree.subarray(1048)])}),/Duplicate/);
});
