import {selectMcmResetPose} from '../../src/physics/mcm/reset-selection.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetSelection(v){
 const bike={position:v.slice(7,10),forward:v.slice(10,13),spawnPosition:v.slice(13,16),spawnForward:v.slice(16,19),fieldbb8:v[2],field614:v[3],fieldc08:v[5],fieldbe4:v[6]};
 const calls=Array(9).fill(0);
 const capture=(kind,p,forward)=>{calls[0]++;calls[1]=kind;calls[2]=+(forward!==null);calls.splice(3,3,...p.map(floatBits));if(forward)calls.splice(6,3,...forward.map(floatBits));p.splice(0,3,...v.slice(kind===1?19:25,kind===1?22:28));if(forward)forward.splice(0,3,...v.slice(kind===1?22:28,kind===1?25:31));};
 const pose=selectMcmResetPose({bike,mode:v[0],setting:v[1],resetReason:v[4],pose:{position:v.slice(31,34),forward:v.slice(34,37)},selectTerrain:(p,f)=>capture(1,p,f),selectCourse:(p,f)=>capture(2,p,f)});
 return [...pose.position,...pose.forward,...bike.position].map(floatBits).concat(calls);
}
