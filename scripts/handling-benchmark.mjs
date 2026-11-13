// Deterministic SI measurements of Dust Valley, not original-game telemetry.
// Usage: node scripts/handling-benchmark.mjs > /tmp/handling.json
import {createState,stepBike} from '../src/world.js';
const dt=1/120,flat=()=>createState({sand:false,flat:true,height:()=>0});
const run=(s,input,seconds)=>{for(let i=0;i<Math.round(seconds/dt);i++)stepBike(s,input,dt);};
const round=n=>Math.round(n*1000)/1000;
function acceleration(boost){
 const s=flat(),times={};
 for(let i=0;i<1200;i++){
  stepBike(s,{gas:true,boost},dt);
  for(const target of [30,60,90])if(!times[target]&&s.speed>=target/3.6)times[target]=round((i+1)*dt);
  if(times[90])break;
 }
 return times;
}
function turn(speed){
 const s=flat();run(s,{},1);s.physics.chassis.velocity.z=speed;
 run(s,{gas:true,steer:-1},1);
 return {initialKmh:speed*3.6,headingDegrees:round(s.yaw*180/Math.PI),
   bankDegrees:round(Math.abs(s.roll)*180/Math.PI),exitKmh:round(s.speed*3.6)};
}
const coast=flat();run(coast,{},1);coast.physics.chassis.velocity.z=60/3.6;run(coast,{},3);
const brake=flat();run(brake,{},1);brake.physics.chassis.velocity.z=60/3.6;
let stopSeconds=0;while(brake.speed>.2||stopSeconds===0){stepBike(brake,{brake:true},dt);stopSeconds+=dt;if(stopSeconds>10)break;}
console.log(JSON.stringify({scope:'Dust Valley simulation only; original-game telemetry unavailable',
 timestep:dt,accelerationSeconds:acceleration(false),boostAccelerationSeconds:acceleration(true),
 coastFrom60KmhAfter3s:round(coast.speed*3.6),brakingFrom60Kmh:{seconds:round(stopSeconds),meters:round(brake.z)},
 oneSecondTurns:[turn(15),turn(22)]},null,2));
