import {computeMcmAiHeadingOverride,computeMcmAiAirborneSteering} from '../../src/physics/mcm/ai-heading.js';
import {floatBits as bits,bitsFloat as float} from '../../src/physics/mcm/math.js';
export function heading(w){const v=Array.from(w,float);return bits(w[0]?computeMcmAiAirborneSteering({class27:!!w[2],targetHeading:v[6],heading:v[7],velocityHeading:v[8],vx:v[9],vz:v[10],matrix4c0:v[11],matrix4c8:v[12]}):computeMcmAiHeadingOverride({enabled:!!w[1],threshold:v[3],lateralError:v[4],segmentHeading:v[5],targetHeading:v[6],heading:v[7]}));}
export function generateAiHeadingCases(){
const count=8192,input=Buffer.alloc(count*52),expected=Buffer.alloc(count*4);let seed=0x643fad;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};for(let c=0;c<count;c++){const w=new Uint32Array(13);w[0]=c%2;w[1]=random()%2;w[2]=random()%2;w[3]=bits(c%5===0?-1:c%5===1?0:1);w[4]=bits((random()%4000-2000)/1000);for(let i=5;i<=8;i++)w[i]=bits((random()%62800-31400)/10000);for(let i=9;i<=12;i++)w[i]=bits((random()%1000-500)/100);w.forEach((x,i)=>input.writeUInt32LE(x,c*52+i*4));expected.writeUInt32LE(heading(w),c*4);}return {input,expected};
}
