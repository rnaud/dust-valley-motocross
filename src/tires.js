// Reduced single-track tire model. Forces are in N, speeds in m/s, angles in radians.
// Grip is a tunable game surface, not a measured motocross tire data set.
export function tireForces({longSpeed,sideSpeed,load,drive=0,brake=0,camber=0,front=false,dt=1/120}) {
  if(load<=0)return {longitudinal:0,lateral:0,slipAngle:0,usage:0};
  const slipAngle=Math.atan2(sideSpeed,Math.max(2,Math.abs(longSpeed)));
  const longitudinalLimit=load*2.4,lateralLimit=load*1.72;
  // Limit braking at low speeds so the force cannot repeatedly reverse velocity.
  const braking=Math.min(brake,Math.abs(longSpeed)*75/dt);
  const requestedLongitudinal=drive-Math.sign(longSpeed)*braking;
  // Pacejka-style lateral curve: builds to a peak and then falls away instead
  // of clamping at a linear force. B/C/D/E are game-tuned, not a tire dataset.
  const B=front?13.5:14.5,C=1.5,D=lateralLimit,E=.9,bx=B*slipAngle;
  const lateralCurve=-D*Math.sin(C*Math.atan(bx-E*(bx-Math.atan(bx))));
  const requestedLateral=lateralCurve-load*.32*camber;
  // Combined slip shares the friction ellipse instead of allowing throttle to
  // consume all rear cornering grip. Excess demand produces progressive slip.
  const demand=Math.hypot(requestedLongitudinal/longitudinalLimit,requestedLateral/lateralLimit);
  const scale=1/Math.max(1,demand);
  const longitudinal=requestedLongitudinal*scale,lateral=requestedLateral*scale;
  return {longitudinal,lateral,slipAngle,usage:Math.min(1,demand)};
}
