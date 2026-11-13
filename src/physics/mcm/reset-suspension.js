import {updateMcmResetFrontSuspension} from './reset-front-suspension.js';
import {prepareMcmFrontLoad} from './front-load-substep.js';
import {prepareMcmFrontVelocity,prepareMcmFrontTireForce} from './front-velocity-substep.js';
import {updateMcmRearSuspension} from './rear-suspension-substep.js';

// Continue reset-produced contacts through front loading/tire response and rear
// suspension, stopping before the rear drive-force call or front-only join.
export function updateMcmResetSuspension(c){
 const result=updateMcmResetFrontSuspension(c);
 applyMcmBikeSuspension(c);return result;
}

export function applyMcmBikeSuspension(c){
 const b=c.bike,p=c.contactPhase;
 Object.assign(p,{forwardSpeed:b.field560,steeringFlag:b.field620,angularVelocity:b.worldAngularVelocity});
 p.frontLoad.localArm=b.localLever;
 p.frontTire.coefficient5b0=b.field5b0;p.frontTire.coefficient5b4=b.field5b4;
 Object.assign(p.rearSuspension,{limit:c.component8e8.limit,limitAngle:c.component8e8.limitAngle,divisor:c.component8e8.divisor,previousHeight:c.component8e8.field5c,previousTravel:c.component8e8.field58,limited:c.suspension.rear.limited});
 prepareMcmFrontLoad(p);prepareMcmFrontVelocity(p);prepareMcmFrontTireForce(p);updateMcmRearSuspension(p);
 b.velocity=p.velocity;
 if(p.frontContact&&p.rearContact){b.field6b0=p.field6b0;b.field6b4=p.frontLoad.radius;}
 b.localLever=p.frontLoad.localArm;b.offset=p.offset;b.field560=p.forwardSpeed;b.field620=p.steeringFlag;
 c.component8e4.value=p.frontSuspension.previousDisplacement;c.component8e4.field5c=p.frontSuspension.previousTravel;
 c.component8e8.field58=p.rearSuspension.previousTravel;
 c.suspension.rear.limited=p.rearSuspension.limited;
 b.field590=p.heights[0];b.field594=p.heights[1];

}
