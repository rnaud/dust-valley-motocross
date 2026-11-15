import {generateAiRouteDataCases} from './ai-route-data-cases.mjs';
import {applyMcmAiRouteData} from '../../src/physics/mcm/ai-route-data.js';
import {prepareMcmAiEntry} from '../../src/physics/mcm/ai-entry.js';
import {floatBits as bits,bitsFloat as float} from '../../src/physics/mcm/math.js';
export function generateAiEntryCases(){
 const source=generateAiRouteDataCases().input,inputs=[],outputs=[];let pos=0,seed=0x46d240,c=0;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
 while(pos<source.length){
  const header=Array.from({length:5},(_,i)=>source.readUInt32LE(pos+i*4)),initial=Array.from({length:36},(_,i)=>source.readUInt32LE(pos+20+i*4));pos+=164;const bytes=header[4]===0xffffffff?null:source.subarray(pos,pos+header[4]);if(bytes)pos+=bytes.length;
  const w=[c%7?1:0,c%3===0?(random()|1)>>>0:c%3===1?256:0,c%17===0?0xffffffff:random(),c%8,bits((random()%60000-30000)/10000),bits((random()%20000-10000)/10000),bits((random()%20000-1000)/100),bits((random()%20000-10000)/100),bits((random()%20000-10000)/100),bits((random()%60000-30000)/10000),c%3,random()%2,random()%2,[0,0,1,7][c%4]];
  const input=Buffer.alloc(220);[...header,...w,...initial].forEach((v,i)=>input.writeUInt32LE(v,i*4));inputs.push(input);if(bytes)inputs.push(bytes);
  const actors=header.slice(1,4).map((routeCount,a)=>({routeCount,nodes:Array.from({length:3},(_,n)=>{const words=new Uint32Array(11);[5,6,7,9].forEach((o,k)=>words[o]=initial[(a*3+n)*4+k]);return words;})}));let load={bytesRead:0,closed:false};
  const r=prepareMcmAiEntry({routeHead:w[0],fieldb6c:w[1],jumpCount:w[2],routeIndex:w[3],routeCount:header[1],routeTable:Array.from({length:8},(_,i)=>i%3+1),pitch:float(w[4]),upY:float(w[5]),speed:float(w[6]),vx:float(w[7]),vz:float(w[8]),heading:float(w[9]),mode:w[10],raceSetting:w[11],raceContext:w[12],routeDataLoaded:w[13]},()=>{load=applyMcmAiRouteData(bytes,actors,header[0]);});
  const stage=r.stage?[r.stage.target,Number(r.stage.raceActive),bits(r.stage.turnScale),bits(r.stage.cos),bits(r.stage.sin),bits(r.stage.pitchAngle),bits(r.stage.speed),bits(r.stage.velocityHeading),bits(r.stage.heading)]:new Array(9).fill(0xdeadbeef),result=[Number(r.proceed),bits(r.throttle),bits(r.brake),r.jumpCount,r.routeIndex,r.routeDataLoaded,...stage,load.bytesRead,Number(load.closed),...actors.flatMap(a=>a.nodes.flatMap(n=>[5,6,7,9].map(o=>n[o])))],out=Buffer.alloc(212);result.forEach((v,i)=>out.writeUInt32LE(v,i*4));outputs.push(out);c++;
 }
 return {input:Buffer.concat(inputs),expected:Buffer.concat(outputs)};
}
