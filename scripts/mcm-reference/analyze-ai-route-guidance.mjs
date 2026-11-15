import {initializeMcmAiParameters} from '../../src/physics/mcm/ai-initial-parameters.js';
import assert from 'node:assert/strict';
import {analyzeAiRouteTargets} from './analyze-ai-route-target.mjs';
import {selectMcmAiRouteSegment} from '../../src/physics/mcm/ai-route-segment.js';
import {computeMcmAiRouteGuidance} from '../../src/physics/mcm/ai-route-guidance.js';
const float=w=>new Float32Array(Uint32Array.of(w).buffer)[0],bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0];
export function analyzeAiRouteGuidance(rows,{worldHeight,directions}={}){
 const targets=analyzeAiRouteTargets(rows),route=rows.find(r=>r.phase==='route'),table=route.nodes.map(n=>n.address);
 const nodes=new Map(route.nodes.map(n=>[n.address,{x:float(n.words[0]),y:float(n.words[1]),z:float(n.words[2]),speed:float(n.words[3]),speedLimit:float(n.words[5]),kind:n.words[4],offsetX:float(n.words[6]),offsetZ:float(n.words[7]),next:n.words[10]}]));
 let lookaheadBits=worldHeight===undefined?undefined:bits(initializeMcmAiParameters(worldHeight,0).lookahead);const checks=[];
 for(const entry of rows.filter(r=>r.phase==='before')){
  const b=Buffer.from(entry.hex,'hex'),observed=rows.find(r=>r.phase==='guidance'&&r.sequence===entry.sequence),target=targets.checks.find(r=>r.sequence===entry.sequence);
  assert.ok(observed,'Missing guidance observation');assert.equal(observed.bike,entry.bike);
  lookaheadBits??=observed.lookaheadBits;assert.equal(observed.lookaheadBits,lookaheadBits,worldHeight===undefined?'Unmodeled lookahead mutation':'Computed initial lookahead');
  const x=b.readFloatLE(0x4f8),z=b.readFloatLE(0x500),segment=selectMcmAiRouteSegment({head:b.readUInt32LE(0xaf0),nodes,table,x,z});
  const result=computeMcmAiRouteGuidance({mode:rows.find(r=>r.phase==='race-context'&&r.sequence===entry.sequence).mode,direction:directions?.[b.readUInt32LE(0xc34)],target:nodes.get(target.words[0]),targetNext:nodes.get(target.words[1]),nearest:nodes.get(segment.address),previous:nodes.get(segment.previous),next:nodes.get(segment.next),x,z,heading:b.readFloatLE(0x4e0),lookahead:float(lookaheadBits),inverseLength:segment.inverseLength});
  const words=[result.distance,result.aimX,result.aimZ,result.targetHeading,result.speedLimit,result.lateralError].map(bits);assert.deepEqual(words,observed.words,'Computed guidance outputs');checks.push({sequence:entry.sequence,words});
 }
 return {calls:checks.length,targetAdvances:targets.advances,lookaheadBits,checks};
}
