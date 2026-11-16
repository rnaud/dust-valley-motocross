import {buildMcmSceneLabelQuad} from '../../src/physics/mcm/scene-label-quad.js';
import {projectMcmCameraPoint} from '../../src/physics/mcm/camera-point.js';
import {mcmFtolLowWord} from '../../src/physics/mcm/x87-integer.js';
import {updateMcmSceneVisibility} from '../../src/physics/mcm/scene-visibility.js';
import {queryMcmTerrainSegment} from '../../src/physics/mcm/terrain-segment.js';
import {traverseMcmTerrainSegment} from '../../src/physics/mcm/terrain-segment-traversal.js';
import {tickMcmSceneFade} from '../../src/physics/mcm/scene-fade-tick.js';
import assert from 'node:assert/strict';
import {tickMcmSceneDisplay} from '../../src/physics/mcm/scene-display-tick.js';
// Retains timer and scene visibility. Graphics refresh is an explicit service
// boundary, never a claim that GDI/pixel work has been reproduced.
export function connectWorldSceneDisplay(runtime,chase,{refresh,fade=false,visibility=false,terrain}={}) {
 const actors=[...runtime.world.tree.nodes.values()].filter(n=>n.update===0x423b50);
 assert.equal(actors.length,1,'Missing display actor');const actor=actors[0],initial=actor.displayInitial;
 assert.ok(initial,'Missing display initialization');assert.equal(actor.stateBytes?.length,0x290);
 assert.equal(initial.actor.address,actor.address);assert.equal(initial.actor.hex,actor.stateBytes.toString('hex'));
 assert.ok(chase&&runtime.meshes,'Display requires retained camera and meshes');
 assert.equal(initial.owner,runtime.world.entry.actor);assert.equal(initial.selectedBike,runtime.world.entry.bikes[0]);
 assert.equal(initial.camera,chase.address);assert.equal(initial.cameraTarget,chase.target);
 assert.equal(initial.app,runtime.world.entry.world);
 const app=Buffer.from(runtime.world.entry.worldHex,'hex');
 assert.equal(initial.refreshEnabled,app.readUInt32LE(0x6f4));assert.equal(initial.mode,app.readUInt16LE(0x1072));
 assert.equal(initial.globals.length,5);const globals=Buffer.alloc(20);initial.globals.forEach((v,i)=>globals.writeUInt32LE(v,i*4));
 const displays=new Map(),roots=new Map();
 for(const row of initial.visibility){
  assert.equal(row.showMethod,0x420530);assert.equal(row.hideMethod,0x420540);
  const bike=runtime.bikes.get(row.bike);assert.ok(bike,'Display references unknown bike');
  assert.equal(bike.projection.projectBody().getUint32(0x434,true),row.root);
  const mesh=runtime.meshes.actors.get(row.bike);assert.equal(mesh?.node.address,row.root);
  assert.equal(mesh.mesh.hidden,row.rootFlag);roots.set(row.root,()=>mesh.mesh.hidden);
  const node=runtime.world.tree.nodes.get(row.display.address),captured=Buffer.from(row.display.hex,'hex');
  const bytes=fade?node?.stateBytes:captured;
  if(fade){assert.equal(node?.update,0x422df0);assert.equal(bytes?.length,0x11c,'Missing full fade initialization');assert.ok(bytes.equals(captured),'Fade checkpoint differs');}
  assert.ok(node,'Missing display visibility actor');assert.ok(bytes.length===0x30||bytes.length===0x11c);assert.equal(node.enabled,bytes.readUInt32LE(0x20));
  assert.equal(node.parent,actor);assert.ok(!displays.has(node.address));
  displays.set(node.address,{node,bytes});
 }
 assert.equal(displays.size,actor.stateBytes.readUInt32LE(0x260));
 const u32=p=>{
  if(p>=actor.address&&p+4<=actor.address+0x290)return actor.stateBytes.readUInt32LE(p-actor.address);
  if(p>=0x4e2ee8&&p+4<=0x4e2efc)return globals.readUInt32LE(p-0x4e2ee8);
  if(p===0x4e4fb4)return initial.app;if(p===initial.app+0x6f4)return initial.refreshEnabled;
  if(p===initial.owner+0x30)return runtime.world.entry.bikes[0];if(p===initial.camera+0x1ec)return chase.target;
  for(const [a,b]of runtime.bikes)if(p===a+0x434)return b.projection.projectBody().getUint32(0x434,true);
  if(roots.has(p-0x12c))return roots.get(p-0x12c)();
  throw Error('Missing retained display word '+p.toString(16));
 };
 const put32=(p,v)=>{if(p>=actor.address&&p+4<=actor.address+0x290)actor.stateBytes.writeUInt32LE(v>>>0,p-actor.address);else if(p>=0x4e2ee8&&p+4<=0x4e2efc)globals.writeUInt32LE(v>>>0,p-0x4e2ee8);else throw Error('Unknown display write');};
 const memory={u32,put32,f32:p=>new Float32Array(Uint32Array.of(u32(p)).buffer)[0],putFloat:(p,v)=>put32(p,new Uint32Array(Float32Array.of(v).buffer)[0])};
 let ticks=0,refreshCalls=0,fadeTicks=0,visibilityDraws=0,visibilityQueries=0;
 return {address:actor.address,fade,get visibilityDraws(){return visibilityDraws;},get visibilityQueries(){return visibilityQueries;},drawVisibility(bike,position){
  assert.ok(fade&&visibility,'Unconnected draw visibility');visibilityDraws++;
  const seed=initial.visibility.find(r=>r.bike===bike);assert.ok(seed,'Unknown display bike');
  const bytes=displays.get(seed.display.address).bytes,view=new DataView(bytes.buffer,bytes.byteOffset,bytes.length);
  const target=Array.from(position,Math.fround);target[1]=Math.fround(target[1]+Math.fround(1.62));
  const occluded=updateMcmSceneVisibility(view,()=>{visibilityQueries++;return queryMcmTerrainSegment(terrain,chase.position,target,[0,0,0],0,traverseMcmTerrainSegment);});
  if(view.getUint32(0xe4,true)){
   const projected=projectMcmCameraPoint(chase.projection,target,chase.viewport[2],chase.viewport[3]);
   if(projected.visible){
    const x=mcmFtolLowWord(projected.screen[0]),y=mcmFtolLowWord(projected.screen[1]);
    for(const [o,v]of [[0xc0,x],[0xc4,y],[0xc8,x+view.getInt32(0xf0,true)],[0xcc,y+view.getInt32(0xf4,true)]])view.setInt32(o,v,true);
    const surface=initial.surfaces.find(s=>s.address===view.getUint32(0x30,true));assert.ok(surface,'Missing label texture metadata');const texture=Buffer.from(surface.hex,'hex');
    buildMcmSceneLabelQuad(view,{viewport:chase.viewport,textureWidth:texture.readInt32LE(0x38),textureHeight:texture.readInt32LE(0x3c)});
   }
  }
  return occluded;
 },get fadeTicks(){return fadeTicks;},stepFade(node,delta){assert.ok(fade&&displays.has(node.address),'Unconnected fade actor');const bytes=displays.get(node.address).bytes;fadeTicks++;return tickMcmSceneFade(new DataView(bytes.buffer,bytes.byteOffset,bytes.length),delta);},get ticks(){return ticks;},get refreshCalls(){return refreshCalls;},step(delta,children){
  const result=tickMcmSceneDisplay(actor.address,delta,memory,{children,refresh(address){assert.equal(address,actor.address);assert.equal(typeof refresh,'function','Unconnected display graphics refresh');refreshCalls++;refresh(address);},
   visibility(address,method){const state=displays.get(address);assert.ok(state,'Uncaptured display visibility target');const value=method===0x10?0:method===0x14?1:null;assert.notEqual(value,null);state.node.enabled=value;state.bytes.writeUInt32LE(value,0x20);state.bytes.writeUInt32LE(value,0x24);if(state.node.stateBytes){state.node.stateBytes.writeUInt32LE(value,0x20);state.node.stateBytes.writeUInt32LE(value,0x24);}}
  });ticks++;return result;
 },compare(row){
  assert.ok(row,'Missing display assertion');
  for(const key of ['app','refreshEnabled','mode','owner','selectedBike','camera','cameraTarget'])assert.equal(row[key],initial[key],'Unrecovered display context changed: '+key);
  assert.deepEqual(row.surfaces,initial.surfaces,'External display surface metadata changed');
  assert.equal(row.actor.address,actor.address);const differences=[];let words=0;
  const compare=(name,actual,hex)=>{const expected=Buffer.from(hex,'hex');assert.equal(actual.length,expected.length);for(let i=0;i<actual.length;i+=4){words++;const a=actual.readUInt32LE(i),e=expected.readUInt32LE(i);if(a!==e)differences.push({name,offset:i,actual:a,expected:e});}};
  compare('actor',actor.stateBytes,row.actor.hex);assert.equal(row.globals.length,5);const g=Buffer.alloc(20);row.globals.forEach((v,i)=>g.writeUInt32LE(v,i*4));compare('globals',globals,g.toString('hex'));
  assert.equal(row.visibility.length,displays.size);
  for(let i=0;i<row.visibility.length;i++){const r=row.visibility[i],seed=initial.visibility[i];for(const k of ['bike','root','showMethod','hideMethod'])assert.equal(r[k],seed[k]);assert.equal(r.display.address,seed.display.address);assert.equal(r.rootFlag,roots.get(r.root)(),'Retained mesh visibility differs');compare('visibility',displays.get(r.display.address).bytes,r.display.hex);}
  return {words,differences};
 }};
}
