import {floatBits,bitsFloat} from './math.js';

// Original 0x49e900: component travel limiting and displacement-derived
// suspension velocity. Transform output assumes an isolated root node.
export function updateMcmSuspensionTravel(c) {
  const f=Math.fround;
  let travel=c.travel,displacement=[...c.displacement],componentDisplacement=[...c.componentDisplacement];
  const limited=+(c.limit<=travel);
  if(limited) {
    componentDisplacement=c.axis.map(v=>f(v*-c.limit));
    displacement=displacement.map(v=>f(v*(c.limit/travel)));
    travel=c.limit;
  }
  const translation=componentDisplacement.map(v=>f(v*f(.6)));
  let dt=c.dt;
  if(floatBits(c.previousHeight)>0x80000000)dt=f((c.height/(c.height-c.previousHeight))*dt);
  const delta=componentDisplacement.map((v,i)=>f(v-c.previousDisplacement[i]));
  const [x,y,z]=componentDisplacement;
  const numerator=delta[2]*z+(delta[1]*y+delta[0]*x);
  const denominator=(z*z+(x*x+y*y))*dt;
  const ratio=numerator/denominator;
  // x87 invalid arithmetic produces negative indefinite before FCHS.
  const velocity=displacement.map(v=>{const product=v*ratio;return f(-(Number.isNaN(product)?bitsFloat(0xffc00000):product));});
  return {travel,displacement,componentDisplacement,velocity,translation,
    previousDisplacement:[...componentDisplacement],previousTravel:travel,
    limited,increasing:+(c.previousTravel<=travel),cacheValid:0};
}
