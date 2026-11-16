import {prepareLiveParticleDraw,cullLiveParticleDraw} from './live-particle-draw.mjs';
import assert from 'node:assert/strict';
import {loadLiveFrameBootstrap} from './live-frame-bootstrap.mjs';
import {compareFrameRiderVisuals,compareFrameVisuals} from './compare-live-frame-rider-visuals.mjs';
import {createCapturedFrameRuntime} from './captured-frame-runtime.mjs';
import {advanceMcmRetainedFrame} from '../../src/physics/mcm/retained-frame.js';
import {bitsFloat,floatBits} from '../../src/physics/mcm/math.js';
import {connectLiveMeshDraw} from './live-mesh-draw.mjs';

// Diagnostic, not a whole-world parity verdict. Initialize once, retain all
// computed state, and report external visual writes rather than importing them.
export function analyzeAiFrameSequence(inputs,rows,riderEvents,{diagnosticBody=false,observe}={}){
 const observations=rows.filter(r=>r.phase!=='random'),first=observations[0];
 assert.ok(observations.length>=8&&observations.length%4===0,'Expected consecutive complete AI frames');
 const phases=['before-update','after-ai-controller','after-ai-steering','after-update'];
 observations.forEach((r,i)=>{assert.equal(r.phase,phases[i%4]);assert.equal(r.bike,first.bike);});
 if(riderEvents){
  assert.equal(riderEvents[0]?.phase,'initial-rider');assert.equal(riderEvents[0].completedBikeFrames,0);assert.equal(riderEvents[0].riderHex,first.riderHex);
  riderEvents.forEach((e,i)=>{assert.equal(e.captureId,inputs.checkpoint.captureId);assert.equal(e.eventSequence,i);});
 }
 const runtime=riderEvents?createCapturedFrameRuntime(inputs,first,riderEvents[0]):null;
 const loaded=runtime?.loaded??loadLiveFrameBootstrap({...inputs,row:first}),c=loaded.context;
 const meshDraw=inputs.draws?connectLiveMeshDraw(runtime,first):null;let drawIndex=0;
 let riderTicks=0,riderBytes=0,eventIndex=1;
 const computeParticleProjection=!!riderEvents?.some(e=>e.projectionMatricesHex!==undefined);
 const particleDifferences=[],worldQueries=[],poolReports=[],dustReports=[],sprayReports=[],particleDrawReports=[];
 const comparePool=(event,frame,stage)=>{
  const start=particleDifferences.length;let words=0;
  assert.equal(event.poolAddress,riderEvents[0].poolAddress,'Shared pool identity');
  assert.equal(event.particleStride,72);assert.equal(event.particleOrder,'initial-allocation-order');
  for(const [name,actual,hex]of [['pool',runtime.external.poolBytes,event.poolHex],['particles',runtime.external.particleBytes,event.particlesHex]]){
   const expected=Buffer.from(hex,'hex');assert.equal(actual.length,expected.length);
   for(let o=0;o<expected.length;o+=4){words++;const a=actual.readUInt32LE(o),b=expected.readUInt32LE(o);if(a!==b)particleDifferences.push({frame,stage,name,offset:o,actual:a,expected:b});}
  }
  return {words,differences:particleDifferences.length-start};
 };
 const bodyDifferences=[];
 const sceneReports=[];let pendingScene=null;
 const visualDifferences=[],intervals=[],substeps=[];let bodyBoundaries=0,bodyBytes=0;
 const visualCompare=(frame,stage)=>(name,before,after,bytes)=>{
  const expected=Buffer.from(after,'hex');assert.equal(bytes.length,expected.length);
  for(let o=0;o<expected.length;o+=4)if(bytes.readUInt32LE(o)!==expected.readUInt32LE(o))visualDifferences.push({frame,stage,name,offset:o,actual:bytes.readUInt32LE(o),expected:expected.readUInt32LE(o)});
 };
 const compare=(row,frame,stage)=>{
  const actual=c.aiController.projectBody(),expected=Buffer.from(row.stateHex,'hex');
  assert.equal(actual.byteLength,expected.length);
  for(let o=0;o<expected.length;o+=4){
   const a=actual.getUint32(o,true),b=expected.readUInt32LE(o);
   if(diagnosticBody){if(a!==b)bodyDifferences.push({frame,stage,offset:o,actual:a,expected:b});}
   else assert.equal(a,b,`AI sequence frame ${frame} ${stage} body ${o.toString(16)}`);
  }
  assert.equal(loaded.random.state,row.randomState,`AI sequence frame ${frame} ${stage} RNG`);
  bodyBoundaries++;bodyBytes+=expected.length;
  // The original first snapshot supplies immutable allocation bytes throughout;
  // later native rows are comparison targets only, never serialization seeds.
  compareFrameRiderVisuals(loaded,first,row,visualCompare(frame,stage));
 };
 const compareRider=(e,frame,stage)=>{
  const {external}=runtime,r=external.context.rider,bytes=Buffer.from(riderEvents[0].riderHex,'hex');
  for(const [o,values]of [[0x40,r.position],[0x4c,r.previousPosition],[0x58,r.velocity],[0x64,r.angular],[0x70,r.alternateVelocity],[0x7c,r.alternateAngular],[0xa0,r.center],[0xac,r.extents],[0xb8,r.matrix]])values.forEach((v,i)=>bytes.writeUInt32LE(floatBits(v),o+i*4));
  for(const [o,v]of [[0x138,r.field138],[0x13c,r.flag13c],[0x140,r.field140],[0x144,r.field144],[0x148,r.field148],[0x14c,r.field14c],[0x39c,r.field39c],[0x154,r.field154],[0x16c,c.rider.active16c],[0x170,c.rider.kind],[0x3a4,r.region]])bytes.writeUInt32LE(v>>>0,o);
  c.rider.selected.forEach((v,i)=>bytes.writeUInt32LE(v>>>0,0x160+i*4));bytes.writeFloatLE(r.fieldf8,0xf8);
  for(const [name,actual,hex]of [['rider',bytes,e.riderHex],['child',external.childBytes,e.hex],['pool',external.poolBytes,e.poolHex],['particles',external.particleBytes,e.particlesHex]]){
   const expected=Buffer.from(hex,'hex');assert.equal(actual.length,expected.length);
   for(let o=0;o<expected.length;o+=4){const a=actual.readUInt32LE(o),b=expected.readUInt32LE(o);
    if(name==='rider'||name==='child')assert.equal(a,b,`AI ${stage} ${name} ${o.toString(16)}`);
    else if(a!==b)particleDifferences.push({frame,stage,name,offset:o,actual:a,expected:b});
   }
   if(name==='rider'||name==='child')riderBytes+=expected.length;
  }
  compareFrameVisuals(loaded,first,e,visualCompare(frame,stage));
 };
 for(let frame=0;frame<observations.length/4;frame++){
  const group=observations.slice(frame*4,frame*4+4),entry=group[0];
  group.forEach(r=>assert.equal(r.frameBits,entry.frameBits));
  compare(entry,frame,'entry');intervals.push(bitsFloat(entry.frameBits));
  let boundary=1;
  const result=advanceMcmRetainedFrame(c,{delta:intervals.at(-1),mode:loaded.mode,input:loaded.input},stage=>{
   observe?.({frame,stage,context:c});
   if(!['ai-controller','steering','frame-tail'].includes(stage))return;
   assert.equal(stage,['ai-controller','steering','frame-tail'][boundary-1]);compare(group[boundary++],frame,stage);
  });
  assert.equal(result.status,'returned');assert.equal(boundary,4);substeps.push(result.substeps);
  if(riderEvents){
   let ticks=0;
   const drainDraws=()=>{
    while(inputs.draws?.[drawIndex]?.eventSequence===eventIndex){
     const draw=inputs.draws[drawIndex++];assert.equal(draw.captureId,inputs.checkpoint.captureId);assert.equal(draw.completedBikeFrames,frame+1);
     if(draw.phase==='before-draw')meshDraw.entry(draw);
     else{assert.equal(draw.phase,'after-draw');meshDraw.exit(draw);}
    }
   };
   while(riderEvents[eventIndex]?.completedBikeFrames===frame+1){
    drainDraws();
    const before=riderEvents[eventIndex++];
    if(before.phase==='before-particle-draw'){
     const projected=riderEvents[eventIndex++],after=riderEvents[eventIndex++];
     assert.equal(projected?.phase,'before-particle-cull','Missing particle projection');assert.equal(after?.phase,'after-particle-cull','Missing particle cull return');
     for(const e of [before,projected,after]){assert.equal(e.completedBikeFrames,frame+1);assert.equal(e.bikeActive,0);assert.equal(e.riderActive,0);assert.equal(e.poolAddress,before.poolAddress);}
     for(const key of ['camera','scaleBits','width','height','inputAddress','projectedAddress','yOffsetBits']){assert.equal(projected[key],before[key],`Particle draw ${key}`);assert.equal(after[key],before[key],`Particle draw return ${key}`);}
     if(computeParticleProjection)for(const e of [before,projected,after])assert.equal(typeof e.projectionMatricesHex,'string','Missing particle device matrices');
     const entry=comparePool(before,frame,'before-particle-draw');
     const input=prepareLiveParticleDraw(runtime.external,before);assert.equal(input.toString('hex'),projected.inputHex,'Retained particle draw positions');
     const prepared=comparePool(projected,frame,'before-particle-cull');
     const accepted=cullLiveParticleDraw(runtime.external,projected,input);
     assert.equal(after.projectedHex,projected.projectedHex,'Particle cull changed projection');assert.equal(after.inputHex,projected.inputHex,'Particle cull changed input');
     const exit=comparePool(after,frame,'after-particle-cull');particleDrawReports.push({frame,accepted,projectionMode:projected.projectionMatricesHex===undefined?'observed':'computed-from-device-matrices',entry,prepared,exit});continue;
    }
    if(before.phase==='before-dust'){
     const after=riderEvents[eventIndex++];assert.equal(after?.phase,'after-dust','Missing dust return');
     const emitter=c.frameEffects.emitters[0];
     for(const e of [before,after]){assert.equal(e.completedBikeFrames,frame+1);assert.equal(e.bikeActive,0);assert.equal(e.riderActive,0);assert.equal(e.emitter,emitter.address);}
     assert.equal(after.dtBits,before.dtBits);assert.equal(after.paused,before.paused);
     assert.equal(emitter.bytes.toString('hex'),before.emitterHex,'Retained dust entry');
     const entry=comparePool(before,frame,'before-dust'),count=runtime.external.pool.count;
     runtime.stepDust({delta:bitsFloat(before.dtBits),paused:before.paused});
     assert.equal(emitter.bytes.toString('hex'),after.emitterHex,'Retained dust return');
     const exit=comparePool(after,frame,'after-dust');
     dustReports.push({frame,dtBits:before.dtBits,emitted:runtime.external.pool.count-count,entry,exit});continue;
    }
    if(before.phase==='before-spray'){
     const after=riderEvents[eventIndex++];assert.equal(after?.phase,'after-spray','Missing spray return');
     const emitter=c.frameEffects.emitters[1];
     for(const e of [before,after]){assert.equal(e.completedBikeFrames,frame+1);assert.equal(e.bikeActive,0);assert.equal(e.riderActive,0);assert.equal(e.emitter,emitter.address);}
     assert.equal(after.dtBits,before.dtBits);assert.equal(after.paused,before.paused);
     assert.equal(runtime.sprayState().toString('hex'),before.emitterHex,'Retained spray entry');
     const entry=comparePool(before,frame,'before-spray'),count=runtime.external.pool.count;
     runtime.stepSpray({delta:bitsFloat(before.dtBits),paused:before.paused});
     assert.equal(runtime.sprayState().toString('hex'),after.emitterHex,'Retained spray return');
     const exit=comparePool(after,frame,'after-spray');
     sprayReports.push({frame,dtBits:before.dtBits,emitted:runtime.external.pool.count-count,entry,exit});continue;
    }
    if(before.phase==='before-pool'){
     const after=riderEvents[eventIndex++];assert.equal(after?.phase,'after-pool','Missing pool return');
     for(const e of [before,after]){assert.equal(e.completedBikeFrames,frame+1);assert.equal(e.bikeActive,0);assert.equal(e.riderActive,0);}
     assert.equal(after.dtBits,before.dtBits);assert.equal(after.paused,before.paused);
     const entry=comparePool(before,frame,'before-pool');
     runtime.stepPool({delta:bitsFloat(before.dtBits),paused:before.paused});
     const exit=comparePool(after,frame,'after-pool');
     poolReports.push({frame,dtBits:before.dtBits,paused:before.paused,entry,exit});continue;
    }
    if(before.phase==='scene-entry'){
     assert.ok(runtime.scenePosition,'Missing initial scene inputs');assert.equal(pendingScene,null,'Overlapping scene queries');
     const {address,state}=runtime.scenePosition;
     assert.equal(before.address,address);assert.equal(before.bike,inputs.checkpoint.bikeAddress);assert.equal(before.bikeActive,0);assert.equal(before.riderActive,0);
     assert.equal(before.enabled,state.enabled,'Scene enabled gate');assert.equal(before.disabled,state.disabled,'Scene disabled gate');assert.equal(before.excluded,state.bike.fieldc30,'Scene bike gate');
     const result=runtime.scenePosition.query();
     if(result.position)pendingScene={...result,observedNodes:[],frame};
     else sceneReports.push({frame,queried:false});
     continue;
    }
    if(before.phase==='scene-position'){
     assert.ok(pendingScene,'Unexpected scene position');assert.equal(before.address,runtime.scenePosition.address);
     assert.equal(before.bikeActive,0);assert.equal(before.riderActive,0);
     assert.deepEqual(before.positionBits,Array.from(pendingScene.position,floatBits),'Scene world position');
     assert.deepEqual(pendingScene.observedNodes,pendingScene.nodes,`Scene resolver call chain at frame ${frame}`);
     sceneReports.push({frame,queried:true,nodes:pendingScene.nodes,positionBits:before.positionBits});pendingScene=null;continue;
    }
    // Query targets/callers are evidence only; they do not select model writes.
    if(before.phase==='world-query'){
     worldQueries.push(before);
     if(pendingScene){const first=pendingScene.observedNodes.length===0;assert.equal(before.caller,first?0x4b797f:0x4b6956);if(first)assert.equal(before.positionCaller,0x422fad);pendingScene.observedNodes.push(before.node);}
     else meshDraw?.query(before);
     continue;
    }
    const after=riderEvents[eventIndex++];
    assert.equal(before.phase,'before-rider');assert.equal(after?.phase,'after-rider');
    for(const e of [before,after]){assert.equal(e.completedBikeFrames,frame+1);assert.equal(e.bikeActive,0);assert.equal(e.bike,inputs.checkpoint.bikeAddress);assert.equal(e.rider,riderEvents[0].rider);assert.equal(e.address,riderEvents[0].address);assert.equal(e.ownerGate,0);assert.equal(e.updateAddress,0x43a0c0);}
    assert.equal(after.dtBits,before.dtBits);assert.equal(after.paused,before.paused);
    compareRider(before,frame,'before-rider');
    runtime.stepRider({delta:bitsFloat(before.dtBits),paused:before.paused});
    compareRider(after,frame,'after-rider');assert.equal(floatBits(runtime.external.context.globalDelta),after.globalDtBits);
    riderTicks++;ticks++;
   }
   drainDraws();
   if(frame<observations.length/4-1)assert.equal(ticks,1,'Missing separate rider tick');
  }
 }
 if(riderEvents)assert.equal(eventIndex,riderEvents.length,'Unconsumed rider events');
 assert.equal(pendingScene,null,'Incomplete scene query');
 if(meshDraw){meshDraw.complete();assert.equal(drawIndex,inputs.draws.length,'Unconsumed draws');}
 return {frames:intervals.length,intervals,substeps,bodyBoundaries,bodyBytes,randomDraws:loaded.random.calls,visualDifferences,...(meshDraw?{drawReports:meshDraw.reports,drawNodeWords:meshDraw.nodeWords}:{}),...(poolReports.length?{poolReports}:{}),...(dustReports.length?{dustReports}:{}),...(sprayReports.length?{sprayReports}:{}),...(particleDrawReports.length?{particleDrawReports}:{}),...(diagnosticBody?{diagnosticBody:true,bodyDifferences}:{}),...(riderEvents?{riderTicks,riderBytes,particleDifferences,worldQueries,...(runtime.scenePosition?{sceneReports}:{})}:{})};
}
