import assert from 'node:assert/strict';
import {beginMcmScene,finishMcmScene} from '../../src/physics/mcm/scene-tick.js';
import {advanceMcmSceneOwner} from '../../src/physics/mcm/scene-owner-frame.js';
const bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0];
export function connectWorldSceneTick(runtime,chase,files,frameCount){
 assert.ok(chase,'Scene update requires retained camera');
 const initial=JSON.parse(files['world-scene-tick-initial.json']),scene=runtime.world.tree.nodes.get(initial.scene);
 assert.equal(initial.phase,'world-entry');assert.equal(initial.frame,0);assert.equal(initial.deltaBits,runtime.world.entry.dtBits);
 assert.equal(scene?.update,0x481310);assert.equal(scene, runtime.world.tree.nodes.get(runtime.world.entry.actor).parent);
 assert.equal(scene.stateBytes?.length,0x78);assert.equal(initial.app,runtime.world.entry.world);assert.equal(initial.camera,chase.address);
 const blocks=new Map(initial.blocks.map(b=>[b.address,Buffer.from(b.hex,'hex')]));assert.ok(blocks.get(scene.address).equals(scene.stateBytes));blocks.set(scene.address,scene.stateBytes);
 const app=Buffer.from(runtime.world.entry.worldHex,'hex');
 for(const [o,v]of [[0x10,initial.input],[0x614,initial.menu],[0x618,initial.control]])assert.equal(app.readUInt32LE(o),v);
 const rows=files['world-scene-tick-observations.jsonl'].trim().split('\n').filter(Boolean).map(JSON.parse),reports=[];
 assert.equal(blocks.get(initial.owner).length,0x44,'Missing initial frame-owner counter');
 let consumed=0,comparedWords=0,heads=0,tails=0,positions=0,inputQueries=0,ownerFrames=0,activeFrame=-1,delta=0,selected=[],cursor=0;
 const location=p=>{for(const[address,b]of blocks)if(p>=address&&p+4<=address+b.length)return[b,p-address];throw Error('Uncaptured scene update pointer '+p.toString(16));};
 const u32=p=>{
  if(p===0x4e4fb4)return initial.app;
  if(p>=initial.app&&p+4<=initial.app+app.length)return app.readUInt32LE(p-initial.app);
  if(p===initial.control+0x38)return initial.timerPaused;
  if(p===initial.switchCamera+0x1cc)return initial.switchTarget;
  const bike=runtime.bikes.get(initial.switchTarget);
  if(bike&&(p===initial.switchTarget+0x618||p===initial.switchTarget+0x4bc))return bike.projection.projectBody().getUint32(p-initial.switchTarget,true);
  if(p>=initial.camera+0x144&&p<=initial.camera+0x14c&&(p-initial.camera)%4===0)return bits(chase.position[(p-initial.camera-0x144)/4]);
  const[b,o]=location(p);return b.readUInt32LE(o);
 };
 const memory={u32,f32:p=>new Float32Array(Uint32Array.of(u32(p)).buffer)[0],put32:(p,v)=>{const[b,o]=location(p);b.writeUInt32LE(v>>>0,o);},putFloat:(p,v)=>{const[b,o]=location(p);b.writeFloatLE(v,o);}};
 const compare=row=>{
  assert.equal(row.scene,scene.address);assert.equal(row.deltaBits,bits(delta));
  for(const k of ['app','input','menu','control','timerPaused','owner','camera','environment','shape','switchCamera','switchTarget'])assert.equal(row[k],initial[k],'Unrecovered scene context changed: '+k);
  if(initial.switchTarget)for(const [k,o]of [['switchTargetAi',0x618],['switchTargetEnabled',0x4bc]]){assert.equal(row[k],u32(initial.switchTarget+o),'Retained scene switch target differs');comparedWords++;}
  for(const raw of row.blocks){
   const expected=Buffer.from(raw.hex,'hex');
   if(raw.address===initial.camera){for(let i=0;i<3;i++){assert.equal(expected.readUInt32LE(0x144+i*4),u32(initial.camera+0x144+i*4),'Retained scene camera position differs');comparedWords++;}continue;}
   const actual=blocks.get(raw.address);assert.ok(actual);assert.ok(actual.equals(expected),'Retained scene update bytes differ');comparedWords+=actual.length/4;
  }
 };
 const observe=phase=>{const row=selected[cursor++];assert.equal(row?.phase,phase,'Missing/reordered scene boundary');compare(row);consumed++;return row;};
 const unsupported=()=>{throw Error('Scene camera switching is not connected to retained camera state');};
 return {reports,begin(frame,dt){
  assert.equal(frame,activeFrame+1);activeFrame=frame;delta=dt;selected=rows.filter(r=>r.frame===frame);cursor=0;
  if(frame===0)return; // Atomic world entry is already inside the child walk.
  observe('entry');
  beginMcmScene(scene.address,dt,memory,{
   queryInput:(device,key,flag)=>{assert.equal(device,initial.input);assert.equal(key,10);assert.equal(flag,0);inputQueries++;const row=observe(memory.u32(scene.address+0x54)?'input-on':'input-off');return row.result;},
   cameraVirtual:unsupported,selectCamera:unsupported,copyCamera:unsupported,
   positionEnvironment:(shape,position,rotation,scale)=>{
    assert.equal(shape,initial.shape);assert.equal(rotation,0);assert.equal(scale,0);
    // 4400c0 with null rotation/scale copies exactly the three position words.
    position.forEach((v,i)=>memory.putFloat(shape+0x18+i*4,v));positions++;
   }
  });
  observe('before-children');heads++;
 },finish(frame){
  assert.equal(frame,activeFrame);
  if(cursor===selected.length){assert.equal(frame,frameCount-1,'Incomplete interior scene update');return;}
  observe('after-children');const result=finishMcmScene(scene.address,delta,memory);assert.equal(result,1);
  observe(memory.u32(initial.app+0x614)?'menu-exit':'timer-exit');tails++;
  reports.push({frame,minutes:memory.f32(scene.address+0x68),seconds:memory.f32(scene.address+0x6c)});
 },endFrame(frame){
  assert.equal(frame,activeFrame);
  if(frame===frameCount-1){assert.equal(cursor,selected.length,'Unexpected complete final frame');return;}
  const before=observe('owner-entry');assert.equal(before.result,0x467fd8,'Unexpected frame-owner caller');
  const owner=blocks.get(initial.owner),result=advanceMcmSceneOwner(new DataView(owner.buffer,owner.byteOffset,owner.length));
  const after=observe('owner-exit');assert.equal(after.result,result);assert.equal(cursor,selected.length,'Unconsumed scene boundary');ownerFrames++;
 },report(){assert.equal(consumed,rows.length);assert.equal(activeFrame,frameCount-1);return {heads,tails,inputQueries,positions,ownerFrames,comparedWords,reports,scope:'Retained 481310 prefix/timer tail surround computed child traversal; 494820 advances the owner after drawing. Input-device return remains external; changed menu/timer context and camera-switch service requests fail explicitly. First snapshot starts inside children; final snapshot ends inside children.'};}};
}
