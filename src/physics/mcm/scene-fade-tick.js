import {mcmAdd,mcmSubtract,mcmMultiply,mcmDivide} from './x87-arithmetic.js';
const roundEven = value => {
 const low=Math.floor(value),fraction=value-low;
 const rounded=fraction<.5?low:fraction>.5?low+1:low%2===0?low:low+1;
 return Number.isFinite(rounded)&&rounded>=-2147483648&&rounded<=2147483647?rounded:-2147483648;
};
// Original 422df0. The descending clamp compares signed float bits, while
// the ascending clamp uses x87 comparison (unordered does not clamp).
export function tickMcmSceneFade(view,delta){
 const u=o=>view.getUint32(o,true),f=o=>view.getFloat32(o,true),put=(o,v)=>view.setUint32(o,v>>>0,true);
 delta=Math.fround(delta);
 if(u(0x10c)){
  view.setFloat32(0x114,mcmAdd(f(0x114),delta),true);
  if(f(0x114)>=f(0x110)){put(0xe4,255);put(0x10c,0);}
 }else if(u(0x108)){
  view.setFloat32(0x114,mcmSubtract(f(0x114),delta),true);
  if(view.getInt32(0x114,true)<=0){put(0x114,0);put(0xe4,0);put(0x108,0);}
 }
 if(u(0x10c)||u(0x108))put(0xe4,roundEven(Math.fround(mcmSubtract(mcmMultiply(mcmDivide(f(0x114),f(0x110)),255),.5))));
 return 1;
}
