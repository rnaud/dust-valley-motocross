import test from 'node:test';
import assert from 'node:assert/strict';
import {connectWorldTerrainBankReads} from '../scripts/mcm-reference/world-terrain-bank-reads.mjs';
import {sampleMcmTerrain} from '../src/physics/mcm/terrain-sample.js';
function setup(){
 const bytes=Buffer.alloc(0x1654),record=Buffer.alloc(0x58);record.writeUInt32LE(2,0x50);
 for(let i=0;i<289;i++){bytes.writeFloatLE(-0,i*16+4);bytes.writeFloatLE(1,i*16+8);bytes.writeFloatLE(-0,i*16+12);}
 const root={level:0,scale:-1,bias:0,heights:Array(289).fill(0),normals:Array.from({length:289},()=>[0,1,0])};
 const initial={resources:{banks:[{address:2,hex:bytes.toString('hex')}]},nodeSnapshot:{root:1,nodes:[{address:1,hex:record.toString('hex')}]}};
 return{root,runtime:{world:{tree:{nodes:new Map([[3,{update:0x411000,terrainInitial:initial}]])}}}};
}
test('initial terrain bank restores signed zero lost by JSON before negative scaling',()=>{
 const {root,runtime}=setup();assert.ok(Object.is(sampleMcmTerrain(root,0,0).normal[0],-0));
 connectWorldTerrainBankReads(runtime,{root});assert.ok(Object.is(root.normals[0][0],-0));
 assert.ok(Object.is(sampleMcmTerrain(root,0,0).normal[0],0));assert.ok(Object.is(sampleMcmTerrain(root,0,0).normal[2],0));
});
test('normal binding rejects a numerically different terrain asset',()=>{
 const {root,runtime}=setup();root.normals[17][0]=.125;
 assert.throws(()=>connectWorldTerrainBankReads(runtime,{root}),/normal disagreement/);
});
