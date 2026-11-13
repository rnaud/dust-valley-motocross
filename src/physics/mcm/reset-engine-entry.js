import {updateMcmSubstepStart} from './substep-start.js';
import {updateMcmResetFinishedSubstep} from './reset-finished-substep.js';

export function prepareMcmResetEngineEntry(c){
 const b=c.bike,p=c.contactPhase,s=c.engineEntry;
 Object.assign(s,{engine:c.engine,dt:p.dt,inverseDt:p.turnScale,state844:b.field844,brake:b.field5e4,
  aiThrottle:b.fieldb04,aiBrake:b.fieldb08,mass:b.mass,inverseMass:b.inverseMass,
  alternateMass:b.field680,alternateInverseMass:b.field678,field684:b.field684,field694:b.field694,
  rider13c:c.rider.flag13c,rider140:c.rider.field140,speed:b.field6a4,previousSpeed:b.field564,
  velocity:b.velocity,previousY:b.field84c,filteredAcceleration:b.field848});
 const result=updateMcmSubstepStart(s);
 b.field5e4=s.brake;b.mass=s.mass;b.inverseMass=s.inverseMass;b.field694=s.field694;
 b.field564=s.previousSpeed;b.velocity=s.velocity;b.field848=s.filteredAcceleration;b.field84c=s.previousY;
 p.totalTorque=[0,0,0];p.traction.scratch[0]=1;p.frontLoad.turnAngle=0;p.contactCorrection.mask=0;
 p.frontTire.alignment=1;p.traction.tire.alignment=1;p.frontTire.perpendicular=0;p.traction.tire.perpendicular=0;
 return result;
}
export function updateMcmResetEngineEntry(c){
 const entry=prepareMcmResetEngineEntry(c);
 c.observeEngineEntry?.(c.engineEntry,entry);
 const result=updateMcmResetFinishedSubstep(c);
 return {...result,engineRandomCalls:entry.randomCalls};
}
