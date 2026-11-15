import {computeMcmAiLookahead} from '../../src/physics/mcm/ai-lookahead.js';
import {queryMcmTerrainHeight} from '../../src/physics/mcm/terrain-height.js';
import {floatBits as bits,bitsFloat as float} from '../../src/physics/mcm/math.js';
export function lookaheadWords(w,terrain){
 const nodes=new Map(Array.from({length:w[23]},(_,i)=>{const o=24+i*11;return [i+1,{x:float(w[o]),y:float(w[o+1]),z:float(w[o+2]),kind:w[o+4],next:w[o+10]}];}));
 const r=computeMcmAiLookahead({enabled:!!w[0],airborne:!!w[1],avoidance:w[2],nearestIndex:w[3],targetIndex:w[4],routeDifference:w[5],speed:float(w[6]),sin:float(w[7]),cos:float(w[8]),x:float(w[9]),z:float(w[10]),heading:float(w[11]),targetHeading:float(w[12]),steering:float(w[13]),speedLimit:float(w[14]),turnScale:float(w[15]),jumpFlag:w[16],point:Array.from(w.slice(17,20),float),worldHeight:float(w[20]),margin:float(w[21]),lookahead:float(w[22]),head:1,nodes,table:[...nodes.keys()],queryHeight:point=>queryMcmTerrainHeight({...terrain,point})});
 return [...r.point.map(bits),bits(r.speedLimit),bits(r.steering),bits(r.targetHeading),bits(r.turnScale),r.jumpFlag];
}
export function generateAiLookaheadCases(terrain){
 const count=4096,input=Buffer.alloc(count*448),expected=Buffer.alloc(count*32);let seed=0x46eb14;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
 for(let c=0;c<count;c++){
  const w=new Uint32Array(112);w[0]=c%9?1:0;w[1]=c%7?0:1;w[2]=c%3;w[3]=c%8;w[4]=random()%8;w[5]=c%6;w[6]=bits(10+random()%190);w[7]=c%4?0x3edeb3cd:0x3e7d5777;w[8]=c%4?0x3f6683b4:0x3f780aa5;w[9]=bits(1000+random()%1000);w[10]=bits(1000+random()%1000);w[11]=bits((random()%62800-31400)/10000);w[12]=bits((random()%62800-31400)/10000);w[13]=bits((random()%62800-31400)/10000);w[14]=bits(160);w[16]=c%2;w[17]=bits(600);w[18]=bits(100);w[19]=bits(600);w[20]=bits(3);w[21]=bits(24);w[22]=bits(48);w[23]=8;
  for(let i=0;i<8;i++){const o=24+i*11;w[o]=bits(float(w[9])+i*25);w[o+2]=bits(float(w[10])+((i%4)*20));w[o+1]=bits(queryMcmTerrainHeight({...terrain,point:[float(w[o]),0,float(w[o+2])]})[1]+random()%50);w[o+4]=random()%8;w[o+10]=i===7?0:i+2;}
  w.forEach((v,i)=>input.writeUInt32LE(v,c*448+i*4));lookaheadWords(w,terrain).forEach((v,i)=>expected.writeUInt32LE(v,c*32+i*4));
 }
 return {input,expected};
}
