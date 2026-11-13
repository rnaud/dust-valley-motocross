import {resolveMcmWorldMatrix} from './world-transform.js';
import {transformMcmPoint} from './position-transform.js';
import {queryMcmTerrainHeight} from './terrain-height.js';
import {queryMcmTerrainNormal} from './terrain-normal.js';
import {updateMcmContactGeometrySubstep} from './contact-geometry.js';
import {mcmSubtract as sub} from './x87-arithmetic.js';
const f=Math.fround;

// Original 0x4a69e8..0x4a6c01. Compare penetration before its float32 store.
// Skipped probes preserve stack scratch and incoming contact controls.
export function queryMcmChassisProbes(c){
 if(!c.state844 && (c.control20!==1 || !(Math.abs(c.roll)>f(.2618) || Math.abs(c.pitch)>f(1.05))))return;
 const probe=(local,node,index)=>{
  const world=transformMcmPoint(resolveMcmWorldMatrix(node),local);
  const normal=queryMcmTerrainNormal({...c.terrain,point:world,normal:c.chassisNormals[index]});
  const surface=queryMcmTerrainHeight({...c.terrain,point:world});
  c.chassisWorld[index]=world;c.chassisSurface[index]=surface;c.chassisNormals[index]=normal;
  const depth=sub(surface[1],world[1]);c.chassisDepth[index]=f(depth);return depth;
 };
 if(probe(c.chassisLocal[0],c.frontMountNode,0)>=0)c.control1c=1;
 else if(probe(c.chassisLocal[1],c.frontMountNode,0)>=0)c.control1c=2;
 c.control30=+(probe(c.chassisLocal[2],c.bodyNode,1)>=f(-.3));
 c.control2c=+(!!c.control1c || !!c.control30);
}
export function updateMcmChassisProbesSubstep(c){
 const result=updateMcmContactGeometrySubstep(c);queryMcmChassisProbes(c);return result;
}
