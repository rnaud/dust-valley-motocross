import {CapturedBytes as Buffer} from '../../src/physics/mcm/captured-bytes.js';
import assert from '../../src/physics/mcm/captured-invariants.js';
// Segment traversal may read beyond the 289 height entries into the bank's
// following lookup tables. Use the same immutable captured bank allocation.
export function connectWorldTerrainBankReads(runtime,terrain){
 const actor=[...runtime.world.tree.nodes.values()].find(n=>n.update===0x411000),initial=actor?.terrainInitial;
 if(!initial?.resources||!initial.nodeSnapshot)return;
 const records=new Map(initial.nodeSnapshot.nodes.map(n=>[n.address,n])),banks=new Map(initial.resources.banks.map(b=>[b.address,Buffer.from(b.hex,'hex')])),seen=new Map();
 const normalBanks=new Map();
 let adjacentReads=0;
 function visit(node,address){
  if(seen.has(node)){assert.equal(seen.get(node),address);return;}seen.set(node,address);
  const record=records.get(address);assert.ok(record,'Missing captured terrain node');const bytes=Buffer.from(record.hex,'hex'),bank=banks.get(bytes.readUInt32LE(0x50));assert.ok(bank,'Missing captured terrain bank');
  for(let i=0;i<289;i++)assert.equal(node.heights[i],bank.readUInt16LE(i*16+2),'Terrain asset/captured bank disagreement');
  // JSON terrain assets cannot preserve -0. On negative-scale nodes this sign
  // changes flat contact tangents. Retain the original immutable normal words.
  if(!normalBanks.has(bank))normalBanks.set(bank,Array.from({length:289},(_,i)=>[4,8,12].map(offset=>bank.readFloatLE(i*16+offset))));
  const normals=normalBanks.get(bank);
  for(let i=0;i<289;i++)for(let j=0;j<3;j++)assert.ok(node.normals[i][j]===normals[i][j],'Terrain asset/captured normal disagreement');
  node.normals=normals;
  node.readHeight=index=>{
   const offset=index*16+2;if(!Number.isInteger(index)||index<0||offset+2>bank.length)throw Error('Terrain height read outside captured bank');
   adjacentReads++;return bank.readUInt16LE(offset);
  };
  if(node.children){assert.ok(record.childTable,'Missing terrain child table');const table=Buffer.from(record.childTable.hex,'hex');
   node.children.forEach((child,i)=>{const pointer=table.readUInt32LE(i*4);if(child)visit(child,pointer);else assert.equal(pointer,0);});
  }else assert.ok(!record.childTable);
 }
 visit(terrain.root,initial.nodeSnapshot.root);
 return {report:()=>({nodes:seen.size,adjacentReads})};
}
