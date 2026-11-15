import {mcmSqrtLookup,bitsFloat} from './math.js';
import {mcmSubtract as sub,mcmMultiply as mul,mcmAdd as add} from './x87-arithmetic.js';
const f=Math.fround;
// Pair preparation only: player 46df56..46e060, actor lists
// 46e0a9..46e1ac and 46e214..46e317. Eligibility and steering are external.
// Inactive records preserve both angle slots exactly as the original does.
export function writeMcmAiAvoidanceRecord(record,{self,other,radius,player=false}){
 const dx=sub(other.x,self.x),dy=sub(other.y,self.y),dz=sub(other.z,self.z);
 const vx=sub(other.vx,self.vx),vy=sub(other.vy,self.vy),vz=sub(other.vz,self.vz);
 const squared=f(add(add(mul(dx,dx),mul(dy,dy)),mul(dz,dz)));
 const relative=f(add(add(add(mul(vz,vz),mul(vx,vx)),mul(vy,vy)),1));
 record.distance=squared;record.relativeSpeedSquaredPlusOne=relative;
 record.active=mul(radius,radius)>squared||relative>squared||(player&&(Number.isNaN(squared)||Number.isNaN(relative)))?1:0;
 if(record.active){
  record.distance=mcmSqrtLookup(squared);
  record.heading=f(Math.atan2(dx,dz));
  const inside=radius>record.distance||(!player&&(Number.isNaN(radius)||Number.isNaN(record.distance)));
  record.halfAngle=inside?bitsFloat(0x3f85e841):f(Math.abs(Math.atan2(radius,record.distance)));
 }
 return record;
}
