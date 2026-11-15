import {queryMcmTerrainHeight} from './terrain-height.js';
import {floatBits} from './math.js';
const f=Math.fround;
// Original 0x47d71f..0x47d945, with the original recovered terrain query.
export function applyMcmChaseClearance(camera,{eye,terrain,worldMode,worldEnabled,worldScale,sceneName}){
 const result=Float32Array.from(eye),special=(worldMode&0xffff)===3&&worldEnabled!==0;
 if(special){
  const lower=worldScale*3,upper=worldScale*253;
  if(lower>result[0])result[0]=f(lower);else if(!(upper>=result[0]))result[0]=f(upper);
  if(f(lower)>result[2])result[2]=f(lower);else if(!(upper>=result[2]))result[2]=f(upper);
 }
 const ground=queryMcmTerrainHeight({...terrain,point:[...result]})[1],raised=ground+3.5;
 if(raised>result[1]){
  if(floatBits(camera.pitch)>0x80000000)camera.pitch=f((f(raised)-result[1])/camera.radius+camera.pitch);
  result[1]=f(raised);
 }else if(special){
  const name=sceneName.replace(/[A-Z]/g,c=>c.toLowerCase());let cap;
  if(name==='pyrmid01')cap=200;
  else if(name==='stddom01'||name==='excav01')cap=120;
  else{
   const lower=worldScale*50,upper=worldScale*206;
   const outsideX=lower>result[0]||!(upper>=result[0]);
   const outsideZ=f(lower)>result[2]||!((lower>result[0]?upper:f(upper))>=result[2]);
   cap=outsideX&&outsideZ?60:90;
  }
  if((floatBits(result[1])|0)>(floatBits(cap)|0))result[1]=cap;
 }
 return {eye:result,special:special?1:0,ground};
}
