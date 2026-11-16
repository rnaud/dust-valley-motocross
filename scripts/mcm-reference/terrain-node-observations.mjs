import {CapturedBytes as Buffer} from '../../src/physics/mcm/captured-bytes.js';
import assert from '../../src/physics/mcm/captured-invariants.js';
// Decoder for original observations only. Never bind its mutable buffers to
// recovered simulation state: later snapshots are assertion targets.
export function createTerrainNodeObservationDecoder(initial){
 assert.equal(initial.sequence,0);assert.equal(initial.full,true);assert.equal(initial.nodes.length,initial.nodeCount);assert.ok(initial.nodeCount>0&&initial.nodeCount<=16384);
 const nodes=new Map(),tables=new Map();
 const bytes=row=>{assert.ok(Number.isInteger(row.address)&&row.address>0);const b=Buffer.from(row.hex,'hex');assert.equal(b.length,0x210,'Incomplete terrain node');return b;};
 for(const row of initial.nodes){assert.ok(!nodes.has(row.address),'Duplicate terrain node');const b=bytes(row),table=b.readUInt32LE(0x54);nodes.set(row.address,b);
  if(table){assert.equal(row.childTable?.address,table);const t=Buffer.from(row.childTable.hex,'hex');assert.equal(t.length,1024);assert.ok(!tables.has(table),'Shared terrain child table');tables.set(table,t);}else assert.equal(row.childTable,undefined);
 }
 assert.ok(nodes.has(initial.root));const visited=new Set();
 const visit=address=>{assert.ok(!visited.has(address),'Terrain graph cycle or duplicate parent');visited.add(address);const b=nodes.get(address);assert.ok(b,'Missing terrain child');const table=b.readUInt32LE(0x54);if(table){const t=tables.get(table);for(let i=0;i<256;i++){const child=t.readUInt32LE(i*4);if(child)visit(child);}}};visit(initial.root);assert.equal(visited.size,nodes.size,'Unreachable terrain node');
 let sequence=0;
 return {nodes,tables,get sequence(){return sequence;},apply(snapshot){
  assert.equal(snapshot.sequence,sequence+1,'Nonsequential terrain snapshot');assert.equal(snapshot.full,false);assert.equal(snapshot.root,initial.root);assert.equal(snapshot.nodeCount,nodes.size);
  const updates=new Map(),changes=[];
  for(const row of snapshot.nodes){assert.ok(nodes.has(row.address),'New terrain node needs topology capture');assert.ok(!updates.has(row.address),'Duplicate terrain update');assert.equal(row.childTable,undefined);const b=bytes(row),old=nodes.get(row.address);
   assert.equal(b.readUInt32LE(0x54),old.readUInt32LE(0x54),'Terrain topology changed');assert.equal(b.readUInt32LE(0x5c),old.readUInt32LE(0x5c),'Terrain owner changed');
   for(let offset=0;offset<b.length;offset+=4){const before=old.readUInt32LE(offset),after=b.readUInt32LE(offset);if(before!==after)changes.push({address:row.address,offset,before,after});}updates.set(row.address,b);
  }
  for(const[a,b]of updates)nodes.set(a,b);sequence++;return changes;
 }};
}
