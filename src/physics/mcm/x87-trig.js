// x87 argument reduction uses a 66-bit pi/2 constant. At large angles this
// differs measurably from the host libm reduction. Keep the input exact while
// subtracting quadrants, then evaluate the small remainder.
const halfPi=0x3243f6a8885a308d3n,scale=2**-65;
const buffer=new ArrayBuffer(8),view=new DataView(buffer);
export function mcmSinCos(angle){
 if(Number.isFinite(angle)&&Math.abs(angle)>=2**63)return {sin:angle,cos:angle};
 if(!Number.isFinite(angle)||Math.abs(angle)<2**20)return {sin:Math.sin(angle),cos:Math.cos(angle)};
 view.setFloat64(0,Math.abs(angle),false);
 const high=view.getUint32(0,false),low=view.getUint32(4,false);
 const mantissa=(BigInt(high&0xfffff)<<32n)|BigInt(low)|(1n<<52n);
 const units=mantissa<<BigInt(((high>>>20)&0x7ff)-1023+13);
 const quadrant=(units+halfPi/2n)/halfPi;
 const remainder=Number(units-quadrant*halfPi)*scale;
 const s=Math.sin(remainder),c=Math.cos(remainder);
 const q=Number(quadrant&3n),sin=[s,c,-s,-c][q],cos=[c,-s,-c,s][q];
 return {sin:angle<0?-sin:sin,cos};
}
