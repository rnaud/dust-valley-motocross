import {replayAiEntry} from './analyze-ai-entry.mjs';
import assert from 'node:assert/strict';import {computeMcmAiLookahead as lookahead} from '../../src/physics/mcm/ai-lookahead.js';
import {analyzeAiAvoidanceScan} from './analyze-ai-avoidance-scan.mjs';
import {analyzeAiRouteTargets} from './analyze-ai-route-target.mjs';
import {analyzeAiRouteGuidance} from './analyze-ai-route-guidance.mjs';
import {selectMcmAiRouteSegment} from '../../src/physics/mcm/ai-route-segment.js';
import {computeMcmAiHeadingOverride,computeMcmAiAirborneSteering} from '../../src/physics/mcm/ai-heading.js';
import {queryMcmTerrainHeight} from '../../src/physics/mcm/terrain-height.js';
export function analyzeAiLookahead(rows,{terrain,margin,worldHeight}){
const startup=replayAiEntry(rows),scans=analyzeAiAvoidanceScan(rows),targets=analyzeAiRouteTargets(rows),guidance=analyzeAiRouteGuidance(rows),route=rows.find(r=>r.phase==='route'),float=w=>new Float32Array(Uint32Array.of(w).buffer)[0],bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0],table=route.nodes.map(n=>n.address),nodes=new Map(route.nodes.map(n=>[n.address,{x:float(n.words[0]),y:float(n.words[1]),z:float(n.words[2]),kind:n.words[4],speed:float(n.words[3]),next:n.words[10]}]));let calls=0,queryCount=0,targetChanges=0,steeringChanges=0,point,jumpFlag;const checks=[];
for(const entry of rows.filter(r=>r.phase==='before')){
 const b=Buffer.from(entry.hex,'hex'),at=p=>rows.find(r=>r.phase===p&&r.sequence===entry.sequence),g=guidance.checks.find(r=>r.sequence===entry.sequence),target=targets.checks.find(r=>r.sequence===entry.sequence),s=scans.checks.find(r=>r.sequence===entry.sequence),segment=selectMcmAiRouteSegment({head:b.readUInt32LE(0xaf0),nodes,table,x:b.readFloatLE(0x4f8),z:b.readFloatLE(0x500)}),heading=b.readFloatLE(0x4e0),airborne=b.readUInt32LE(0x4bc)!==0;
 const targetHeading=computeMcmAiHeadingOverride({enabled:b.readUInt32LE(0xbfc)!==0,threshold:segment.speed,lateralError:float(g.words[5]),segmentHeading:float(target.words[5]),targetHeading:float(g.words[3]),heading});
 const steering=airborne?computeMcmAiAirborneSteering({class27:segment.class27,targetHeading,heading,velocityHeading:Math.fround(Math.atan2(b.readFloatLE(0x510),b.readFloatLE(0x518))),vx:b.readFloatLE(0x510),vz:b.readFloatLE(0x518),matrix4c0:b.readFloatLE(0x4c0),matrix4c8:b.readFloatLE(0x4c8)}):float(s.words[1]);
 point??=[b.readFloatLE(0xb80),b.readFloatLE(0xb84),b.readFloatLE(0xb88)];jumpFlag??=b.readUInt32LE(0xb8c);
 assert.deepEqual(point.map(bits),[b.readUInt32LE(0xb80),b.readUInt32LE(0xb84),b.readUInt32LE(0xb88)],'Retained target entry');assert.equal(jumpFlag,b.readUInt32LE(0xb8c),'Retained jump flag entry');
 const p={nodes,table,head:b.readUInt32LE(0xaf0),speed:b.readFloatLE(0x6a4),sin:startup.checks.find(r=>r.sequence===entry.sequence).stage.sin,cos:startup.checks.find(r=>r.sequence===entry.sequence).stage.cos,enabled:b.readUInt32LE(0xbb8)!==0,airborne,x:b.readFloatLE(0x4f8),z:b.readFloatLE(0x500),heading,avoidance:airborne?b.readUInt32LE(0xb48):s.words[4],queryHeight:point=>queryMcmTerrainHeight({...terrain,point}),worldHeight,margin,lookahead:float(guidance.lookaheadBits),routeDifference:target.words[6],nearestIndex:segment.index,targetIndex:target.words[2],point,speedLimit:airborne?float(g.words[4]):float(s.words[2]),steering,targetHeading,turnScale:0,jumpFlag};
 const result=lookahead(p),o=at('lookahead-after');assert.ok(o,'Missing lookahead output');const after=Buffer.from(o.hex,'hex'),expected=[...result.point.map(bits),bits(result.speedLimit),bits(result.steering),bits(result.targetHeading),bits(result.turnScale),result.jumpFlag],actual=[after.readUInt32LE(0xb80),after.readUInt32LE(0xb84),after.readUInt32LE(0xb88),o.stack[21],o.stack[11],o.stack[19],o.stack[27],after.readUInt32LE(0xb8c)];
 assert.ok(o,'Missing lookahead output');assert.equal(o.bike,entry.bike);assert.deepEqual(expected,actual,'Computed lookahead outputs');
 const stage=at('steering-control-before');if(stage)assert.equal(expected[4],stage.stack[11],'Lookahead to steering boundary');
 const final=Buffer.from(at('after').hex,'hex');assert.deepEqual(expected.slice(0,3),[final.readUInt32LE(0xb80),final.readUInt32LE(0xb84),final.readUInt32LE(0xb88)],'Retained target exit');assert.equal(result.jumpFlag,final.readUInt32LE(0xb8c),'Retained jump flag exit');
 if(result.point.some((v,i)=>bits(v)!==bits(point[i])))targetChanges++;if(bits(result.steering)!==bits(steering))steeringChanges++;
 checks.push({sequence:entry.sequence,words:expected});point=result.point;jumpFlag=result.jumpFlag;queryCount+=result.queries;calls++;

}
assert.equal(rows.filter(r=>r.phase==='lookahead-after').length,calls,'Lookahead observation count');return {calls,queryCount,targetChanges,steeringChanges,checks};
}
