import assert from 'node:assert/strict';
import {loadLiveFrameBootstrap} from './live-frame-bootstrap.mjs';
import {compareFrameRiderVisuals} from './compare-live-frame-rider-visuals.mjs';
import {advanceMcmRetainedFrame} from '../../src/physics/mcm/retained-frame.js';
import {bitsFloat,floatBits} from '../../src/physics/mcm/math.js';
// One frame initialized solely at scheduler entry. Intermediate observations
// are assertions; they never refresh model state or select a controller result.
export function analyzeAiFrame(inputs,rows){
 const row=rows.find(r=>r.phase==='before-update'),loaded=loadLiveFrameBootstrap({...inputs,row}),c=loaded.context,bridge=c.aiController,stages=[];let bytes=0,graphRecords=0;
 const compare=(name,before,after,actual)=>{const expected=Buffer.from(after,'hex');assert.equal(actual.length,expected.length,name+' size');for(let o=0;o<expected.length;o+=4)assert.equal(actual.readUInt32LE(o),expected.readUInt32LE(o),`${name} ${o.toString(16)}`);bytes+=expected.length;};
 const phases={'ai-controller':'after-ai-controller',steering:'after-ai-steering','frame-tail':'after-update'};
 const result=advanceMcmRetainedFrame(c,{delta:bitsFloat(row.frameBits),mode:loaded.mode,input:loaded.input},stage=>{
  if(!phases[stage])return;const after=rows.find(r=>r.phase===phases[stage]);assert.ok(after,'Missing AI frame boundary');assert.equal(after.frameBits,row.frameBits);assert.equal(after.bike,row.bike);
  const projected=bridge.projectBody();compare('AI '+stage+' body',row.stateHex,after.stateHex,Buffer.from(projected.buffer,projected.byteOffset,projected.byteLength));
  assert.equal(loaded.random.state,after.randomState,'AI frame random state');
  compareFrameRiderVisuals(loaded,row,after,(name,before,after,actual)=>compare(stage+' '+name,before,after,actual));graphRecords+=after.visualState.length;
  if(stage==='steering'){
   const stack=Buffer.from(after.stackHex,'hex');assert.equal(floatBits(c.frameEntry.control28),stack.readUInt32LE(0x28),'AI steering rate');assert.equal(floatBits(c.frameEntry.extraStiffness),stack.readUInt32LE(0x190),'AI extra stiffness');assert.equal(floatBits(c.frameEntry.analog),stack.readUInt32LE(0xc4),'AI analog sentinel');
  }
  if(stage==='frame-tail'){
   const engine=Buffer.from(row.engineHex,'hex'),e=c.engine;
   for(const [key,o,int] of [['shiftTimer',0x168],['released',0x150,true],['state',0x160],['rpmDemand',0x15c],['previousRpmDemand',0x7c],['shiftThreshold',0x154],['gear',0x158,true]])engine.writeUInt32LE(int?e[key]>>>0:floatBits(e[key]),o);compare('AI engine',row.engineHex,after.engineHex,engine);
   const rider=Buffer.from(row.riderHex,'hex'),r=c.rider;
   for(const [key,o] of [['field138',0x138],['field144',0x144],['field154',0x154],['flag13c',0x13c],['field140',0x140],['active16c',0x16c],['kind',0x170]])rider.writeUInt32LE(r[key]>>>0,o);rider.writeFloatLE(r.fieldf8,0xf8);
   for(const [key,o] of [['velocity',0x70],['angularVelocity',0x7c],['previousVelocity',0x58],['baseAngularVelocity',0x64]])r[key].forEach((v,i)=>rider.writeUInt32LE(floatBits(v),o+i*4));r.selected.forEach((v,i)=>rider.writeUInt32LE(v>>>0,0x160+i*4));compare('AI rider',row.riderHex,after.riderHex,rider);
   for(let i=0;i<3;i++){const emitter=c.frameEffects.emitters[i];assert.equal(emitter.address,after.visualEffects[i].address);compare('AI emitter '+i,row.visualEffects[i].hex,after.visualEffects[i].hex,emitter.bytes);}
   const filter=Buffer.alloc(8);filter.writeFloatLE(c.frameTail.filter.value,0);filter.writeFloatLE(c.frameTail.filter.duration,4);compare('AI filter',row.accelerationFilterHex,after.accelerationFilterHex,filter);
   const envelope=Buffer.alloc(16);c.effect.forEach((v,i)=>envelope.writeFloatLE(v,i*4));compare('AI envelope',row.effectHex,after.effectHex,envelope);
  }
  stages.push(stage);
 });
 assert.equal(result.status,'returned');assert.deepEqual(stages,['ai-controller','steering','frame-tail']);
 return {frames:1,substeps:result.substeps,boundaries:stages.length,comparedBytes:bytes,graphRecords,randomDraws:loaded.random.calls};
}
