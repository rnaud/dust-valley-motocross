import {floatBits as bits,bitsFloat as float} from './math.js';
const f=Math.fround;
// Original 0x46f69e..0x46f824. Input words: speed, current pitch command, dt.
// Returns pitch-command bits, preserving signed-bit gates and rounding stores.
export function computeMcmAiBasePitch(w){const speed=w[0]|0,dt=float(w[2]),current=float(w[1]);if((w[2]|0)<=0||speed===0x42480000)return w[1];const target=speed>0x42480000?.25:-.25,delta=target-current,rate=f(Math.min(Math.abs(delta)*32,32));let value=rate*dt>1?target:f((target>0?rate*f(delta):delta*rate)*dt+current);if((bits(value)|0)>0x3f800000)value=1;else if(bits(value)>0xbf800000)value=-1;return bits(value);}
// Original 0x46f911..0x470174. All inputs/outputs are DWORDs; float fields
// carry their float32 bits. Input order: dt,current,front590,rear594,airborne,
// avoidance,landingPitch,enabled,handicapEnabled,jumpFlag,x,z,pitchAngle,
// class3456,raceActive,handicap,turnScale,inverseLength,nearX,nearZ,nextX,
// nextZ,nextKind. Output: pitch command and turn scale.
// Finite native coverage; exceptional x87 comparison behavior is not yet proven.
export function computeMcmAiPitchControl(w){let current=float(w[1]),scale=w[16];const dt=float(w[0]),front=w[2]>0x80000000,rear=w[3]>0x80000000,air=!!w[4],avoid=w[5],landing=float(w[6]),enabled=w[7],bac=w[8],jump=w[9],angle=float(w[12]),cl=!!w[13];
 const smooth=(target,airPositive=false)=>{if((w[0]|0)<=0)return;const delta=target-current,rate=f(Math.min(Math.abs(delta)*32,32));let v=rate*dt>1?target:f((target===1?(airPositive?f(delta)*dt*rate:rate*f(delta)*dt):delta*rate*dt)+current);if((bits(v)|0)>0x3f800000)v=1;else if(bits(v)>0xbf800000)v=-1;current=v;};
 if(front&&!rear){if(!cl&&angle>=-.7853981633974)smooth(1);}
 else if(!front&&rear&&avoid!==3){if(!cl&&angle<=.7853981633974)smooth(-1);}
 else if(air){if(angle<landing)smooth(1,true);else if(angle>landing+f(.34906))smooth(-1);else smooth(0);}
 if(enabled&&!air&&(scale|0)<=0x3f800000)scale=bits(bac&&w[14]?f(1-float(w[15])):1);
 if(cl&&!air){if(jump){const nx=float(w[18]),nz=float(w[19]),raw=((nx-float(w[10]))*(float(w[20])-nx)+(float(w[21])-nz)*(nz-float(w[11])))*float(w[17]);if(raw>10)smooth(-1);else if((bits(f(raw))|0)<0x41200001)smooth(1);}else smooth(1);}
 else if(!cl&&!air&&jump&&[3,4,6].includes(w[22]))smooth(-1);
 return [bits(current),scale];}
