import {prepareMcmContactTransforms} from './contact-preparation.js';
import {updateMcmContactSubstep} from './contact-substep.js';

// Continue a taken loop-back after engine entry, through 0x4a64dc.
export function continueMcmResetLoopContact(c){
 const b=c.bike,p=c.contactPhase;
 b.referencePosition=prepareMcmContactTransforms(c.suspension).position;
 if(c.resetReason!==0)throw new Error('Completed reset must clear its pending reason');
 Object.assign(p,{node:c.componentNode,bodyNode:c.bodyNode,frontNode:c.frontNode,rearNode:c.rearNode,
  terrain:c.terrain,points:c.points,heights:c.heights,radius:c.frontRadius,rearRadius:c.rearRadius,
  bikeForward:b.forward,bikeUp:b.up,pitch:b.field4dc,heading:b.field4e0,sinRoll:b.field4e4,
  componentAxis:c.componentAxis,componentAngle:c.componentAngle,state844:b.field844,
  cooldown:b.field888,cooldownFlag:b.field8ac,...c.contactScratch});
 const result=updateMcmContactSubstep(p);
 c.points=p.points;c.heights=p.heights;c.componentAngle=p.componentAngle;
 b.field6b0=p.field6b0;b.field888=p.cooldown;b.field8ac=p.cooldownFlag;
 b.tangent=p.tangent;b.rearTangent=p.rearTangent;b.normal=p.normal;b.offset=p.offset;
 [b.field590,b.field594]=c.heights;
 return result;
}
