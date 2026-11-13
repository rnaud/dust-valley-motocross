import {calculateMcmTireForce} from './physics/mcm/tire-force.js';
import {accumulateMcmTireForces} from './physics/mcm/tire-accumulation-substep.js';
import {applyMcmBrakes} from './physics/mcm/braking-substep.js';
import {updateMcmSteeringVelocity} from './physics/mcm/steering-velocity.js';

const f=Math.fround,FT=.3048,LBF=4.448221615,SLUG=14.59390294;
const feet=v=>v.map(x=>f(x/FT));
// PDM local-bike coefficients: +5b0=6, +5b4=float32(.15), +5e8=175.
// The preview supplies world-space contact velocities, axes, arms and loads.
// Full original contact preparation and dynamic rear traction remain upstream.
export function mcmPreviewContactForces({front,rear,velocity,mass,dt,brake=false}){
  const contact=(wheel,isRear)=>{
    if(!wheel)return {active:false,axis:[0,0,1],arm:[0,0,0],motion:{speed:0,forwardMagnitude:0},tire:{force:[0,0,0],magnitude:0},forward:0};
    const v=feet(wheel.velocity),speed=f(Math.hypot(...v));
    const axis=wheel.axis.map(f),forward=f(v.reduce((sum,x,i)=>sum+x*axis[i],0));
    const direction=speed>0?v.map(x=>f(x/speed)):[0,0,0];
    const tire=speed>0?calculateMcmTireForce({axis,direction,load:f(wheel.load/LBF),
      coefficient5b0:6,coefficient5b4:f(.15),rear:isRear}):{force:[0,0,0],magnitude:0};
    return {active:true,axis,arm:feet(wheel.arm),motion:{speed,forwardMagnitude:f(Math.abs(forward))},tire,forward};
  };
  const a=contact(front,false),b=contact(rear,true);
  const c={anyContact:a.active||b.active,bothContact:a.active&&b.active,frontContact:a.active,rearContact:b.active,
    frontMotion:a.motion,rearMotion:b.motion,frontTire:a.tire,traction:{tire:b.tire,scratch:[1]},
    frontLoad:{arm:a.arm},rearLoad:{arm:b.arm},tangent:a.axis,rearTangent:b.axis,
    mass:f(mass/SLUG),dt:f(dt),speedCopy:f(Math.hypot(...feet(velocity))),force:[0,0,0],totalTorque:[0,0,0],
    brakeInput:brake?1:0,brakeCoefficient:175,state844:0,steeringFlag:+((b.active?b.forward:a.forward)>=0),
    brakes:{front:{},rear:{}}};
  if(c.anyContact){accumulateMcmTireForces(c);applyMcmBrakes(c);}
  return {force:c.force.map(x=>x*LBF),torque:c.totalTorque.map(x=>x*LBF*FT),remainingSpeed:c.speedCopy*FT};
}

// The original steering correction precedes tire accumulation. The preview
// maps its bar angle and contact-plane axes onto that helper; applying the
// resulting turn to Cannon's quaternion remains an orientation adapter.
export function mcmPreviewSteering({velocity,axis,referenceAxis,angle,forwardSpeed,dt}){
  const v=feet(velocity);
  const result=updateMcmSteeringVelocity({velocity:v,temporary:[0,0,0],
    a:referenceAxis.map(f),direction:axis.map(f),angle:f(angle),field5d8:f(4.998459815979004),
    field560:f(forwardSpeed/FT),field564:f(Math.hypot(...v)),dt:f(dt),field620:+(forwardSpeed>=0)});
  return {velocity:result.velocity.map(x=>x*FT),turnAngle:result.turnAngle};
}
