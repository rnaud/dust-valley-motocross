// Recovered constants: docs/motocross-madness-reverse-engineering.md.
// This is an SI adaptation, not a port of the original contact/rigid-body solver.
const LBF=4.448221615,FT=.3048;
export const MCM_HANDLING=Object.freeze({
  mass:405*.45359237,maxLean:40*Math.PI/180,leanRate:120*Math.PI/180,
  damping:1.5,traction:.85+.15*.67,
  front:Object.freeze({linear:1000*LBF/FT,cubic:100*LBF/FT**3,velocityLimit:20.6*FT}),
  rear:Object.freeze({linear:600*LBF/FT,cubic:60*LBF/FT**3,velocityLimit:1.6*FT}),
});

// Rate-limit the requested bank, while retaining our physical balance torques.
// The original gates orientation correction; this target filter is our adaptation.
export function advanceLean(current,target,dt){
  const rate=MCM_HANDLING.leanRate*(current*target>0&&Math.abs(target)>Math.abs(current)?.8:1);
  return current+Math.max(-rate*dt,Math.min(rate*dt,target-current));
}

export function suspensionForce({compression,velocity,mass,front,contactFactor=1}){
  const p=front?MCM_HANDLING.front:MCM_HANDLING.rear;
  const k=p.linear+p.cubic*compression*compression;
  let damping=2*MCM_HANDLING.damping*Math.sqrt(mass*.5*k);
  const speed=Math.abs(velocity);
  if(speed>p.velocityLimit)damping*=(p.velocityLimit+.5*(speed-p.velocityLimit))/speed;
  // A tire cannot pull on terrain. The force ceiling is our solver safeguard.
  return Math.max(0,Math.min(30000,k*compression*contactFactor-damping*velocity));
}
