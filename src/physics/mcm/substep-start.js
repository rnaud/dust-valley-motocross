import {floatBits} from './math.js';
import {updateMcmDigitalThrottleUnchecked as updateMcmDigitalThrottle} from './throttle.js';
import {updateMcmGears} from './gears.js';
import {queryMcmBikeInput} from './bike-input.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
const f=Math.fround;
const filter=(state,target,dt)=>f(add(state.value,mul(sub(target,state.value),div(Math.min(state.duration,dt),state.duration))));

// Original normal-state brake ramp; one increment per engine substep.
export function updateMcmBrakeInput(brake,pressed){
 if(pressed)return (floatBits(brake)|0)<0x3f800000?Math.min(1,f(brake+f(.2))):brake;
 return (floatBits(brake)|0)>0?Math.max(0,f(brake-.5)):brake;
}

// Original 0x4a5bd7..0x4a5e27, including real engine update ordering.
export function updateMcmSubstepStart(c){
 const {engine}=c,queries=[];
 const query=action=>{
  const result=queryMcmBikeInput({...c.input,responses:action===5?c.input.brakeResponses:c.input.throttleResponses,action,engineLevel:engine.state,brake:c.brake});
  for(const device of result.polled)queries.push({action,device});
  return result.value;
 };
 if(floatBits(engine.shiftTimer)&0x7fffffff){
  engine.shiftTimer=f(engine.shiftTimer-c.dt);
  if(floatBits(engine.shiftTimer)>0x80000000)engine.shiftTimer=0;
 }
 if(!c.state844){
  const braking=query(5)||c.aiBrake>0;
  if(braking)engine.released=1;
  c.brake=updateMcmBrakeInput(c.brake,braking);
 }else if(!c.rider13c&&!c.rider140){
  c.field694=f(-c.field684);c.mass=c.alternateMass;c.inverseMass=c.alternateInverseMass;
 }
 if(c.analog===-1){
  Object.assign(engine,updateMcmDigitalThrottle({...engine,pressed:!c.state844&&query(4),aiDemand:c.aiThrottle,dt:c.dt}));
 }else{
  engine.analogFilter.value=filter(engine.analogFilter,c.analog,c.dt);
  engine.state=engine.analogFilter.value;
  if((floatBits(engine.state)|0)<0x3e4ccccd)engine.state=0;
  if((floatBits(engine.state)|0)>=0x3f800000)engine.state=1;
  engine.released=+!(c.analog>.05);engine.rpmDemand=f(engine.maxRpm*engine.state);
 }
 // Automatic shifts use the previous saved speed, before the refresh below.
 const gears=updateMcmGears({...engine,speed:c.previousSpeed});Object.assign(engine,gears);
 c.previousSpeed=c.speed;
 const acceleration=f(mul(sub(c.velocity[1],c.previousY),c.inverseDt));
 c.accelerationFilter.value=filter(c.accelerationFilter,acceleration,c.dt);
 c.filteredAcceleration=c.accelerationFilter.value;c.previousY=c.velocity[1];
 if((floatBits(c.previousSpeed)|0)<0x3a83126f||!Number.isFinite(c.previousSpeed)){
  c.previousSpeed=0;c.velocity=[0,0,0];
 }
 return {queries,randomCalls:+gears.randomUsed};
}
