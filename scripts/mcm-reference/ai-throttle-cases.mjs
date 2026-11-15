import {computeMcmAiThrottle} from '../../src/physics/mcm/ai-throttle.js';
import {floatBits as bits} from '../../src/physics/mcm/math.js';
export function generateAiThrottleCases(){

const count=8192,input=Buffer.alloc(count*72),expected=Buffer.alloc(count*20);let seed=0x470174;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};for(let i=0;i<count;i++){const h=random()%6283/1000,w=[i%3,random()%2,bits((random()%20000-10000)/100),bits((random()%20000-10000)/100),bits(Math.sin(h)),bits(Math.cos(h)),bits(random()%20000/100),bits((random()%20000-5000)/100),bits((random()%40000-20000)/100),bits(random()%20000/100),random()%2,bits(random()%20000/100),bits((random()%30000-10000)/10000),bits(random()%10000/100),bits([0,-.02,.02,.001,.5][i%5]),bits((random()%60000-30000)/10000),bits(random()%10000/1000),bits(random()%20000/100)];w.forEach((v,j)=>input.writeUInt32LE(v,i*72+j*4));computeMcmAiThrottle(w).forEach((v,j)=>expected.writeUInt32LE(v,i*20+j*4));}return {input,expected};
}
