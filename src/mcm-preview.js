import config from './physics/mcm/preview-engine.json' with {type:'json'};
import {updateMcmDigitalThrottle} from './physics/mcm/throttle.js';
import {updateMcmGears} from './physics/mcm/gears.js';
import {calculateMcmDriveForce} from './physics/mcm/drive-force.js';
import {calculateMcmSuspension} from './physics/mcm/suspension.js';
const f=Math.fround,FT=.3048,LBF=4.448221615;
export function createMcmPreviewEngine(){
  return {gear:1,rpm:0,force:0,engineBrake:0,load:0,recovered:{gear:0,state:0,released:0,rpmDemand:0,previousRpmDemand:0,shiftThreshold:7000,shiftTimer:0,randomState:12345}};
}
// The helpers and tables are recovered. Feeding chassis speed into the engine,
// timer scheduling, SI conversion and contact-force application are preview glue.
export function stepMcmPreviewEngine(engine,{speed,pressed,grounded},dt){
  const e=engine.recovered;
  e.shiftTimer=f(Math.max(0,e.shiftTimer-f(dt)));
  Object.assign(e,updateMcmDigitalThrottle({...e,pressed,dt:f(dt),maxRpm:config.maxRpm}));
  const nextRandom=(Math.imul(e.randomState,214013)+2531011)>>>0;
  const shift=updateMcmGears({...config,...e,speed:f(speed/FT),randomValue:(nextRandom>>>16)&32767});
  Object.assign(e,shift);if(shift.randomUsed)e.randomState=nextRandom;
  const drive=calculateMcmDriveForce({...config,...e,speed:f(speed/FT),direction:[0,0,1],gearRatio:config.ratios[e.gear]});
  engine.gear=e.gear+1;engine.rpm=e.rpmDemand;engine.load=e.state;
  engine.force=grounded?drive.scalar*LBF:0;engine.engineBrake=0;
  return engine;
}
export function mcmPreviewSuspension({compression,velocity,mass,front,contactFactor=1}){
  const c=f(compression/FT),v=f(velocity/FT);
  const r=calculateMcmSuspension({displacement:[0,c,0],velocity:[0,v,0],compression:c,
    linearStiffness:front?1000:600,cubicStiffness:front?100:60,dampingMultiplier:1.5,
    velocityLimit:f(front?20.6:1.6),massShare:.5,extraStiffness:0,mass:f(mass/14.59390294)});
  // Ray projection, unilateral contact and solver ceiling belong to Cannon glue.
  return Math.max(0,Math.min(30000,r.force[1]*LBF*contactFactor));
}
