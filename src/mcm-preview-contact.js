import {calculateMcmTireForce} from './physics/mcm/tire-force.js';
import {limitMcmContactForce} from './physics/mcm/contact-force-limit.js';

const f=Math.fround,FT=.3048,LBF=4.448221615,SLUG=14.59390294;
// PDM local bike in the pinned live replay: +5b0=6, +5b4=float32(.15),
// +5e8=175. Contact loads, wheel velocities and mass shares come from the
// preview's Cannon adapter; they are not the recovered whole-bike contact state.
export function mcmPreviewTireForces({longSpeed,sideSpeed,load,drive=0,brake=0,front=false,dt,mass}){
  if(load<=0)return {longitudinal:0,lateral:0,slipAngle:0,usage:0};
  const velocity=[f(sideSpeed/FT),0,f(longSpeed/FT)];
  const speed=f(Math.hypot(...velocity));
  const direction=speed>0?velocity.map(v=>f(v/speed)):[0,0,0];
  const tire=speed>0?calculateMcmTireForce({axis:[0,0,1],direction,load:f(load/LBF),
    coefficient5b0:6,coefficient5b4:f(.15),rear:!front}):{force:[0,0,0],magnitude:0};
  const limited=limitMcmContactForce({mass:f(mass/SLUG),dt:f(dt),remaining:speed,
    requested:speed,magnitude:tire.magnitude,force:tire.force});
  // Consume the friction budget before braking, as the recovered contact path
  // does. Each preview wheel has an allocated mass share; the full original
  // solver instead shares one budget across both contacts and their torques.
  const brakeMagnitude=f(brake?175:0);
  const braking=limitMcmContactForce({mass:f(mass/SLUG),dt:f(dt),remaining:limited.remaining,
    requested:f(Math.abs(velocity[2])),magnitude:brakeMagnitude,
    force:[0,0,f(-Math.sign(longSpeed)*brakeMagnitude)]});
  return {longitudinal:drive+(limited.force[2]+braking.force[2])*LBF,
    lateral:limited.force[0]*LBF,slipAngle:Math.atan2(sideSpeed,Math.abs(longSpeed)),
    usage:tire.magnitude>0?limited.magnitude/tire.magnitude:0};
}
