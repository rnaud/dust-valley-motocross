import {evaluatePreparedResetSubstep} from './prepared-reset-substep-case.mjs';
import {updateMcmResetContactResponse} from '../../src/physics/mcm/reset-contact-response.js';
import {floatBits,bitsFloat} from '../../src/physics/mcm/math.js';

export function evaluateResetContactResponse(input){
 let phase;
 const words=evaluatePreparedResetSubstep(input,c=>{
  phase=structuredClone(input.contactPhase);
  phase.frontMountNode=c.bounds.components[phase.frontMountIndex];
  phase.chassisLocal=[0x630,0x63c,0x648].map(offset=>input.words.slice(offset/4,offset/4+3).map(bitsFloat));
  c.contactPhase=phase;
  return updateMcmResetContactResponse(c);
 });
 const p=phase;
 return [...words,p.frontContact,p.rearContact,p.bothContact,p.anyContact,
  floatBits(p.speedCopy),...p.force.map(floatBits),floatBits(p.rearAlignment),
  ...p.contactDirection.map(floatBits),...p.rearLever.map(floatBits),...p.frontAxis.map(floatBits),...p.frontLever.map(floatBits),
  ...p.chassisWorld.flatMap(v=>v.map(floatBits)),...p.chassisSurface.flatMap(v=>v.map(floatBits)),
  ...p.chassisNormals.flatMap(v=>v.map(floatBits)),...p.chassisDepth.map(floatBits),p.control20];
}
