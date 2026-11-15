import assert from 'node:assert/strict';
import {analyzeAiRouteGuidance} from './analyze-ai-route-guidance.mjs';
import {writeMcmAiAvoidanceRecord} from '../../src/physics/mcm/ai-avoidance-record.js';
import {floatBits} from '../../src/physics/mcm/math.js';
const offsets=[0x4f8,0x4fc,0x500,0x510,0x514,0x518];
const body=b=>Object.fromEntries(['x','y','z','vx','vy','vz'].map((k,i)=>[k,b.readFloatLE(offsets[i])]));
export function analyzeAiAvoidanceRecords(rows,options={}){
 const guidance=analyzeAiRouteGuidance(rows,options);let records=0,active=0,skipped=0;
 for(const entry of rows.filter(r=>r.phase==='before')){
  const self=Buffer.from(entry.hex,'hex'),at=phase=>rows.find(r=>r.phase===phase&&r.sequence===entry.sequence);
  const observed=rows.filter(r=>r.phase==='avoidance'&&r.sequence===entry.sequence);
  if(self.readUInt32LE(0x4bc)!==0){assert.equal(observed.length,0,'Avoidance eligibility');skipped++;continue;}
  const player=at('race-context'),first=at('actors'),second=at('second-actors');assert.ok(player&&first&&second,'Missing actor inputs');
  const inputs=[{kind:0,address:player.other,hex:player.otherHex},...first.actors.map(a=>({...a,kind:1})),...second.actors.map(a=>({...a,kind:2}))];
  assert.equal(observed.length,inputs.length,'Avoidance record count');
  for(let i=0;i<inputs.length;i++){
   const input=inputs[i],o=observed[i],other=Buffer.from(input.hex,'hex');assert.equal(o.kind,input.kind);assert.equal(o.other,input.address);assert.equal(o.bike,entry.bike);
   // Output-time body snapshots are assertions, never simulation inputs.
   for(const offset of offsets){assert.equal(Buffer.from(o.selfHex,'hex').readUInt32LE(offset),self.readUInt32LE(offset),'Self input mutation');assert.equal(Buffer.from(o.otherHex,'hex').readUInt32LE(offset),other.readUInt32LE(offset),'Other input mutation');}
   assert.equal(Buffer.from(o.selfHex,'hex').readUInt32LE(0xb54),self.readUInt32LE(0xb54),'Radius mutation');
   const r=writeMcmAiAvoidanceRecord({}, {self:body(self),other:body(other),radius:self.readFloatLE(0xb54),player:input.kind===0});
   const words=[r.active,floatBits(r.distance),floatBits(r.heading),floatBits(r.relativeSpeedSquaredPlusOne),floatBits(r.halfAngle)];
   // Inactive angle slots are not written or consumed; their preservation is
   // covered by the isolated oracle with explicitly supplied prior values.
   for(const index of r.active?[0,1,2,3,4]:[0,1,3])assert.equal(words[index],o.words[index],'Computed avoidance output');
   records++;active+=r.active;
  }
 }
 assert.equal(rows.filter(r=>r.phase==='avoidance').length,records,'Unmatched avoidance records');
 return {calls:guidance.calls,targetAdvances:guidance.targetAdvances,records,active,inactive:records-active,skipped};
}
