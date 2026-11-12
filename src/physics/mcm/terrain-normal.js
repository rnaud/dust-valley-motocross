import {resolveMcmTerrainCell} from './terrain-height.js';
import {sampleMcmTerrain} from './terrain-sample.js';
import {mcmInverseSqrt} from './inverse-sqrt.js';

// Smooth-normal branch of 0x411340 (normalMode == 0). The original's even-cell
// first triangle uses n01, despite the height plane using h11. Preserve it.
export function queryMcmTerrainNormal({root,point,worldToGrid,normal}) {
  if(!root)return [...normal];
  const cell=resolveMcmTerrainCell(point,worldToGrid);
  if(!cell)return [...normal];
  const {ix,iz,d00,d10,d01,d11}=cell,f=Math.fround;
  const n=(dx,dz)=>sampleMcmTerrain(root,ix+dx,iz+dz).normal;
  const n00=n(0,0),n10=n(1,0),n01=n(0,1),n11=n(1,1);
  let sum,lengthSquared;
  if(!((ix^iz)&1)&&d01<=d10) {
    // This branch retains extended products and sums until each final store.
    const w11=1/d11,w00=1/d00,w01=1/d01;
    const raw=n11.map((v,j)=>(v*w11+n00[j]*w00)+n01[j]*w01);
    sum=raw.map(f);
    lengthSquared=f(sum[0]*sum[0]+(sum[1]*sum[1]+raw[2]*sum[2]));
  } else {
    const upper=((ix^iz)&1)&&d11<=d00;
    const a=(upper?n10:n00).map(v=>f(v*(1/(upper?d10:d00))));
    const b=(upper?n11:n10).map(v=>f(v*(1/(upper?d11:d10))));
    const c=n01.map(v=>f(v*(1/d01)));
    sum=a.map((v,j)=>f(f(v+b[j])+c[j]));
    lengthSquared=f((sum[0]*sum[0]+sum[1]*sum[1])+sum[2]*sum[2]);
  }
  const inverse=f(mcmInverseSqrt(lengthSquared));
  return sum.map(v=>f(v*inverse));
}
