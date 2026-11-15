import {floatBits as bits,bitsFloat as float} from './math.js';
const f=Math.fround;
// Original 0x470174..0x4703c2. DWORD input order (float fields carry bits):
// mode,airborne,vx,vz,matrix4c0,matrix4c8,entrySpeed,routeThreshold,lateralError,
// nearestNodeSpeed,override,distance,absoluteSteering,currentSpeed,dt,pitch,
// turnScale,speedLimit. Output: throttle,brake,pitch,turnScale,speedLimit bits.
// Finite original-execution coverage; exceptional comparisons remain unproven.
export function computeMcmAiThrottle(w){const mode=w[0]&65535,air=!!w[1],speed=float(w[6]),threshold=float(w[7]),error=Math.abs(float(w[8]));let pitch=w[15],scale=w[16],limit=w[17];if(!air&&Math.abs(f(float(w[5])*float(w[2])-float(w[3])*float(w[4])))>5&&(w[6]|0)>0x42200000)scale=bits(.5);if(mode===0&&error>threshold&&float(w[9])>=error)limit=bits(30);if(w[10])limit=(w[7]|0)>0&&error<threshold?bits(30):0;
 if(mode===1&&(w[11]|0)<0x42c80000&&(w[12]|0)>0x3e2e147b){limit=bits(40);scale=(w[13]|0)>=0x42340000?bits(.5):bits(5);if((w[14]|0)>0){const current=float(pitch),dt=float(w[14]),delta=1-current,rate=f(Math.min(Math.abs(delta)*32,32));let p=rate*dt>1?1:f(f(delta)*rate*dt+current);if((bits(p)|0)>0x3f800000)p=1;else if(bits(p)>0xbf800000)p=-1;pitch=bits(p);}}
 let gas=0,brake=0;if(!air){if(speed<float(limit))gas=bits(1);else if(float(limit)+10<speed&&(w[12]|0)<0x3ec90fdb)brake=bits(1);}return [gas,brake,pitch,scale,limit];}
