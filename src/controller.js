// Reduced-model notes adapted from the Bike Lab controller:
// s = b + (b - t) * k + d, where b is the balance steer for the current lean,
// t is the balance steer for the requested lean and d works on steer, not on
// the chassis. All values are radians / seconds in the game's SI units.
export const WHEELBASE=2.15;
export const GRAVITY=9.81;

export function getBalanceSteer(speed,lean,wheelbase=WHEELBASE){
  const v2=Math.max(4,speed*speed);
  return -Math.atan(wheelbase*GRAVITY*Math.tan(lean)/v2);
}

export function getSteerCommand({speed,lean,targetLean,rollRate=0,wheelbase=WHEELBASE,assistGain=1.7,damper=.05}){
  const b=getBalanceSteer(speed,lean,wheelbase);
  const t=getBalanceSteer(speed,targetLean,wheelbase);
  return b*assistGain+(b-t)*.18-rollRate*damper;
}

// Braking is clamped toward the safe-brake limit as bank increases, so a
// fully leaned tire is not asked for a straight-line stop.
export function getSafeBrakeFactor(lean){return 1-Math.min(.55,Math.abs(lean)*.42);}
