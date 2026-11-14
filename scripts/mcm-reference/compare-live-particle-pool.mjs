import {loadLiveParticlePool} from './live-particle-pool.mjs';
import {tickMcmParticlePool} from '../../src/physics/mcm/particle-pool-tick.js';
import {bitsFloat} from '../../src/physics/mcm/math.js';
// Independent original pool calls. Every call starts from its observed inputs;
// this checks the full routine, not a retained shared-world simulation.
export function compareLiveParticlePoolTicks(events){
 const initial=events[0];
 if(initial?.phase!=='initial-rider'||initial.particleStride!==72||initial.particleOrder!=='initial-allocation-order')throw Error('Full initial particle allocation capture required');
 let comparedWords=0,changedWords=0,differences=0;const reports=[];
 for(let i=1;i<events.length;i++){
  const before=events[i];if(before.phase!=='before-pool')continue;
  const after=events[++i];
  if(after?.phase!=='after-pool'||after.eventSequence!==before.eventSequence+1||after.frame!==before.frame||after.dtBits!==before.dtBits||after.paused!==before.paused)throw Error('Pool update boundary differs');
  const state=loadLiveParticlePool(initial,initial.poolAddress);
  for(const row of [before,after])if(row.poolAddress!==initial.poolAddress||row.particleStride!==72||row.particleOrder!==initial.particleOrder||!Number.isInteger(row.dtBits))throw Error('Pool observation layout differs');
  for(const [key,bytes]of [['poolHex',state.poolBytes],['particlesHex',state.particleBytes]]){
   const source=Buffer.from(before[key],'hex');if(source.length!==bytes.length)throw Error('Pool input allocation size differs');source.copy(bytes);
  }
  tickMcmParticlePool(state.pool,{dt:bitsFloat(before.dtBits),paused:before.paused});
  let changed=0,errors=0,words=0;const firstDifferences=[];
  for(const [key,bytes]of [['poolHex',state.poolBytes],['particlesHex',state.particleBytes]]){
   const source=Buffer.from(before[key],'hex'),native=Buffer.from(after[key],'hex');if(native.length!==bytes.length)throw Error('Pool output allocation size differs');
   for(let o=0;o<bytes.length;o+=4){words++;const original=native.readUInt32LE(o),recovered=bytes.readUInt32LE(o);if(source.readUInt32LE(o)!==original)changed++;if(original!==recovered){errors++;if(firstDifferences.length<20)firstDifferences.push({object:key,offset:o,original,recovered});}}
  }
  comparedWords+=words;changedWords+=changed;differences+=errors;reports.push({frame:before.frame,dtBits:before.dtBits,paused:before.paused,comparedWords:words,changedWords:changed,differences:errors,firstDifferences});
 }
 return {scope:'Independent captured original 0x43b200 calls, each initialized from observed pre-call inputs. All pool header/slot words and all 1000 complete 72-byte allocations compared. Does not establish retained world scheduling or rendering parity.',ticks:reports.length,comparedWords,changedWords,differences,reports};
}
