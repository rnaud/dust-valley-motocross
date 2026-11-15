import {computeMcmAiSteeringControl} from '../../src/physics/mcm/ai-steering-control.js';
import {floatBits as bits} from '../../src/physics/mcm/math.js';
const f=Math.fround;
export function generateAiSteeringControlCases(){
const count=4096,input=Buffer.alloc(count*12),expected=Buffer.alloc(count*8);let seed=0x6f45ea;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};for(let c=0;c<count;c++){const vals=[f([0,-.02,.02,.001,.5][c%5]),f(c%7===0?0:(random()%100000-50000)/10000),f((random()%100000-50000)/20000)];vals.forEach((v,i)=>input.writeFloatLE(v,c*12+i*4));Object.values(computeMcmAiSteeringControl({dt:vals[0],difference:vals[1],current:vals[2]})).map(bits).forEach((v,i)=>expected.writeUInt32LE(v,c*8+i*4));}return {input,expected};
}
