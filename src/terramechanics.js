// Tire–soil interaction on deformable sand.
//
// Sinkage and compaction resistance follow Bekker's pressure–sinkage law
// p = (kc/b + kφ) zⁿ and its closed form for a rolling wheel (Bekker 1969,
// Wong, Theory of Ground Vehicles / Terramechanics and Off-Road Vehicle
// Engineering). Soil constants for dry sand are Wong's Land Locomotion Lab
// values (n = 1.1, kc = 0.99 kN/m^(n+1), kφ = 1528.43 kN/m^(n+2)).
//
// Traction uses the Brixius (1987) cone-index equations, the WES/ASAE family
// of empirical sand-traction models: a mobility number Bn from cone index,
// tire size and load gives gross traction GT/W and motion resistance MR/W.
// (Mason et al. 2018 is a later unified equation of this family; its exact
// constants were not verified here, so Brixius is used.)
//
// Slip sinkage is a linear slip-dig term (wheelspin digs in), a common
// simplification of Lyasko's slip-sinkage relation.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export const DRY_SAND=Object.freeze({n:1.1,kc:990,kphi:1528430});

// Static sinkage z0 (m) of a wheel of width b and diameter D under load W (N).
export function bekkerSinkage(W,b,D,{n,kc,kphi}=DRY_SAND){
 if(!(W>0))return 0;
 return Math.pow(3*W/((3-n)*(kc+b*kphi)*Math.sqrt(D)),2/(2*n+1));
}
// Compaction (motion) resistance (N) for sinkage z.
export function compactionResistance(z,b,{n,kc,kphi}=DRY_SAND){
 return z>0?(kc+b*kphi)*Math.pow(z,n+1)/(n+1):0;
}
// Brixius mobility number; CI cone index (Pa), deflection δ/h of the tire.
export function mobilityNumber(CI,b,d,W,deflection=.15){
 return W>0?(CI*b*d/W)*(1+5*deflection)/(1+3*b/d):Infinity;
}
// Gross traction coefficient GT/W at slip s (0..1).
export function grossTraction(Bn,s){return .88*(1-Math.exp(-.1*Bn))*(1-Math.exp(-7.5*Math.abs(s)))+.04;}
// Motion resistance coefficient MR/W at slip s.
export function motionResistance(Bn,s){return 1/Bn+.04+.5*Math.abs(s)/Math.sqrt(Bn);}

// Everything the bike needs for one tire on sand.
// tire: {b,D}; soil: {n,kc,kphi,CI,slipSink,gripAssist}; slip: longitudinal slip ratio.
export function tireOnSand(load,slip,tire,soil){
 if(!(load>0))return {sinkage:0,resistance:0,tractionLimit:0,Bn:Infinity};
 const z0=bekkerSinkage(load,tire.b,tire.D,soil),sinkage=z0*(1+(soil.slipSink??1.6)*clamp(slip,0,1));
 const Bn=mobilityNumber(soil.CI,tire.b,tire.D,load);
 // Peak gross traction (fully developed slip); the tire model shapes slip.
 const tractionLimit=load*grossTraction(Bn,1)*(soil.gripAssist??1);
 return {sinkage,resistance:compactionResistance(sinkage,tire.b,soil),tractionLimit,Bn};
}
