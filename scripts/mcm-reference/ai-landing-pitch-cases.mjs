import {computeMcmAiLandingPitch} from '../../src/physics/mcm/ai-landing-pitch.js';
import {queryMcmTerrainNormal} from '../../src/physics/mcm/terrain-normal.js';
import {floatBits as bits,bitsFloat as float} from '../../src/physics/mcm/math.js';
export function landingPitchWords(w,terrain){
 const r=computeMcmAiLandingPitch({airborne:!!w[0],flag:w[1],angle:float(w[2]),verticalBias:float(w[3]),vy:float(w[4]),vx:float(w[5]),vz:float(w[6]),x:float(w[7]),z:float(w[8]),matrix4c0:float(w[9]),matrix4c8:float(w[10]),queryNormal:point=>queryMcmTerrainNormal({...terrain,point,normal:[0,0,0]})});return [r.flag,bits(r.angle)];
}
export function generateAiLandingPitchCases(terrain){
let seed=0x46f824;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;},count=4096,input=Buffer.alloc(count*44),expected=Buffer.alloc(count*8);for(let i=0;i<count;i++){const h=(random()%6283)/1000,w=[i%3!==0?1:0,i%5===0?1:0,bits((random()%3000)/1000),bits((random()%4000-2000)/100),bits((random()%4000-2000)/100),bits((random()%4000-2000)/100),bits((random()%4000-2000)/100),bits(100+random()%5000),bits(100+random()%5000),bits(Math.sin(h)),bits(Math.cos(h))];w.forEach((v,j)=>input.writeUInt32LE(v,i*44+j*4));landingPitchWords(w,terrain).forEach((v,j)=>expected.writeUInt32LE(v,i*8+j*4));}return {input,expected};
}
