import {CapturedBytes as Buffer} from '../../src/physics/mcm/captured-bytes.js';
import assert from '../../src/physics/mcm/captured-invariants.js';
// Observation-only delta decoder. The retained simulation must own separate
// buffers and must not receive these later snapshot bytes as state inputs.
export function createTerrainMeshObservationDecoder(initial,nodes){
 const buffers=new Map();let sequence=-1;
 const readHex=(hex,size)=>{assert.equal(typeof hex,'string');assert.equal(hex.length,size*2);assert.match(hex,/^[0-9a-f]*$/i);return Buffer.from(hex,'hex');};
 const apply=row=>{
  assert.equal(row.sequence,sequence+1,'Nonsequential terrain mesh snapshot');assert.equal(row.full,sequence===-1);
  const updates=new Map();for(const item of row.buffers){
   assert.ok(nodes.has(item.node),'Unknown mesh owner');assert.ok(item.kind===0||item.kind===1);
   const key=item.node+':'+item.kind;assert.ok(!updates.has(key),'Duplicate terrain mesh');
   const node=nodes.get(item.node),pointer=node.readUInt32LE(0x1b8+item.kind*4),capacity=node.readUInt32LE(0x1c8+item.kind*4);
   assert.equal(item.pointer,pointer);assert.ok(capacity<=(item.kind?1536:289));assert.equal(item.size,pointer?capacity*(item.kind?2:32):0);
   updates.set(key,{node:item.node,kind:item.kind,pointer,bytes:readHex(item.hex,item.size)});
  }
  if(sequence===-1)assert.equal(updates.size,nodes.size*2,'Incomplete initial terrain meshes');
  const builder=readHex(row.builderHex,0x2d34),indices=readHex(row.indicesHex,0xc00);
  for(const[key,item]of updates)buffers.set(key,item);
  // Validate unchanged records too: a pointer/capacity change cannot be omitted.
  for(const item of buffers.values()){
   const node=nodes.get(item.node),pointer=node.readUInt32LE(0x1b8+item.kind*4),capacity=node.readUInt32LE(0x1c8+item.kind*4);
   assert.equal(item.pointer,pointer,'Missing mesh pointer transition');assert.equal(item.bytes.length,pointer?capacity*(item.kind?2:32):0,'Missing mesh capacity transition');
  }
  sequence=row.sequence;return{builder,indices,normalsEnabled:row.normalsEnabled,textureScaleBits:row.textureScaleBits,accountingBytes:row.accountingBytes};
 };
 const state=apply(initial);return{buffers,initial:state,apply,get sequence(){return sequence;}};
}
