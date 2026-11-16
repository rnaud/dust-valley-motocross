import assert from 'node:assert/strict';
import {setupMcmTerrainView} from '../../src/physics/mcm/terrain-view-setup.js';
// This verifies only camera/detail outputs. Terrain traversal, working arrays,
// counters and timing remain external and must not be reported as recovered.
export function connectWorldTerrainView(runtime,chase){
 assert.ok(chase,'Terrain view requires retained chase camera');
 const actors=[...runtime.world.tree.nodes.values()].filter(n=>n.update===0x411000);assert.equal(actors.length,1);
 const actor=actors[0],initial=actor.terrainInitial;assert.ok(initial,'Missing terrain initialization');assert.equal(actor.stateBytes?.length,0x17d0);assert.equal(initial.hex,actor.stateBytes.toString('hex'));assert.equal(initial.camera,chase.address);
 const bytes=Buffer.from(actor.stateBytes),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.length),scale=view.getUint32(0x40,true),mode=view.getUint32(0x958,true);let ticks=0;
 const offsets=[0x48,0x4c,0x50,0x54,0x58,0x5c,0x60,0x64,0x68];
 return{address:actor.address,get ticks(){return ticks;},step(frame){if(!frame)return;const c=chase.cameraState?.renderCamera;assert.ok(c,'Missing computed terrain camera');setupMcmTerrainView(view,{position:c.values.slice(0,3),fov:c.fov,width:c.width},mode);ticks++;},compare(row){
  assert.ok(row,'Missing terrain view observation');assert.equal(row.address,actor.address);assert.equal(row.camera,chase.address);const expected=Buffer.from(row.hex,'hex');assert.equal(expected.length,bytes.length);assert.equal(expected.readUInt32LE(0x40),scale,'Unrecovered terrain scale changed');assert.equal(expected.readUInt32LE(0x958),mode,'Unrecovered terrain detail mode changed');
  return{words:offsets.length,differences:offsets.filter(o=>view.getUint32(o,true)!==expected.readUInt32LE(o)).map(o=>({offset:o,actual:view.getUint32(o,true),expected:expected.readUInt32LE(o)}))};
 }};
}
