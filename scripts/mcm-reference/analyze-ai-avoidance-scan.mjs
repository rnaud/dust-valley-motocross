import assert from 'node:assert/strict';
import {analyzeAiAvoidanceRecords} from './analyze-ai-avoidance-record.mjs';
import {analyzeAiRouteGuidance} from './analyze-ai-route-guidance.mjs';
import {selectMcmAiRouteSegment} from '../../src/physics/mcm/ai-route-segment.js';
import {writeMcmAiAvoidanceRecord} from '../../src/physics/mcm/ai-avoidance-record.js';
import {scanMcmAiAvoidance} from '../../src/physics/mcm/ai-avoidance-scan.js';
import {floatBits as bits,bitsFloat as float} from '../../src/physics/mcm/math.js';
const body=b=>Object.fromEntries(['x','y','z','vx','vy','vz'].map((k,i)=>[k,b.readFloatLE([0x4f8,0x4fc,0x500,0x510,0x514,0x518][i])]));
export function analyzeAiAvoidanceScan(rows){
 const records=analyzeAiAvoidanceRecords(rows),guidance=analyzeAiRouteGuidance(rows),route=rows.find(r=>r.phase==='route'),table=route.nodes.map(n=>n.address);
 const nodes=new Map(route.nodes.map(n=>[n.address,{x:float(n.words[0]),z:float(n.words[2]),speed:float(n.words[3]),kind:n.words[4],next:n.words[10]}]));
 let scans=0;const checks=[];
 for(const entry of rows.filter(r=>r.phase==='before')){
  const b=Buffer.from(entry.hex,'hex'),at=phase=>rows.find(r=>r.phase===phase&&r.sequence===entry.sequence),before=at('scan-before'),after=at('scan-after');
  if(b.readUInt32LE(0x4bc)){assert.ok(!before&&!after,'Unexpected skipped scan');continue;}
  assert.ok(before&&after,'Missing avoidance scan');assert.equal(before.bike,entry.bike);assert.equal(after.bike,entry.bike);
  assert.equal(b.readUInt32LE(0xbfc),0,'Unrecovered heading override');
  const self=body(b),segment=selectMcmAiRouteSegment({head:b.readUInt32LE(0xaf0),nodes,table,x:self.x,z:self.z}),g=guidance.checks.find(r=>r.sequence===entry.sequence);
  const record=(hex,player=false)=>writeMcmAiAvoidanceRecord({}, {self,other:body(Buffer.from(hex,'hex')),radius:b.readFloatLE(0xb54),player});
  const actors=phase=>at(phase).actors.map(a=>({self:a.address===entry.bike,record:record(a.hex)}));
  const input={heading:b.readFloatLE(0x4e0),targetHeading:float(g.words[3]),speedLimit:float(g.words[4]),lateralError:float(g.words[5]),threshold:segment.speed,range:b.readFloatLE(0x6a4),x:self.x,z:self.z,player:record(at('race-context').otherHex,true),firstActors:actors('actors'),secondActors:actors('second-actors'),head:b.readUInt32LE(0xaf0),nodes};
  for(const [offset,key] of [[0x50,'heading'],[0x4c,'targetHeading'],[0x54,'speedLimit'],[0x88,'lateralError'],[0x8c,'threshold'],[0x40,'range']])assert.equal(before.stack[offset/4],bits(input[key]),'Computed scan input');
  assert.equal(before.flag,0,'Scan flag reset');const r=scanMcmAiAvoidance(input),words=[bits(r.selectedHeading),bits(r.steeringDifference),bits(r.speedLimit),bits(r.offset),r.flag];
  assert.deepEqual(words,[after.stack[4],after.stack[11],after.stack[21],after.stack[26],after.flag],'Computed scan output');scans++;checks.push({sequence:entry.sequence,words});
 }
 assert.equal(rows.filter(r=>r.phase==='scan-before').length,scans);assert.equal(rows.filter(r=>r.phase==='scan-after').length,scans);
 return {calls:records.calls,scans,skipped:records.skipped,targetAdvances:records.targetAdvances,checks};
}
