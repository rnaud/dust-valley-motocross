import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {prepareMcmChaseTargets,stepMcmPreparedChase} from '../../src/physics/mcm/chase-preparation.js';

export function compareChasePreparation(input,output,{joined=false}={}){
 const stride=joined?64:56,width=joined?37:31;
 if(!input.length||input.length%stride)throw Error('Incomplete preparation input');
 let cursor=0,steps=0,differences=0;const examples=[];
 for(let offset=0;offset<input.length;offset+=stride){
  const values=Array.from({length:11},(_,i)=>input.readFloatLE(offset+i*4));
  const mode=input.readUInt32LE(offset+44),actorType=input.readUInt32LE(offset+48),initialized=input.readUInt32LE(offset+52);
  const count=joined?input.readUInt32LE(offset+60):1,delta=joined?input.readFloatLE(offset+56):0;
  if(!count||count>10000||cursor+count*width*4>output.length)throw Error('Incomplete preparation output');
  const state={};
  if(initialized)state.filters=Array.from({length:6},(_,i)=>new Float32Array(Uint32Array.from({length:4},(_,j)=>0x3f000000+0x10000*i+0x100*j).buffer));
  const args={base:values.slice(0,3),offset:values.slice(3,6),eye:values.slice(6,9),factor:values[9],distance:values[10],mode,actorType};
  for(let step=0;step<count;step++){
   const result=joined?stepMcmPreparedChase(state,args,delta):{targets:prepareMcmChaseTargets(state,args)};
   const floats=new Float32Array(width),words=new Uint32Array(floats.buffer);floats.set(result.targets);
   for(let i=0;i<6;i++)floats.set(state.filters[i],6+i*4);
   if(joined){floats.set(result.target,30);floats.set(result.eye,33);}
   words[width-1]=initialized?0:6;
   for(let i=0;i<width;i++){
    const native=output.readUInt32LE(cursor+i*4);
    if(native!==words[i]){differences++;if(examples.length<12)examples.push({case:offset/stride,step,index:i,native,actual:words[i]});}
   }
   cursor+=width*4;steps++;
  }
 }
 if(cursor!==output.length)throw Error('Trailing preparation output');
 return {cases:input.length/stride,steps,words:steps*width,differences,examples};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(compareChasePreparation(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3]),{joined:process.argv.includes('--joined')}),null,2));
