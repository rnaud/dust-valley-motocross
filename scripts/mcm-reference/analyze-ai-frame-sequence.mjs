import assert from 'node:assert/strict';
import {loadLiveFrameBootstrap} from './live-frame-bootstrap.mjs';
import {compareFrameRiderVisuals} from './compare-live-frame-rider-visuals.mjs';
import {advanceMcmRetainedFrame} from '../../src/physics/mcm/retained-frame.js';
import {bitsFloat} from '../../src/physics/mcm/math.js';

// Diagnostic, not a whole-world parity verdict. Initialize once, retain all
// computed state, and report external visual writes rather than importing them.
export function analyzeAiFrameSequence(inputs,rows){
 const observations=rows.filter(r=>r.phase!=='random'),first=observations[0];
 assert.ok(observations.length>=8&&observations.length%4===0,'Expected consecutive complete AI frames');
 const phases=['before-update','after-ai-controller','after-ai-steering','after-update'];
 observations.forEach((r,i)=>{assert.equal(r.phase,phases[i%4]);assert.equal(r.bike,first.bike);});
 const loaded=loadLiveFrameBootstrap({...inputs,row:first}),c=loaded.context;
 const visualDifferences=[],intervals=[],substeps=[];let bodyBoundaries=0,bodyBytes=0;
 const compare=(row,frame,stage)=>{
  const actual=c.aiController.projectBody(),expected=Buffer.from(row.stateHex,'hex');
  assert.equal(actual.byteLength,expected.length);
  for(let o=0;o<expected.length;o+=4)assert.equal(actual.getUint32(o,true),expected.readUInt32LE(o),`AI sequence frame ${frame} ${stage} body ${o.toString(16)}`);
  assert.equal(loaded.random.state,row.randomState,`AI sequence frame ${frame} ${stage} RNG`);
  bodyBoundaries++;bodyBytes+=expected.length;
  // The original first snapshot supplies immutable allocation bytes throughout;
  // later native rows are comparison targets only, never serialization seeds.
  compareFrameRiderVisuals(loaded,first,row,(name,before,after,bytes)=>{
   const expected=Buffer.from(after,'hex');assert.equal(bytes.length,expected.length);
   for(let o=0;o<expected.length;o+=4)if(bytes.readUInt32LE(o)!==expected.readUInt32LE(o))visualDifferences.push({frame,stage,name,offset:o,actual:bytes.readUInt32LE(o),expected:expected.readUInt32LE(o)});
  });
 };
 for(let frame=0;frame<observations.length/4;frame++){
  const group=observations.slice(frame*4,frame*4+4),entry=group[0];
  group.forEach(r=>assert.equal(r.frameBits,entry.frameBits));
  compare(entry,frame,'entry');intervals.push(bitsFloat(entry.frameBits));
  let boundary=1;
  const result=advanceMcmRetainedFrame(c,{delta:intervals.at(-1),mode:loaded.mode,input:loaded.input},stage=>{
   if(!['ai-controller','steering','frame-tail'].includes(stage))return;
   assert.equal(stage,['ai-controller','steering','frame-tail'][boundary-1]);compare(group[boundary++],frame,stage);
  });
  assert.equal(result.status,'returned');assert.equal(boundary,4);substeps.push(result.substeps);
 }
 return {frames:intervals.length,intervals,substeps,bodyBoundaries,bodyBytes,randomDraws:loaded.random.calls,visualDifferences};
}
