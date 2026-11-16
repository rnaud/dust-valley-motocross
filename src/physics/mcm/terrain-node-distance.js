import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
import {mcmSqrtLookup,floatBits} from './math.js';
import {mcmFtolLowWord} from './x87-integer.js';
const f=Math.fround,less=(a,b)=>Number.isNaN(a)||Number.isNaN(b)||a<b;
// Original 48ca70. Preserve the original inside-interval far-distance formula
// (squared bound coordinates), store rounding, signed heights and range caps.
export function measureMcmTerrainNode(node,owner){
 const n=o=>node.getFloat32(o,true),p=o=>owner.getFloat32(o,true),put=(o,v)=>node.setInt32(o,v,true);
 owner.setUint32(0x90,(owner.getUint32(0x90,true)+1)>>>0,true);
 node.setUint32(0x190,node.getUint32(0x188,true),true);node.setUint32(0x194,node.getUint32(0x18c,true),true);
 const axis=(position,low,high)=>{
  const rawLow=sub(position,low),dl=f(rawLow),rawHigh=sub(position,high);
  if(less(rawLow,0))return[f(mul(dl,dl)),f(mul(rawHigh,rawHigh))];
  const dh=f(rawHigh);if(rawHigh>0)return[f(mul(dh,dh)),f(mul(dl,dl))];
  const bound=less(mul(position,2),add(low,high))?high:low;return[0,f(mul(bound,bound))];
 };
 const x=axis(p(0x48),n(0x1dc),n(0x1e4)),z=axis(p(0x50),n(0x1e0),n(0x1e8));
 const nearSquared=f(add(z[0],x[0])),farSquared=f(add(z[1],x[1]));
 let delta=sub(p(0x4c),node.getInt32(0x14,true));if(!less(delta,0)){delta=sub(p(0x4c),node.getInt32(0x18,true));if(!(delta>0))delta=0;}delta=f(delta);
 let verticalSquared=f(mul(delta,delta));
 const scaled=v=>Math.min(mcmFtolLowWord(mul(mul(v,p(0x5c)),n(0x208))),65535);
 const mode=owner.getUint32(0x54,true),special=!mode||!(floatBits(nearSquared)&0x7fffffff)||!(floatBits(farSquared)&0x7fffffff);
 if(special){
  put(0x18c,mode?65535:0);const selected=less(verticalSquared,nearSquared)?mcmSqrtLookup(nearSquared):verticalSquared>farSquared?mcmSqrtLookup(farSquared):delta;
  put(0x188,scaled(add(div(verticalSquared,selected),selected)));
 }else{
  const near=mcmSqrtLookup(nearSquared),far=mcmSqrtLookup(farSquared),selected=less(verticalSquared,nearSquared)?near:verticalSquared>farSquared?far:delta;
  put(0x188,scaled(add(div(verticalSquared,selected),selected)));
  let low=f(sub(p(0x4c),node.getInt32(0x14,true))),high=f(sub(p(0x4c),node.getInt32(0x18,true)));if(less(low,0))low=-low;if(less(high,0))high=-high;
  const maximum=less(low,high)?high:low,rawSquare=mul(maximum,f(maximum));verticalSquared=f(rawSquare);
  const farValue=div(add(rawSquare,farSquared),far),nearValue=div(add(verticalSquared,nearSquared),near);
  put(0x18c,scaled(less(nearValue,farValue)?farValue:nearValue));
 }
 return add(verticalSquared,nearSquared);
}
