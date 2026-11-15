import assert from 'node:assert/strict';
import {analyzeAiThrottle} from './analyze-ai-throttle.mjs';
import {advanceMcmAiMotion} from '../../src/physics/mcm/ai-motion.js';
import {floatBits as bits,bitsFloat as float} from '../../src/physics/mcm/math.js';
// Body-output validation only: the capture does not include the AI root graph.
// Its local translation/cache do not affect normalized body axes. The isolated
// original oracle checks actual graph outputs; this diagnostic does not claim to.
export function analyzeAiMotion(rows,options){
 const controls=analyzeAiThrottle(rows,options),offsets=[0x510,0x514,0x518,0x4c0,0x4c4,0x4c8,0x4cc,0x4d0,0x4d4,0x6a4,0xb14,0xb0c,0xb10,0xb6c];let calls=0,rotations=0,boosts=0;
 for(const entry of rows.filter(r=>r.phase==='before')){
  const b=Buffer.from(entry.hex,'hex'),c=controls.checks.find(r=>r.sequence===entry.sequence),rawAngle=Math.fround(Math.fround(Math.PI/2)-b.readFloatLE(0x4dc));
  const r=advanceMcmAiMotion({airborne:!!b.readUInt32LE(0x4bc),speed:b.readFloatLE(0x6a4),turnScale:float(c.words[3]),difference:float(c.lookaheadWords[4]),dt:float(entry.dtBits),pitchAngle:b.readUInt32LE(0x4d0)>0x80000000?-rawAngle:rawAngle,throttle:float(c.words[0]),oldSpeed:b.readFloatLE(0x6a4),heading:b.readFloatLE(0x4e0),velocity:[b.readFloatLE(0x510),float(c.jumpBodyWords[0]),b.readFloatLE(0x518)],forward:[0x4c0,0x4c4,0x4c8].map(o=>b.readFloatLE(o)),up:[0x4cc,0x4d0,0x4d4].map(o=>b.readFloatLE(o)),fieldb6c:b.readUInt32LE(0xb6c)},{local:new Array(16).fill(0),cacheValid:0});
  const words=[...r.velocity.map(bits),...Array.from(r.forward,bits),...Array.from(r.up,bits),bits(r.speed),bits(r.oldSpeed),bits(r.difference),bits(r.heading),r.fieldb6c],observed=rows.find(x=>x.phase==='after'&&x.sequence===entry.sequence);assert.ok(observed,'Missing motion exit');const after=Buffer.from(observed.hex,'hex');assert.deepEqual(words,offsets.map(o=>after.readUInt32LE(o)),`Computed AI motion ${entry.sequence}`);rotations+=Number(r.rotated);boosts+=Number(r.boosted);calls++;
 }
 assert.equal(calls,controls.calls);return {calls,gas:controls.gas,brake:controls.brake,rotations,boosts};
}
