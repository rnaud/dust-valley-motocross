import {resolveMcmTerrainCell} from './terrain-height.js';
import {sampleMcmTerrain} from './terrain-sample.js';
import {mcmInverseSqrt} from './inverse-sqrt.js';

// Geometric normal branch of 0x411340; 0x401820 normalizes through a stored
// length (1 / inverseSqrt), then reciprocates that rounded length again.
export function queryMcmTerrainFaceNormal({root,point,worldToGrid,heightScale,normal}) {
  if(!root)return [...normal];
  const cell=resolveMcmTerrainCell(point,worldToGrid);
  if(!cell)return [...normal];
  const {ix,iz,d00,d10,d01,d11}=cell,f=Math.fround;
  const p=(dx,dz)=>[f(ix+dx),f(sampleMcmTerrain(root,ix+dx,iz+dz).height*heightScale),f(iz+dz)];
  const p00=p(0,0),p10=p(1,0),p01=p(0,1),p11=p(1,1);
  const [a,b,c]=((ix^iz)&1)
    ?d11>d00?[p00,p10,p01]:[p10,p11,p01]
    :d01>d10?[p00,p10,p11]:[p00,p11,p01];
  const u=b.map((v,j)=>f(v-a[j])),v=c.map((v,j)=>f(v-a[j]));
  let n=[f(u[1]*v[2]-u[2]*v[1]),f(u[2]*v[0]-u[0]*v[2]),f(u[0]*v[1]-u[1]*v[0])];
  const squared=(n[0]*n[0]+n[1]*n[1])+n[2]*n[2];
  const length=squared===0?0:f(1/mcmInverseSqrt(f(squared)));
  if(length!==0){const inverse=1/length;n=n.map(v=>f(v*inverse));}
  if(n[1]<0)n=n.map(v=>-v);
  return n;
}
