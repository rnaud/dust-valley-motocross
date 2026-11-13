import {evaluateResetNextReset} from './reset-next-reset-case.mjs';
import {prepareMcmFrameTerrain} from '../../src/physics/mcm/frame-terrain-entry.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function evaluateResetNextTerrain(input){
 let words=Array(161).fill(0),terrainQueries=0;
 const result=evaluateResetNextReset(input,(c,decision)=>{
  const b=c.bike,e=c.frameEntry,p=c.contactPhase;
  terrainQueries=prepareMcmFrameTerrain(c,decision.code).queries;
  words=[1,terrainQueries,e.control1c,e.control30,e.control2c,b.field8c4,e.iterations>>>0,floatBits(b.field4d8),decision.code];
  if(terrainQueries){for(const v of [...p.chassisWorld,...p.chassisSurface,...p.chassisNormals])words.push(...Array.from(v,floatBits));words.push(...Array.from(p.chassisDepth,floatBits));}else words.push(...Array(20).fill(0));
  for(const n of c.bounds.components)words.push(...Array.from(n.local,floatBits),...Array.from(n.world,floatBits),n.cacheValid);
 });
 return {...result,tail:[...result.tail,...words],terrainQueries};
}
