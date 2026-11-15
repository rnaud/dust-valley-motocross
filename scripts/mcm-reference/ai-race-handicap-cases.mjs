import {computeMcmAiRaceHandicap} from '../../src/physics/mcm/ai-race-handicap.js';
import {floatBits as bits,bitsFloat as float} from '../../src/physics/mcm/math.js';
export function generateAiRaceHandicapCases(){
 const input=Buffer.alloc(8192*120),expected=Buffer.alloc(8192*12);let seed=0x46d535;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;},scalar=()=>bits((random()%200000-100000)/1000);
 for(let c=0;c<8192;c++){
  const w=[c%5?1:0,scalar(),c%19===0?random():random()%7-2,c%23===0?random():random()%7-2,random()%8,random()%8,8,bits((random()%10000+1)/100),bits(-(random()%10000+1)/100),bits((random()%100000+1)/100),bits(-(random()%100000+1)/100),scalar(),scalar(),scalar(),...Array.from({length:16},scalar)];
  w[6]=c%8+1;w[4]%=w[6];w[5]%=w[6];
  w.forEach((v,i)=>input.writeUInt32LE(v>>>0,c*120+i*4));const r=computeMcmAiRaceHandicap({raceActive:!!w[0],initialProgress:float(w[1]),lap:w[2]|0,otherLap:w[3]|0,index:w[4],otherIndex:w[5],routeCount:w[6],maxProgress:float(w[7]),minProgress:float(w[8]),maxDistance:float(w[9]),minDistance:float(w[10]),maxScale:float(w[11]),minScale:float(w[12]),currentDistance:float(w[13]),route:w.slice(14,22).map(float),otherRoute:w.slice(22).map(float)});[r.progress,r.distance,r.scale].forEach((v,i)=>expected.writeUInt32LE(bits(v),c*12+i*4));
 }
 return {input,expected};
}
