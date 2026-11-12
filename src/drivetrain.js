// RPM/HP samples decoded from mcm.exe's first curve; interpolation is in torque.
const CURVE=[[0,0],[3000,10],[3250,11.5],[3750,15],[4750,20.5],[5250,24],
  [5750,26],[6750,39],[7250,43],[8250,40.5],[8750,37],[9250,28.5],[10250,25]];
const TORQUE=CURVE.map(([rpm,hp])=>[rpm,rpm?hp*5252/rpm*1.355817948:0]);
// Overall reductions are calibrated for our wheel geometry. The original's
// ratio composition is unresolved; these are explicitly NOT its gearbox ratios.
export const DRIVE=Object.freeze({ratios:Object.freeze([38,25,18,14,11]),
  shiftSeconds:.05,upshiftRpm:7350,downshiftRpm:4200,idleRpm:1200,
  clutchRpm:5750,redlineRpm:10000,efficiency:.92,
  minShiftSpeeds:Object.freeze([22,41,60,76].map(v=>v*.3048))});
export function engineTorque(rpm){
  rpm=Math.max(0,Math.min(10250,rpm));
  for(let i=1;i<TORQUE.length;i++)if(rpm<=TORQUE[i][0]){
    const [x0,y0]=TORQUE[i-1],[x1,y1]=TORQUE[i];return y0+(y1-y0)*(rpm-x0)/(x1-x0);
  }
  return TORQUE.at(-1)[1];
}
export function createDrivetrain(){return {gear:1,rpm:DRIVE.idleRpm,shiftRemaining:0,shiftCooldown:0,load:0,force:0};}
export function stepDrivetrain(engine,{speed,throttle,brake=false,grounded=true,boost=false,radius=.61},dt){
  engine.shiftRemaining=Math.max(0,engine.shiftRemaining-dt);
  engine.shiftCooldown=Math.max(0,engine.shiftCooldown-dt);
  const roadRpm=ratio=>Math.abs(speed)/radius*ratio*60/(2*Math.PI);
  let ratio=DRIVE.ratios[engine.gear-1],coupled=roadRpm(ratio);
  if(grounded&&engine.shiftCooldown===0){
    let next=engine.gear;
    if(throttle>.1&&engine.gear<5&&coupled>DRIVE.upshiftRpm&&speed>DRIVE.minShiftSpeeds[engine.gear-1])next++;
    else if(engine.gear>1&&coupled<DRIVE.downshiftRpm&&roadRpm(DRIVE.ratios[engine.gear-2])<DRIVE.upshiftRpm)next--;
    if(next!==engine.gear){engine.gear=next;engine.shiftRemaining=DRIVE.shiftSeconds;engine.shiftCooldown=.25;
      ratio=DRIVE.ratios[next-1];coupled=roadRpm(ratio);}
  }
  // Launch clutch and free-rev response are adaptations; airborne power never
  // applies chassis thrust. A grounded engine follows wheel speed above clutch RPM.
  const target=grounded?Math.max(DRIVE.idleRpm,coupled,throttle*DRIVE.clutchRpm)
    :DRIVE.idleRpm+throttle*(DRIVE.redlineRpm-DRIVE.idleRpm);
  engine.rpm+=(Math.min(DRIVE.redlineRpm,target)-engine.rpm)*(1-Math.exp(-dt*(grounded?18:5)));
  engine.load=engine.shiftRemaining>0?0:throttle;
  const limiter=coupled>=DRIVE.redlineRpm&&grounded?0:1;
  engine.force=grounded?engineTorque(engine.rpm)*ratio/radius*DRIVE.efficiency*engine.load*limiter*(boost?1.35:1):0;
  // Small throttle-off drag is applied through rear tire grip, never as air thrust.
  engine.engineBrake=grounded&&!brake?(1-throttle)*Math.min(100,Math.abs(speed)*12):0;
  return engine;
}
