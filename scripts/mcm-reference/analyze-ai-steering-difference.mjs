import assert from 'node:assert/strict';import {computeMcmAiHeadingOverride,computeMcmAiAirborneSteering} from '../../src/physics/mcm/ai-heading.js';
import {analyzeAiAvoidanceScan} from './analyze-ai-avoidance-scan.mjs';
import {analyzeAiRouteGuidance} from './analyze-ai-route-guidance.mjs';
import {analyzeAiRouteTargets} from './analyze-ai-route-target.mjs';
import {selectMcmAiRouteSegment} from '../../src/physics/mcm/ai-route-segment.js';
export function analyzeAiSteeringDifference(rows){
const scans=analyzeAiAvoidanceScan(rows),guidance=analyzeAiRouteGuidance(rows),targets=analyzeAiRouteTargets(rows),route=rows.find(r=>r.phase==='route'),float=w=>new Float32Array(Uint32Array.of(w).buffer)[0],bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0],table=route.nodes.map(n=>n.address),nodes=new Map(route.nodes.map(n=>[n.address,{x:float(n.words[0]),z:float(n.words[2]),kind:n.words[4],speed:float(n.words[3]),next:n.words[10]}]));let airborne=0;
assert.equal(rows.filter(r=>r.phase==='heading-override').length,guidance.calls,'Heading observation count');assert.equal(rows.filter(r=>r.phase==='steering-difference').length,guidance.calls,'Steering observation count');
for(const entry of rows.filter(r=>r.phase==='before')){const b=Buffer.from(entry.hex,'hex'),at=p=>rows.find(r=>r.phase===p&&r.sequence===entry.sequence),g=guidance.checks.find(r=>r.sequence===entry.sequence),target=targets.checks.find(r=>r.sequence===entry.sequence),segment=selectMcmAiRouteSegment({head:b.readUInt32LE(0xaf0),nodes,table,x:b.readFloatLE(0x4f8),z:b.readFloatLE(0x500)});const heading=b.readFloatLE(0x4e0),vx=b.readFloatLE(0x510),vz=b.readFloatLE(0x518);
 const targetHeading=computeMcmAiHeadingOverride({enabled:b.readUInt32LE(0xbfc)!==0,threshold:segment.speed,lateralError:float(g.words[5]),segmentHeading:float(target.words[5]),targetHeading:float(g.words[3]),heading});
 assert.equal(bits(targetHeading),at('heading-override').stack[0x4c/4],'Computed heading override');let expected;
 if(b.readUInt32LE(0x4bc)){expected=bits(computeMcmAiAirborneSteering({class27:segment.class27,targetHeading,heading,velocityHeading:Math.fround(Math.atan2(vx,vz)),vx,vz,matrix4c0:b.readFloatLE(0x4c0),matrix4c8:b.readFloatLE(0x4c8)}));airborne++;}
 else expected=scans.checks.find(r=>r.sequence===entry.sequence).words[1];
 assert.equal(expected,at('steering-difference').stack[0x2c/4],'Computed steering difference');}
return {calls:guidance.calls,airborne,ground:guidance.calls-airborne};
}
