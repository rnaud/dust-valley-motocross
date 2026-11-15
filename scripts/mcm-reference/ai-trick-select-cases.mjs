import {selectMcmAiTrick} from '../../src/physics/mcm/ai-trick-select.js';
import {createMcmRandom} from '../../src/physics/mcm/random.js';
import {floatBits as bits,bitsFloat as float} from '../../src/physics/mcm/math.js';
const f=Math.fround;
export function generateAiTrickSelectCases(){
const n=4096,input=Buffer.alloc(n*24),expected=Buffer.alloc(n*20);let seed=0x49d6a0;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};for(let i=0;i<n;i++){const time=i%5===0?[2.25,2,Math.fround(1.77),1.5,Math.fround(1.33),1][i%6]:f((random()%4000-500)/1000),w=[random(),bits(time),i%4,i%2,bits((random()%1000)/100),random()];w.forEach((v,j)=>input.writeUInt32LE(v,i*24+j*4));(()=>{const r=createMcmRandom(w[0]),v=selectMcmAiTrick({flightTime:float(w[1]),selector:w[2],delayEnabled:w[3],delay:float(w[4]),selected:w[5]},r);return [v.success,v.selected,bits(v.delay),r.state,r.calls];})().forEach((v,j)=>expected.writeUInt32LE(v,i*20+j*4));}return {input,expected};
}
