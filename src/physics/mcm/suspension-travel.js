import {floatBits} from './math.js';
import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';

// Original 0x49e900: component travel limiting and displacement-derived
// suspension velocity. Transform output assumes an isolated root node.
export function updateMcmSuspensionTravel(c) {
  const f=Math.fround;
  let travel=c.travel,displacement=[...c.displacement],componentDisplacement=[...c.componentDisplacement];
  const limited=+(!(c.limit>travel));
  if(limited) {
    componentDisplacement=c.axis.map(v=>f(mul(v,-c.limit)));
    displacement=displacement.map(v=>f(mul(v,div(c.limit,travel))));
    travel=c.limit;
  }
  const translation=componentDisplacement.map(v=>f(mul(v,f(.6))));
  let dt=c.dt;
  if(floatBits(c.previousHeight)>0x80000000)dt=f(mul(div(c.height,sub(c.height,c.previousHeight)),dt));
  const delta=componentDisplacement.map((v,i)=>f(sub(v,c.previousDisplacement[i])));
  const [x,y,z]=componentDisplacement;
  const numerator=add(mul(delta[2],z),add(mul(delta[1],y),mul(delta[0],x)));
  const denominator=mul(add(mul(z,z),add(mul(x,x),mul(y,y))),dt);
  const ratio=div(numerator,denominator);
  // x87 invalid arithmetic produces negative indefinite before FCHS.
  const velocity=displacement.map(v=>{return f(-mul(v,ratio));});
  return {travel,displacement,componentDisplacement,velocity,translation,
    previousDisplacement:[...componentDisplacement],previousTravel:travel,
    limited,increasing:+(!(c.previousTravel>travel)),cacheValid:0};
}
