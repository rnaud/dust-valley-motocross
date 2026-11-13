import {resolveMcmWorldMatrix} from './world-transform.js';
import {transformMcmPoint} from './position-transform.js';
import {queryMcmTerrainHeight} from './terrain-height.js';
import {queryMcmTerrainNormal} from './terrain-normal.js';
import {mcmSubtract as sub} from './x87-arithmetic.js';
const f=Math.fround;
// Original 0x4a599f..0x4a5bc5, before the next loop's iteration gate.
export function prepareMcmFrameTerrain(c,resetCode){
 const b=c.bike,e=c.frameEntry,p=c.contactPhase;
 let queries=0;
 if(!resetCode&&!b.field844&&e.iterations!==1&&Math.abs(b.field4d8)>f(.2618)){
  const probe=(index,slot,node)=>{
   const world=transformMcmPoint(resolveMcmWorldMatrix(node),p.chassisLocal[index]);
   const normal=queryMcmTerrainNormal({...c.terrain,point:world,normal:p.chassisNormals[slot]});
   const surface=queryMcmTerrainHeight({...c.terrain,point:world});
   const depth=sub(surface[1],world[1]);
   p.chassisWorld[slot]=world;p.chassisSurface[slot]=surface;p.chassisNormals[slot]=normal;p.chassisDepth[slot]=f(depth);queries++;
   return depth;
  };
  if(probe(0,0,p.frontMountNode)>=0)e.control1c=1;
  else if(probe(1,0,p.frontMountNode)>=0)e.control1c=2;
  e.control30=+(probe(2,1,c.bodyNode)>=f(-.3));e.control2c=+(!!e.control1c||!!e.control30);
 }
 b.field8c4=0;
 return {queries};
}
