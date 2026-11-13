import {calculateMcmTireForce} from './physics/mcm/tire-force.js';
import {accumulateMcmTireForces} from './physics/mcm/tire-accumulation-substep.js';
import {updateMcmRearTire} from './physics/mcm/rear-tire-substep.js';
import {applyMcmBrakes} from './physics/mcm/braking-substep.js';
import {updateMcmSteeringVelocity} from './physics/mcm/steering-velocity.js';

const f=Math.fround,FT=.3048,LBF=4.448221615,SLUG=14.59390294;
const feet=v=>v.map(x=>f(x/FT));
// PDM local-bike coefficients: +5b0=6, +5b4=float32(.15), +5e8=175.
// The preview supplies world-space contact velocities, axes, arms and loads.
// Full original contact preparation remains upstream.
export function mcmPreviewContactForces({front,rear,velocity,mass,dt,brake=false,drive=0,
  acceleration=[0,0,0],rearShare=.5,bikeForward=[0,0,1],roll=0,
  bodyMatrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}){
  const contact=(wheel,isRear)=>{
    if(!wheel)return {active:false,axis:[0,0,1],arm:[0,0,0],motion:{speed:0,forwardMagnitude:0,direction:[0,0,0],normalLoad:0},tire:{force:[0,0,0],magnitude:0},forward:0};
    const v=feet(wheel.velocity),speed=f(Math.hypot(...v));
    const axis=wheel.axis.map(f),forward=f(v.reduce((sum,x,i)=>sum+x*axis[i],0));
    const direction=speed>0?v.map(x=>f(x/speed)):[0,0,0];
    const tire=!isRear&&speed>f(.001)?calculateMcmTireForce({axis,direction,load:f(wheel.load/LBF),
      coefficient5b0:6,coefficient5b4:f(.15),rear:isRear}):{force:[0,0,0],magnitude:0};
    return {active:true,axis,arm:feet(wheel.arm),motion:{speed,forwardMagnitude:f(Math.abs(forward)),direction,normalLoad:f(wheel.load/LBF)},tire,forward};
  };
  const a=contact(front,false),b=contact(rear,true);
  Object.assign(a.tire,{coefficient5b0:6,coefficient5b4:f(.15)});
  // PDM +6d0 gain and +6d4 threshold; the scratch scale starts at one each substep.
  const traction={tire:b.tire,scratch:[1,...Array(11).fill(0)],maxSpeed:45,gain:f(.9505),
    acceleration:feet(acceleration),inverseMass:f(1/f(mass/SLUG)),rollCos:f(Math.cos(roll))};
  const points=Array.from({length:10},()=>[0,0,0]);points[6]=a.arm;points[7]=b.arm;
  const c={anyContact:a.active||b.active,bothContact:a.active&&b.active,frontContact:a.active,rearContact:b.active,
    frontMotion:a.motion,rearMotion:b.motion,frontTire:a.tire,traction,
    frontLoad:{arm:a.arm,scratch354:b.active?b.axis.map(x=>f(x*f(drive/LBF))):[0,0,0]},rearLoad:{arm:b.arm},tangent:a.axis,rearTangent:b.axis,
    mass:f(mass/SLUG),dt:f(dt),speedCopy:f(Math.hypot(...feet(velocity))),force:[0,0,0],totalTorque:[0,0,0],
    brakeInput:brake?1:0,brakeCoefficient:175,state844:0,steeringFlag:+((b.active?b.forward:a.forward)>=0),
    brakes:{front:{},rear:{}},rearSuspension:{},frontWeight:f(rearShare),bikeForward:bikeForward.map(f),
    driveScalar:b.active?f(drive/LBF):0,points,bodyPosition:[0,0,0],bodyNode:{world:bodyMatrix.map(f),cacheValid:1}};
  if(c.anyContact){updateMcmRearTire(c);accumulateMcmTireForces(c);applyMcmBrakes(c);}
  return {force:c.force.map(x=>x*LBF),torque:c.totalTorque.map(x=>x*LBF*FT),remainingSpeed:c.speedCopy*FT,driveForce:c.frontLoad.scratch354.map(x=>x*LBF),rearTractionScale:c.traction.scratch[0]};
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
