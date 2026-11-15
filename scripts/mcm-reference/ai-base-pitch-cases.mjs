import {computeMcmAiBasePitch} from '../../src/physics/mcm/ai-pitch-control.js';
import {floatBits as bits} from '../../src/physics/mcm/math.js';
export function generateAiBasePitchCases(){
const count=4096,input=Buffer.alloc(count*12),expected=Buffer.alloc(count*4);let seed=0x46f69e;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};for(let i=0;i<count;i++){const w=[bits(i%4===0?50:(random()%20000-10000)/100),bits((random()%60000-30000)/10000),bits([0,-.02,.02,.0001,.5][i%5])];w.forEach((v,j)=>input.writeUInt32LE(v,i*12+j*4));expected.writeUInt32LE(computeMcmAiBasePitch(w),i*4);}return {input,expected};
}
