import {sampleMcmTerrain} from './terrain-sample.js';

const f=Math.fround;
function nearestEven(value) {
  const low=Math.floor(value),fraction=value-low;
  return fraction<.5?low:fraction>.5?low+1:low%2===0?low:low+1;
}

// Original 0x411340, with the optional normal output disabled. Inputs are
// float32 world coordinates; heightScale is terrain+40, worldToGrid is +a04.
// Preserve the x87 cell rounding and stored squared-distance comparisons:
// replacing either with floor / a simple diagonal test changes boundary cases.
export function queryMcmTerrainHeight({root,point,heightScale,worldToGrid}) {
  const result=[...point];
  if(!root)return result;
  const x=Math.max(0,f(point[0]*worldToGrid)),z=Math.max(0,f(point[2]*worldToGrid));
  const ix=nearestEven(f(x-.5)),iz=nearestEven(f(z-.5));
  if(!Number.isFinite(ix)||!Number.isFinite(iz)||ix<0||iz<0||ix>0x7fffffff||iz>0x7fffffff)return result;
  const h=(dx,dz)=>f(sampleMcmTerrain(root,ix+dx,iz+dz).height*heightScale);
  const h00=h(0,0),h10=h(1,0),h01=h(0,1),h11=h(1,1);
  const tx=f(x-f(ix)),tz=f(z-f(iz)),x2=tx*tx,z2=f((z-f(iz))*tz);
  const sx=(1-tx)*f(1-tx),sz=(1-tz)*f(1-tz),minimum=f(.001);
  const d00=f(Math.max(minimum,x2+z2)),d10=f(Math.max(minimum,sx+z2));
  const d01=f(Math.max(minimum,sz+f(x2))),d11=f(Math.max(minimum,f(sz)+f(sx)));
  const dx=x-ix,dz=z-iz;
  if((ix^iz)&1)result[1]=d11>d00
    ?f(((h10-h00)*dx+h00)+(h01-h00)*dz)
    :f(((h11-h01)*dx+h01)+(h10-h11)*(1-dz));
  else result[1]=d01>d10
    ?f(((h10-h00)*dx+h00)+(h11-h10)*dz)
    :f(((h11-h01)*dx+h01)+(h00-h01)*(1-dz));
  return result;
}
