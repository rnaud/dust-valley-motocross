import assert from 'node:assert/strict';
import {tickMcmSceneRenderer} from '../../src/physics/mcm/scene-renderer-tick.js';
import {setMcmCameraClip} from '../../src/physics/mcm/camera-clip.js';
import {composeMcmCameraMatrices} from '../../src/physics/mcm/camera-matrices.js';
const bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0];
export function connectWorldSceneRenderer(runtime,chase,files){
 assert.ok(chase,'Scene renderer requires retained camera');
 const initial=JSON.parse(files['world-renderer-initial.json']),actor=runtime.world.tree.nodes.get(initial.actor),owner=Buffer.from(initial.ownerHex,'hex');
 assert.equal(initial.phase,'world-entry');assert.equal(initial.frame,0);assert.equal(initial.deltaBits,runtime.world.entry.dtBits);
 assert.equal(actor?.update,0x43e660);assert.equal(actor.stateBytes?.length,0x9c);assert.equal(actor.stateBytes.toString('hex'),initial.actorHex);
 assert.equal(initial.camera,runtime.world.entry.view);assert.equal(owner.length,0x40);assert.equal(actor.stateBytes.readUInt32LE(0x1c),initial.owner);
 const cameraInitial=JSON.parse(files['world-camera-initial.json']);assert.equal(cameraInitial.blocks.find(b=>b.address===initial.camera)?.hex,initial.cameraHex,'Mixed renderer/camera initialization');
 const rows=files['world-renderer-observations.jsonl'].trim().split('\n').filter(Boolean).map(JSON.parse),reports=[];let consumed=0;
 const memory={u32:p=>{if(p>=actor.address&&p+4<=actor.address+actor.stateBytes.length)return actor.stateBytes.readUInt32LE(p-actor.address);if(p>=initial.owner&&p+4<=initial.owner+owner.length)return owner.readUInt32LE(p-initial.owner);throw Error('Uncaptured scene renderer pointer');},f32:p=>{assert.equal(p,actor.address+0x38);return actor.stateBytes.readFloatLE(0x38);}};
 const compare=(row,state)=>{
  assert.equal(row.actor,actor.address);assert.equal(row.owner,initial.owner);assert.equal(row.camera,initial.camera);
  assert.equal(row.actorHex,actor.stateBytes.toString('hex'),'Retained renderer actor differs');
  const observedOwner=Buffer.from(row.ownerHex,'hex');assert.equal(observedOwner.length,owner.length);
  for(const offset of [0xc,0x2c])assert.equal(observedOwner.readUInt32LE(offset),owner.readUInt32LE(offset),'Unrecovered renderer owner changed');
  const camera=Buffer.from(row.cameraHex,'hex');assert.equal(camera.length,0x254);
  const actual=Array.from(new Uint32Array(state.matrices.buffer,state.matrices.byteOffset,state.matrices.length));
  const expected=[...Array.from({length:64},(_,i)=>camera.readUInt32LE(0x30+i*4)),camera.readUInt32LE(0x16c)];
  assert.deepEqual(actual,expected,'Retained renderer matrices differ');
  assert.equal(bits(state.renderCamera.near),camera.readUInt32LE(0x1a8));assert.equal(bits(state.renderCamera.far),camera.readUInt32LE(0x1ac));
 };
 return{address:actor.address,reports,step(frame,delta){
  // Atomic world entry is after this scene child in the first frame.
  if(frame===0)return;
  const selected=rows.filter(r=>r.frame===frame);assert.equal(selected.length,3,'Missing scene renderer boundaries');
  assert.deepEqual(selected.map(r=>r.phase),['entry','submit','result']);for(const r of selected)assert.equal(r.deltaBits,bits(delta));
  const state=chase.cameraState;assert.ok(state,'Missing retained renderer camera');compare(selected[0],state);
  tickMcmSceneRenderer(actor.address,memory,{
   clip(camera,near,far){assert.equal(camera,initial.camera);setMcmCameraClip(state.renderCamera,near,far);},
   matrices(camera){assert.equal(camera,initial.camera);const m=composeMcmCameraMatrices(state.renderCamera);state.matrices=Float32Array.from([...m.projection,...m.view,...m.combined,...m.screen,m.screenScale]);},
   submit(device,kind,matrix){assert.deepEqual({device,kind,matrix},selected[1].submit,'Renderer submission arguments differ');compare(selected[1],state);assert.ok(Number.isInteger(selected[2].result),'Missing renderer result');return selected[2].result;},
   error(){throw Error('Original renderer reported an error');}
  });
  compare(selected[2],state);consumed+=3;reports.push({frame,camera:initial.camera,comparedWords:201,result:selected[2].result});
 },finish(){assert.equal(consumed,rows.length,'Unconsumed renderer observations');return{frames:reports.length,words:reports.length*201,deviceResultsExternal:true};}};
}
