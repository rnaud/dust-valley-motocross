import {bitsFloat, floatBits} from './math.js';

// Pinned Wine 11 wined3d RVA 0x1bddc6..0x1bdef6 / 0x1c1306.
// SSE scalar operations round after each instruction. Invalid operations
// produce the negative indefinite NaN; input quiet NaNs retain operand order.
const negate = value => bitsFloat(floatBits(value) ^ 0x80000000);
function scalar(a, b, operation) {
 if (Number.isNaN(a)) return a;
 if (Number.isNaN(b)) return b;
 const result = operation(a, b);
 return Number.isNaN(result) ? bitsFloat(0xffc00000) : Math.fround(result);
}
const add = (a,b) => scalar(a,b,(a,b)=>a+b);
const subtract = (a,b) => scalar(a,b,(a,b)=>a-b);
const divide = (a,b) => scalar(a,b,(a,b)=>a/b);

export function mcmRenderViewportMatrix({x,y,width,height,state2300,device28}) {
 x=Math.fround(x);y=Math.fround(y);width=Math.fround(width);height=Math.fround(height);
 const matrix=new Float32Array(16);
 matrix[0]=divide(2,width);
 matrix[5]=divide(-2,height);
 matrix[10]=state2300 && device28 ? 1 : 0;
 matrix[12]=divide(subtract(negate(add(x,x)),width),width);
 matrix[13]=divide(negate(subtract(negate(add(y,y)),height)),height);
 matrix[15]=1;
 return matrix;
}
