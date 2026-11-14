import fs from 'node:fs';import {pathToFileURL} from 'node:url';
import {stepMcmOffsetChase} from '../../src/physics/mcm/chase-offset.js';
export function compareChaseOffsetChain(input,output){
 if(!input.length||input.length%104)throw Error('Incomplete offset input');
 let cursor=0,steps=0,differences=0,active=0,bypassed=0;const examples=[];
 for(let o=0;o<input.length;o+=104){
  const v=Array.from({length:26},(_,i)=>input.readFloatLE(o+i*4)),u=i=>input.readUInt32LE(o+i*4),count=u(15),initialized=u(13);
  if(!count||count>10000||cursor+count*160>output.length)throw Error('Incomplete offset output');
  const state={axis:Float32Array.of(0,1,0)};
  if(initialized)state.filters=Array.from({length:6},(_,i)=>new Float32Array(Uint32Array.from({length:4},(_,j)=>0x3f000000+0x10000*i+0x100*j).buffer));
  const args={base:v.slice(0,3),offset:v.slice(3,6),eye:v.slice(6,9),factor:v[9],distance:v[10],mode:u(11),actorType:u(12),source:v.slice(16,19),angle:v[19],bank:v[20],lean:v[21],enabled:u(22),previousTarget:v.slice(23,26)};
  for(let step=0;step<count;step++){
   const result=stepMcmOffsetChase(state,args,v[14]),floats=new Float32Array(40),words=new Uint32Array(floats.buffer);
   floats.set(result.targets);state.filters.forEach((r,i)=>floats.set(r,6+i*4));floats.set(result.target,30);floats.set(result.eye,33);words[36]=initialized?0:6;floats.set(state.axis,37);
   if(result.rotation.active)active++;else bypassed++;
   for(let i=0;i<40;i++){const native=output.readUInt32LE(cursor+i*4);if(native!==words[i]){differences++;if(examples.length<12)examples.push({case:o/104,step,index:i,native,actual:words[i]});}}
   steps++;cursor+=160;
  }
 }
 if(cursor!==output.length)throw Error('Trailing offset output');
 return {cases:input.length/104,steps,words:steps*40,active,bypassed,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareChaseOffsetChain(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3])),null,2));
