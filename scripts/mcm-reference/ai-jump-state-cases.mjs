import {computeMcmAiJumpState} from '../../src/physics/mcm/ai-jump-state.js';
import {floatBits as bits} from '../../src/physics/mcm/math.js';
import {createMcmRandom} from '../../src/physics/mcm/random.js';
export function generateAiJumpStateCases(){
const count=4096,input=Buffer.alloc(count*136),expected=Buffer.alloc(count*56);let seed=0x46f0a4;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};for(let c=0;c<count;c++){const w=new Uint32Array(34);w[0]=random();w[1]=c%3;w[2]=random()%2;w[3]=random()%2;w[4]=bits((random()%400-100)/100);w[5]=bits(.5);w[6]=c%2+1;for(let i=0;i<25;i++)w[7+i]=bits((random()%10000-5000)/32);const b=w.subarray(7,32);b[0]=random()%2;b[1]=random()%2;b[2]=c%2;b[4]=c%3;b[7]=random()%2;b[18]=c%4;b[19]=random()%2;b[20]=bits(c%2?40:20);b[21]=bits(c%2?40:20);b[22]=c%3===0?1:256;b[23]=c%3===0?9:0;w[32]=1;w[33]=2;w.forEach((v,i)=>input.writeUInt32LE(v,c*136+i*4));computeMcmAiJumpState(w,createMcmRandom(w[0])).forEach((v,i)=>expected.writeUInt32LE(v,c*56+i*4));}return {input,expected};
}
