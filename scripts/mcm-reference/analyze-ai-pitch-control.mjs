import assert from 'node:assert/strict';
import {replayAiLandingPitch} from './analyze-ai-landing-pitch.mjs';
import {analyzeAiAvoidanceScan} from './analyze-ai-avoidance-scan.mjs';
import {selectMcmAiRouteSegment} from '../../src/physics/mcm/ai-route-segment.js';
import {computeMcmAiBasePitch,computeMcmAiPitchControl} from '../../src/physics/mcm/ai-pitch-control.js';
import {prepareMcmFrameInput} from '../../src/physics/mcm/frame-input.js';
import {floatBits as bits,bitsFloat as float} from '../../src/physics/mcm/math.js';
// Mode-0 chain. Crash occurrence is still an observed outer-frame boundary;
// its clearing behavior comes from the existing recovered frame-input routine.
export function analyzeAiPitchControl(rows,options){
 const replay=replayAiLandingPitch(rows,options),scans=analyzeAiAvoidanceScan(rows),route=rows.find(r=>r.phase==='route'),table=route.nodes.map(n=>n.address),nodes=new Map(route.nodes.map(n=>[n.address,{x:float(n.words[0]),z:float(n.words[2]),kind:n.words[4],speed:float(n.words[3]),next:n.words[10]}])),entries=new Map(rows.filter(r=>r.phase==='before').map(r=>[r.sequence,r])),bike=rows.find(r=>r.phase==='before').bike;
 let current,calls=0,clears=0;const checks=[];
 for(const r of rows){
  if(r.phase==='before'){const b=Buffer.from(r.hex,'hex');current??=b.readUInt32LE(0x6ec);assert.equal(current,b.readUInt32LE(0x6ec),'Retained pitch entry');}
  if(r.phase==='crash-control-clear'&&r.bike===bike&&current!==undefined){const c={bike:{field844:1,fieldb6c:0,field6ec:float(current)},frameEntry:{}};assert.equal(prepareMcmFrameInput(c,{}).branch,'crash');current=bits(c.bike.field6ec);clears++;}
  if(r.phase==='steering-control-before')assert.equal(current,Buffer.from(r.hex,'hex').readUInt32LE(0x6ec),'Pitch stage entry');
  if(r.phase!=='after')continue;
  const entry=entries.get(r.sequence),b=Buffer.from(entry.hex,'hex'),stage=rows.find(x=>x.phase==='lookahead-after'&&x.sequence===r.sequence),computed=replay.checks.find(x=>x.sequence===r.sequence),segment=selectMcmAiRouteSegment({head:b.readUInt32LE(0xaf0),nodes,table,x:b.readFloatLE(0x4f8),z:b.readFloatLE(0x500)}),near=nodes.get(segment.address),next=nodes.get(segment.next);
  const rawAngle=Math.fround(Math.fround(Math.PI/2)-b.readFloatLE(0x4dc)),angle=bits(b.readUInt32LE(0x4d0)>0x80000000?-rawAngle:rawAngle);assert.equal(angle,stage.stack[30],'Computed pitch angle');assert.equal(entry.dtBits,stage.dtBits,'Pitch timestep');
  const avoidance=b.readUInt32LE(0x4bc)?b.readUInt32LE(0xb48):scans.checks.find(x=>x.sequence===r.sequence).words[4];
  current=computeMcmAiBasePitch([b.readUInt32LE(0x6a4),current,entry.dtBits]);
  const w=[entry.dtBits,current,b.readUInt32LE(0x590),b.readUInt32LE(0x594),b.readUInt32LE(0x4bc),avoidance,computed.bodyWords[3],b.readUInt32LE(0xbb8),b.readUInt32LE(0xbac),computed.lookahead[7],b.readUInt32LE(0x4f8),b.readUInt32LE(0x500),angle,Number(segment.class3456),stage.stack[32],stage.stack[22],computed.lookahead[6],bits(segment.inverseLength),bits(near.x),bits(near.z),bits(next.x),bits(next.z),next.kind];
  const out=computeMcmAiPitchControl(w);current=out[0];assert.equal(current,Buffer.from(r.hex,'hex').readUInt32LE(0x6ec),'Computed final pitch command');checks.push({sequence:r.sequence,words:out});calls++;
 }
 assert.equal(calls,replay.calls);return {calls,clears,landingQueries:replay.landingQueries,aiDraws:replay.draws,checks};
}
