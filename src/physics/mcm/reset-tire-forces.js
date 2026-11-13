import {updateMcmResetSuspension} from './reset-suspension.js';
import {prepareMcmRearDrive} from './rear-suspension-substep.js';
import {prepareMcmRearLoad,prepareMcmRearVelocity} from './rear-motion-substep.js';
import {updateMcmRearTire} from './rear-tire-substep.js';
import {accumulateMcmTireForces} from './tire-accumulation-substep.js';
import {applyMcmBrakes} from './braking-substep.js';

// Original reset path through 0x4a8be0, before chassis contact/impulse.
export function updateMcmResetTireForces(c){
 const result=updateMcmResetSuspension(c),b=c.bike,p=c.contactPhase;
 if(p.rearContact&&!c.engine)throw new RangeError('The original rear drive path requires an engine');
 p.drive={...c.engine,ai:b.field614,aiScale:b.fieldba8};
 p.rearMotion.speed=b.field73c;p.rearMotion.forwardMagnitude=b.field738;
 Object.assign(p.traction,{maxSpeed:b.field6d4,gain:b.field6d0,inverseMass:b.inverseMass,acceleration:b.acceleration,rollCos:b.field4ec});
 p.mass=b.mass;p.brakeInput=b.field5e4;p.brakeCoefficient=b.field5e8;
 prepareMcmRearDrive(p);prepareMcmRearLoad(p);prepareMcmRearVelocity(p);
 updateMcmRearTire(p);accumulateMcmTireForces(p);applyMcmBrakes(p);
 b.localLever=p.frontLoad.localArm;b.offset=p.offset;b.field560=p.forwardSpeed;b.field620=p.steeringFlag;
 b.field73c=p.rearMotion.speed;b.field738=p.rearMotion.forwardMagnitude;
 c.component8e4.value=p.frontSuspension.previousDisplacement;c.component8e4.field5c=p.frontSuspension.previousTravel;
 c.component8e8.field58=p.rearSuspension.previousTravel;
 return result;
}
