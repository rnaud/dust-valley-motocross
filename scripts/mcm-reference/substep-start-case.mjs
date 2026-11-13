import {updateMcmSubstepStart} from '../../src/physics/mcm/substep-start.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function encodeSubstepStart(c){
 const e=c.engine;
 return [c.dt,c.inverseDt,c.analog,c.state844,c.brake,c.aiThrottle,c.aiBrake,c.mass,c.inverseMass,c.alternateMass,c.alternateInverseMass,c.field684,c.field694,c.rider13c,c.rider140,c.speed,c.previousSpeed,...c.velocity,c.previousY,c.accelerationFilter.value,c.accelerationFilter.duration,c.filteredAcceleration,e.shiftTimer,e.released,e.state,e.rpmDemand,e.previousRpmDemand,e.shiftThreshold,e.gear,e.analogFilter.value,e.analogFilter.duration,...e.ratios,...e.thresholdBases,...e.thresholdRanges,...e.speedThresholds,e.downshiftRpm,e.shiftDuration,e.maxRpm,+e.topGearLimitDisabled,e.randomValue,c.input.brakeResponses[0],c.input.throttleResponses[0],+c.input.ai,+c.input.secondaryControl];
}
export function evaluateSubstepStart(input){
 const c=structuredClone(input),r=updateMcmSubstepStart(c);
 return substepStartWords(c,r);
}
export function substepStartWords(c,r){
 const e=c.engine;
 return [floatBits(e.shiftTimer),e.released,...[e.state,e.rpmDemand,e.previousRpmDemand,e.shiftThreshold].map(floatBits),e.gear,...[e.analogFilter.value,c.brake,c.mass,c.inverseMass,c.field694,c.previousSpeed,...c.velocity,c.filteredAcceleration,c.previousY,c.accelerationFilter.value].map(floatBits),r.randomCalls,r.queries.length,...r.queries.map(q=>q.action),...Array(12-r.queries.length).fill(0)];
}
