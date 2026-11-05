// Reduced single-track tire model. Forces are in N, speeds in m/s, angles in radians.
// Grip is a tunable game surface, not a measured motocross tire data set.
export function tireForces({longSpeed,sideSpeed,load,drive=0,brake=0,camber=0,front=false,dt=1/120}) {
  if(load<=0)return {longitudinal:0,lateral:0,slipAngle:0,usage:0};
  const slipAngle=Math.atan2(sideSpeed,Math.max(2,Math.abs(longSpeed)));
  const longitudinalLimit=load*2.4,lateralLimit=load*1.65;
  // Limit braking at low speeds so the force cannot repeatedly reverse velocity.
  const braking=Math.min(brake,Math.abs(longSpeed)*75/dt);
  const requestedLongitudinal=drive-Math.sign(longSpeed)*braking;
  const requestedLateral=-load*(front?18:20)*slipAngle-load*.45*camber;
  // Combined slip shares the friction ellipse instead of allowing throttle to
  // consume all rear cornering grip. Excess demand produces progressive slip.
  const demand=Math.hypot(requestedLongitudinal/longitudinalLimit,requestedLateral/lateralLimit);
  const scale=1/Math.max(1,demand);
  const longitudinal=requestedLongitudinal*scale,lateral=requestedLateral*scale;
  return {longitudinal,lateral,slipAngle,usage:Math.min(1,demand)};
}
