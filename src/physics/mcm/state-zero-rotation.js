import {floatBits} from './math.js';
import {mcmInverseSqrtLookup} from './inverse-sqrt.js';
import {rotateMcmTransformAtPivot} from './transform.js';
import {updateMcmStateZeroControl} from './state-zero-control.js';

// Original 0x4abef9..0x4ac17b: timer/phase state and normalized control rotation.
export function updateMcmStateZeroRotation(c){
 const f=Math.fround;
 let timer=f(c.timer+c.dt),previousSign=c.previousSign,accumulator=c.accumulator,phase=c.phase|0;
 const angularVelocity=new Float64Array(c.angularVelocity);
 if(phase>=1&&phase<=2){
  const sign=floatBits(c.field4d8)>0x80000000?-1:1;
  const cap=f(((timer*timer)*timer)*f(.357792466878891));
  const rawAmount=Math.abs(c.field4d8*c.field48);
  const amount=f(rawAmount>cap?cap:rawAmount);
  angularVelocity[2]=f(sign*amount+accumulator);
  accumulator=f(accumulator*f(.9));
  if(!Number.isNaN(previousSign)&&previousSign!==sign){phase=phase+1>2?1:phase+1;timer=f(timer*.5);previousSign=sign;accumulator=angularVelocity[2];}
 }
 let controlVector=[...c.controlVector],matrix=[...c.matrix],cacheValid=c.cacheValid;
 const [x,y,z]=controlVector,rawSquare=(z*z+y*y)+x*x,square=f(rawSquare);
 const inverse=mcmInverseSqrtLookup(square),angle=rawSquare===0||Number.isNaN(rawSquare)?0:f(1/inverse);
 let applied=false;
 if(square===0)controlVector=[0,0,0];
 else controlVector=[f(x*inverse),f(y*inverse),f(z*inverse)];
 if(Number.isFinite(angle)&&Math.abs(angle)>=f(.0001)){
  applied=true;matrix=rotateMcmTransformAtPivot(matrix,c.pivot,controlVector,angle);cacheValid=0;
 }
 return {matrix,controlVector,angularVelocity,timer,previousSign,accumulator,phase,angle,cacheValid,applied};
}
export function updateMcmStateZeroControlRotation(c){
 const control=updateMcmStateZeroControl(c);
 if(c.limitedFirst||c.limitedSecond||!c.field4bc)return {...control,matrix:[...c.matrix],timer:c.timer,previousSign:c.previousSign,accumulator:c.accumulator,phase:c.phase,angle:0,cacheValid:c.cacheValid};
 return {...control,...updateMcmStateZeroRotation({...c,...control})};
}
