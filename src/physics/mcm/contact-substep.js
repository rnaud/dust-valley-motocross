import {queryMcmSubstepWheelContacts} from './wheel-contact-frame.js';
import {invalidateMcmTransform} from './event-orientation.js';
import {rotateMcmTransform} from './transform.js';
import {floatBits} from './math.js';
const f=Math.fround;

// Original ordinary main-loop branch 0x4a63d2..0x4a64dc. Contact querying
// precedes the component transform update and cooldown decrement.
export function updateMcmContactSubstep(c){
 const result=queryMcmSubstepWheelContacts(c);
 if(!c.state844){
  c.componentAngle=f(c.componentAngle+f(c.dt*c.componentRate));
  if(!Number.isFinite(c.componentAngle)||Math.abs(c.componentAngle)<f(.0001))c.componentAngle=0;
  c.node.local=[...c.bodyNode.local];invalidateMcmTransform(c.node);
  c.node.local.splice(12,3,0,0,0);invalidateMcmTransform(c.node);
  if(c.componentAngle!==0){c.node.local=rotateMcmTransform(c.node.local,c.componentAxis,-c.componentAngle);invalidateMcmTransform(c.node);}
 }
 // The original tests signed float bits, including the sign of zero.
 if((floatBits(c.cooldown)|0)>0){
  c.cooldown=f(c.cooldown-c.dt);
  if((floatBits(c.cooldown)|0)<=0){c.cooldown=0;c.cooldownFlag=0;}
 }
 return result;
}
