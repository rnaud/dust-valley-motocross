import {connectWorldChaseRuntime} from './world-chase-runtime.mjs';
import {connectWorldSceneChildren} from './world-scene-children.mjs';
import {connectWorldHudRuntime} from './world-hud-runtime.mjs';
import {connectWorldMarkerRuntime} from './world-marker-runtime.mjs';
import {tickMcmParticlePool} from '../../src/physics/mcm/particle-pool-tick.js';
import {prepareLiveParticleDraw,cullLiveParticleDraw,generateLiveParticleQuads} from './live-particle-draw.mjs';
import {connectWorldEmitterRuntime} from './world-emitter-runtime.mjs';
import {connectWorldChildRuntime} from './world-child-runtime.mjs';
import {connectWorldActorRuntime} from './world-actor-runtime.mjs';
import {decodeWorldFrames} from './world-observation-codec.mjs';
import {validateWorldInputProtocol,worldThrottleAtFrame} from './world-input-protocol.mjs';
import fs from 'node:fs';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {compareFrameRiderVisuals,compareFrameVisuals} from './compare-live-frame-rider-visuals.mjs';
import {compareWorldRider} from './world-rider-comparison.mjs';
import {createLiveRiderCollisionComparison} from './live-rider-collision-comparison.mjs';
import {createWorldBikeRuntime} from './world-bike-runtime.mjs';
// Diagnostic of the combined retained physics/rider path. Missing world/render
// work remains visible as full-body differences; no output is copied back.
export function analyzeWorldBikes(files,terrain,{renderCameraInputs=false,particleIntegration=false,markerIntegration=false,hudIntegration=false,sceneChildIntegration=false,chaseIntegration=false}={}){
 const initial=Object.fromEntries(Object.entries(files).filter(([name])=>name.startsWith('world-')&&name!=='world-animation-observations.json'&&(name.endsWith('.json')||/^world-mesh-[0-9]+\.jsonl$/.test(name))));
 const inputProtocol=validateWorldInputProtocol(files),contactReports=[];
 const runtime=createWorldBikeRuntime(initial,terrain,{throttle:0,brake:0});
 if(chaseIntegration&&(!sceneChildIntegration||!renderCameraInputs))throw Error('Chase integration requires scene scheduling and draw replay');
 const chase=chaseIntegration?connectWorldChaseRuntime(runtime,files,terrain):null;
 const emitters=particleIntegration?connectWorldEmitterRuntime(runtime):null,particleReports=[],impactReports=[];
 const particleRows=particleIntegration?(files['particle-observations.jsonl']??'').trim().split('\n').filter(Boolean).map(JSON.parse):[];
 if(particleIntegration&&!particleRows.length)throw Error('Particle integration requires original assertion boundaries');
 const compareParticle=(row,emitterBytes)=>{
    let words=0,differences=0;const firstDifferences=[];
    for(const [name,bytes]of [...(emitterBytes?[['emitterHex',emitterBytes]]:[]),['poolHex',runtime.particles.poolBytes],['particlesHex',runtime.particles.particleBytes]]){
     const expected=Buffer.from(row[name],'hex');if(expected.length!==bytes.length)throw Error('Particle assertion allocation differs');
     const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.length);
     for(let o=0;o<bytes.length;o+=4){words++;const actual=view.getUint32(o,true),value=expected.readUInt32LE(o);if(actual!==value){differences++;if(firstDifferences.length<12)firstDifferences.push({name,offset:o,actual,expected:value});}}
    }
    particleReports.push({frame:row.completedBikeFrames-1,phase:row.phase,address:row.emitter??row.poolAddress,words,differences,firstDifferences});
 };
 const markers=markerIntegration?connectWorldMarkerRuntime(runtime):null,markerReports=[];
 if(markerIntegration&&!markers.markers.size)throw Error('Missing captured marker dependencies');
 const hud=hudIntegration?connectWorldHudRuntime(runtime):null,hudReports=[];
 if(hudIntegration&&!hud.actors.size)throw Error('Missing captured HUD dependencies');
 const schedule=runtime.world.entry.refreshDevice?connectWorldActorRuntime(runtime):null,worldSchedulerReports=[];
 const scheduleChildren=connectWorldChildRuntime(runtime),worldChildReports=[];
 if(sceneChildIntegration&&!particleIntegration)throw Error('Scene pool scheduling requires particle integration');
 const scheduleSceneChildren=sceneChildIntegration?connectWorldSceneChildren(runtime):null,sceneChildReports=[];
 const rows=files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse),reports=[],entryReports=[];
 const addresses=runtime.world.entry.bikes;
 const sceneEvents=files['rider.jsonl'].trim().split('\n').map(JSON.parse).filter(r=>r.phase==='scene-position'),sceneReports=[];
 const draws=renderCameraInputs?(files['world-draws.jsonl']??files['draws.jsonl']).trim().split('\n').map(JSON.parse):[],drawReports=[];
 if(renderCameraInputs&&!runtime.meshes)throw Error('Initial meshes required for render replay');
 const ai=addresses[1],compareCollision=createLiveRiderCollisionComparison(runtime.ordered,ai),collisionReports=[],riderReports=[],visualReports=[];
 const worldRiders=files['world-riders.jsonl']?.trim().split('\n').map(JSON.parse)??[],worldRiderReports=[],worldColliderCompare=new Map(addresses.map(a=>[a,createLiveRiderCollisionComparison(runtime.ordered,a)]));let worldRiderIndex=0;
 const aiFrames=decodeWorldFrames(files).filter(r=>r.phase==='after-update');
 const riderFrames=files['rider.jsonl'].trim().split('\n').map(JSON.parse).filter(r=>r.phase==='after-rider');
 const artifacts=runtime.world.bikes[1].artifacts,initialBlocks=[...artifacts.bike.blocks,...artifacts.collision.blocks,...artifacts.animations.blocks];
 const seedState=state=>state.map(({address,size})=>{
  const block=initialBlocks.find(b=>address>=b.address&&address+size<=b.address+b.size);if(!block)throw Error('Missing initial visual allocation');
  return {address,size,hex:Buffer.from(block.hex,'hex').subarray(address-block.address,address-block.address+size).toString('hex')};
 });
 const visualSeed={visualState:seedState(aiFrames[0].visualState),animationState:seedState(aiFrames[0].animationState)};
 const compareVisual=(event,frame,stage,animation)=>{
  const differences=[];let words=0;
  (animation?compareFrameRiderVisuals:compareFrameVisuals)(runtime.bikes.get(ai).loaded,visualSeed,event,(name,before,after,bytes)=>{
   const expected=Buffer.from(after,'hex');for(let o=0;o<bytes.length;o+=4){words++;const a=bytes.readUInt32LE(o),b=expected.readUInt32LE(o);if(a!==b)differences.push({name,offset:'0x'+o.toString(16),actual:a,expected:b});}
  });visualReports.push({frame,stage,words,differences});
 };

 if(rows.length%(addresses.length*2))throw Error('Incomplete world bike capture');
 for(let start=0;start<rows.length;start+=addresses.length*2){
  // Frame elapsed time is an external input, not a simulated output.
  const delta=Buffer.from(rows[start].stackHex,'hex').readFloatLE(0xbfc);
  const frameNumber=start/(addresses.length*2),protocol=runtime.world.entry.inputProtocol;
  const throttle=protocol?worldThrottleAtFrame(protocol,frameNumber):0;runtime.setPlayerInput({throttle});
  if(protocol)for(const row of rows.slice(start,start+addresses.length*2))if(row.playerThrottle!==throttle)throw Error('Captured throttle protocol differs');

  // World entry is already after the first camera update. Later camera calls
  // follow the retained scene links, before physics, rather than row timing.
  let cameraPositionBits=chase&&frameNumber===0?chase.step(0,delta):null;
  const advanceChase=()=>{if(cameraPositionBits)throw Error('Duplicate scene camera update');cameraPositionBits=chase.step(frameNumber,delta);};
  let scheduledBikes=0;
  const advanceBike=address=>{
   const i=scheduledBikes++;if(address!==addresses[i])throw Error('World scheduler bike order differs');
   const before=rows[start+i*2],after=rows[start+i*2+1];
   if(before.phase!=='before-bike'||after.phase!=='after-bike'||before.bike!==address||after.bike!==address)throw Error('Unexpected bike order');
   if(hud){if(!before.hudObservation||!after.hudObservation)throw Error('Missing HUD assertion boundary');hudReports.push({frame:frameNumber,phase:before.phase,bike:address,...hud.compare(before.hudObservation)});}
   if(markers&&(!before.markerObservation||!after.markerObservation))throw Error('Missing direct marker assertion boundary');
   if(markers&&before.markerObservation)markerReports.push({frame:frameNumber,phase:before.phase,bike:address,...markers.compare(before.markerObservation)});
   if(before.frameInput)runtime.setFrameInput(address,before.frameInput);
   if(before.audioCamera){
    const camera=before.audioCamera;
    if(!Number.isInteger(camera.address)||!Array.isArray(camera.positionBits)||camera.positionBits.length!==3||!camera.positionBits.every(v=>Number.isInteger(v)&&v>=0&&v<=0xffffffff))throw Error('Invalid current audio camera');
    const position=Array.from(new Float32Array(Uint32Array.from(camera.positionBits).buffer));
    if(!position.every(Number.isFinite))throw Error('Nonfinite current audio camera');
    if(chase&&(!cameraPositionBits||camera.address!==chase.address||camera.positionBits.some((v,j)=>v!==cameraPositionBits[j])))throw Error('Recovered chase audio camera differs');
    if(i===0)runtime.setFrameCamera(camera.address,chase?Array.from(new Float32Array(Uint32Array.from(cameraPositionBits).buffer)):position);
    else {
     const first=rows[start].audioCamera;
     if(!first||first.address!==camera.address||first.positionBits.some((v,j)=>v!==camera.positionBits[j]))throw Error('Audio camera changed between bike updates');
    }
   }else if(rows[start].audioCamera)throw Error('Missing current audio camera');
   let boundary;
   // 0x4a54b6 precedes scheduling. The prefix restores transforms but does
   // not write bike allocation bytes, so project the body before stepping.
   {
    const actual=runtime.bikes.get(address).projection.projectBody(),expected=Buffer.from(before.bodyHex,'hex'),differences=[];
    for(let offset=0;offset<expected.length;offset+=4){const a=actual.getUint32(offset,true),b=expected.readUInt32LE(offset);if(a!==b)differences.push({offset:'0x'+offset.toString(16),actual:a,expected:b});}
    entryReports.push({frame:start/(addresses.length*2),bike:address,words:expected.length/4,differences,random:{actual:runtime.random.state,expected:before.randomState}});
   }
   const result=runtime.stepBike(address,delta,stage=>{
    if(stage==='frame-tail'){boundary=runtime.bikes.get(address).projection.projectBody();if(address===ai)compareVisual(aiFrames[start/(addresses.length*2)],start/(addresses.length*2),'bike-tail',true);if(address===ai)collisionReports.push({frame:start/(addresses.length*2),stage:'bike-tail',...compareCollision(aiFrames[start/(addresses.length*2)])});}});
   if(!boundary||result.status!=='returned')throw Error('Incomplete bike update');
   const expected=Buffer.from(after.bodyHex,'hex'),differences=[];
   for(let offset=0;offset<expected.length;offset+=4){const actual=boundary.getUint32(offset,true),value=expected.readUInt32LE(offset);if(actual!==value)differences.push({offset:'0x'+offset.toString(16),actual,expected:value});}
   if(hud)hudReports.push({frame:frameNumber,phase:after.phase,bike:address,...hud.compare(after.hudObservation)});
   if(markers&&after.markerObservation)markerReports.push({frame:frameNumber,phase:after.phase,bike:address,...markers.compare(after.markerObservation)});
   reports.push({frame:start/(addresses.length*2),bike:address,delta,substeps:result.substeps,words:expected.length/4,differences,random:{actual:runtime.random.state,expected:after.randomState}});
  }
  const advanceChildren=()=>{
  if(worldRiders.length&&!worldRiders[worldRiderIndex])return;
  const riderOrder=[],externalActors=[],actorUpdates=[];
  scheduleChildren(delta,{actor:(node,dt,children)=>{
   actorUpdates.push({address:node.address,update:node.update});
   if(markers?.step(node,dt,children)||hud?.step(node,dt,children))return;
   if(emitters?.step(node,dt,runtime.world.context.world.paused,(phase,state)=>{
    if(state.update===0x439a30)impactReports.push({frame:frameNumber,address:node.address,phase,active:state.bytes.readUInt32LE(0x64),poolCount:runtime.particles.pool.count});
    const kind=state.update===0x438e10?'dust':state.update===0x4393d0?'spray':'exhaust';
    const row=particleRows.find(r=>r.completedBikeFrames===frameNumber+1&&r.emitter===node.address&&r.phase===`${phase}-${kind}`);
    if(!row)return;
    compareParticle(row,state.bytes);
   }))return;
   externalActors.push({address:node.address,update:node.update,delta:dt});
  },rider:address=>{
   riderOrder.push(address);
   const observeRider=phase=>{
    const row=worldRiders[worldRiderIndex];if(!row)return;
    if(row.phase!==phase||row.bike!==address||row.completedBikeFrames!==start/(addresses.length*2)+1)throw Error('Unexpected world rider order');
    const bits=new Float32Array([delta]);if(new Uint32Array(bits.buffer)[0]!==row.dtBits)throw Error('World rider delta differs');
    if(phase==='before-rider'){
     const raw=Buffer.from(row.hex,'hex'),words=row.boundaryWords??(raw.length===0x618?[raw.readUInt32LE(0x610),raw.readUInt32LE(0x614)]:undefined);
     if(words)runtime.setParticleBoundaryWords(address,words);
    }
    const source=runtime.world.bikes.find(b=>b.address===address);
    worldRiderReports.push({frame:start/(addresses.length*2),bike:address,phase,rider:compareWorldRider(runtime,address,source.artifacts.child,row),collision:worldColliderCompare.get(address)(row)});worldRiderIndex++;
   };
   observeRider('before-rider');runtime.stepRider(address,delta);observeRider('after-rider');
  }});
  worldChildReports.push({frame:frameNumber,riderOrder,externalActors,actorUpdates});
  };
  const advanceWorld=()=>{
  if(schedule){
   const markerRequests=[];
   schedule(delta,{physics:advanceBike,children:advanceChildren,marker:(marker,position)=>{markerRequests.push({address:marker.address,position});markers?.move(marker.address,position);}});
   if(scheduledBikes!==addresses.length)throw Error('World scheduler omitted an observed bike');
   worldSchedulerReports.push({frame:frameNumber,bikes:scheduledBikes,markerRequests});
  }else{for(const address of addresses)advanceBike(address);advanceChildren();}
  };
  // The last native recording can end after the AI bike but before children.
  // Replay that fragment only; do not invent an unobserved partial pool tick.
  const completeScenePhase=!!worldRiders[worldRiderIndex];
  if(scheduleSceneChildren&&completeScenePhase){
   const externalActors=[];let poolCalls=0;
   const poolBoundary=(phase,dt)=>{
    const matches=particleRows.filter(r=>r.completedBikeFrames===frameNumber+1&&r.phase===phase);
    if(matches.length!==1)throw Error('Missing or duplicate scene pool assertion');
    const row=matches[0];
    if(row.dtBits!==new Uint32Array(Float32Array.of(dt).buffer)[0]||row.paused!==runtime.world.context.world.paused)throw Error('Scene pool timing differs');
    compareParticle(row);
   };
   const trace=scheduleSceneChildren(delta,{world:advanceWorld,actor:(node,dt)=>{
    if(chase&&node.address===chase.address){if(frameNumber>0)advanceChase();return;}
    externalActors.push({address:node.address,update:node.update,delta:dt});
   },beforePool:dt=>{poolCalls++;poolBoundary('before-pool',dt);},afterPool:dt=>poolBoundary('after-pool',dt)});
   if(poolCalls!==1)throw Error('Scene did not schedule exactly one observed pool tick');
   sceneChildReports.push({frame:frameNumber,trace,poolCalls,externalActors});
  }else {if(chase&&frameNumber>0)advanceChase();advanceWorld();}
  if(emitters){
   // Recorded presentation invocations remain explicit diagnostic inputs until
   // the outer world/camera scheduler is connected. Pool state is retained.
   let input,quadBefore;
   for(const row of particleRows.filter(r=>r.completedBikeFrames===frameNumber+1)){
    if(scheduleSceneChildren&&completeScenePhase&&['before-pool','after-pool'].includes(row.phase))continue;
    if(row.phase==='after-particle-quads')generateLiveParticleQuads(runtime.particles,quadBefore,row);
    if(row.phase.includes('pool')||row.phase.includes('particle-'))compareParticle(row);
    if(row.phase==='before-pool'){
     if(row.dtBits!==new Uint32Array(Float32Array.of(delta).buffer)[0]||row.paused!==runtime.world.context.world.paused)throw Error('Particle pool timing differs from world');
     tickMcmParticlePool(runtime.particles.pool,{dt:delta,paused:row.paused});
    }else if(row.phase==='before-particle-draw'){
     if(row.inputHex.length/2!==runtime.particles.pool.count*32)throw Error('Retained particle count differs before drawing: '+JSON.stringify({frame:frameNumber,firstDifference:particleReports.find(r=>r.differences),last:particleReports.at(-1)}));
     input=prepareLiveParticleDraw(runtime.particles,row);
    }
    else if(row.phase==='before-particle-cull')cullLiveParticleDraw(runtime.particles,row,input);
    else if(row.phase==='before-particle-quads')quadBefore=row;
   }
  }
  const riderObservation=riderFrames[start/(addresses.length*2)];
  if(riderObservation)compareVisual(riderObservation,start/(addresses.length*2),'after-rider',false);
  if(riderObservation)riderReports.push({frame:start/(addresses.length*2),...compareWorldRider(runtime,ai,runtime.world.bikes[1].artifacts.child,riderObservation)});
  if(riderObservation)collisionReports.push({frame:start/(addresses.length*2),stage:'after-rider',...compareCollision(riderObservation)});
  const frame=start/(addresses.length*2);
  for(const contact of runtime.ordered.contacts.splice(0))contactReports.push({frame,...contact});
  for(const row of draws.filter(r=>r.completedBikeFrames===frame+1)){
   if(row.phase==='before-draw'){
    const projection=chase?.projection??new Float32Array(Uint32Array.from(row.projection).buffer);
    if(chase&&row.projection.some((v,i)=>v!==new Uint32Array(projection.buffer,projection.byteOffset,16)[i]))throw Error('Recovered chase draw projection differs');
    const result=runtime.meshes.draw(row.actor,{projection,viewport:row.viewport,rendererMode:row.rendererMode});
    drawReports.push({frame,actor:row.actor,accepted:result.accepted,queries:result.queries.length});
   }else{
    const state=runtime.meshes.actors.get(row.actor);
    if(state.selection.index!==(row.selection|0)||state.rect.some((v,i)=>v!==(row.rect[i]|0)))throw Error('Computed world draw bounds/detail differ');
   }
  }
  if(renderCameraInputs)for(const event of sceneEvents.filter(e=>e.completedBikeFrames===frame+1)){
   const scene=runtime.bikes.get(event.bike).scenePosition;if(!scene)throw Error('Missing initialized scene position');
   const result=scene.query(),bits=result.position?Array.from(new Uint32Array(Float32Array.from(result.position).buffer)):[0,0,0];
   if(bits.some((v,i)=>v!==event.positionBits[i]))throw Error('Computed scene rider position differs');
   sceneReports.push({frame,bike:event.bike,nodes:result.nodes});
  }
 }
 if(particleIntegration&&particleReports.length!==particleRows.length)throw Error('Unconsumed particle assertion boundaries');
 if(worldRiderIndex!==worldRiders.length)throw Error('Unconsumed world rider observations');
 return {chaseIntegration,chaseReport:chase?.finish(),sceneChildIntegration,sceneChildReports,hudIntegration,hudReports,markerIntegration,markerReports,particleIntegration,particleReports,impactReports,inputProtocol,worldChildReports,worldSchedulerReports,contactReports,sceneReports,worldRiderReports,entryReports,renderCameraInputs,drawReports,collisionReports,riderReports,visualReports,scope:(chaseIntegration?'Camera bike/rider inputs, audio position and mesh projection are derived from retained state; camera world/device context remains external. ':'')+'Retained player/AI bike bodies and shared RNG compared at every boundary; both rider/child and rider collider observations compared when captured; AI visual allocations compared. Camera/world context, draw scheduling and particle boundary words remain explicit external inputs; full collision allocation and autonomous world scheduling coverage remain incomplete',reports};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(process.argv[2])));
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 console.log(JSON.stringify(analyzeWorldBikes(fixture.files,{root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale},{renderCameraInputs:process.argv.includes('--render-camera-inputs'),particleIntegration:process.argv.includes('--particle-integration'),markerIntegration:process.argv.includes('--marker-integration'),hudIntegration:process.argv.includes('--hud-integration'),sceneChildIntegration:process.argv.includes('--scene-child-integration'),chaseIntegration:process.argv.includes('--chase-integration')}),null,2));
}
