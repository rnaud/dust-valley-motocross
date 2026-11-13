import {updateMcmResetContactResponse} from './reset-contact-response.js';
import {updateMcmContactBalance,updateMcmBalanceCenter} from './contact-balance.js';
import {updateMcmFrontSuspension} from './front-suspension-substep.js';

// Reset path through common balance and the front suspension branch. Rear-only
// and no-contact paths return at their original branch destinations.
export function updateMcmResetFrontSuspension(c){
 const result=updateMcmResetContactResponse(c),b=c.bike,p=c.contactPhase;
 Object.assign(p,{bodyPosition:b.position,takeoffPosition:[b.field6b8,b.field6bc,b.field6c0],
  takeoffVelocity:[b.field6c4,b.field6c8,b.field6cc],riderLean:b.field6ec,
  leanDisabled:b.field710,riderMass:b.field688,bikeMass:b.field684,totalMass:b.field68c,
  supportDepth:b.field5d8,balanceCenter:b.referencePosition,balanceNode:c.referenceNode});
 Object.assign(p.frontSuspension,{node:c.suspension.front.node,limited:c.suspension.front.limited,
  previousDisplacement:c.component8e4.value,previousTravel:c.component8e4.field5c});
 updateMcmContactBalance(p);updateMcmBalanceCenter(p);updateMcmFrontSuspension(p);
 b.field4bc=p.field4bc;b.field870=p.field870;b.field5a8=p.frontWeight;b.field5ac=p.rearWeight;
 b.referencePosition=p.balanceCenter;
 for(let i=0;i<3;i++){
  b[`field${(0x6b8+i*4).toString(16)}`]=p.takeoffPosition[i];
  b[`field${(0x6c4+i*4).toString(16)}`]=p.takeoffVelocity[i];
  b[`field${(0x66c+i*4).toString(16)}`]=p.localBalanceCenter[i];
 }
 c.component8e4.value=p.frontSuspension.previousDisplacement;c.component8e4.field5c=p.frontSuspension.previousTravel;
 c.suspension.front.limited=p.frontSuspension.limited;
 return result;
}
