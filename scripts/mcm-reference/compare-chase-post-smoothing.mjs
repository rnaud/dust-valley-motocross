import {finishMcmChaseSmoothing} from '../../src/physics/mcm/chase-post-smoothing.js';
export function compareChasePostSmoothing(input,output){
 if(!input.length||input.length%164||output.length!==input.length/164*128)throw Error('Incomplete post-smoothing oracle');
 let differences=0;const examples=[];
 for(let i=0;i<input.length/164;i++){
  const a=input.subarray(i*164,(i+1)*164),v=Float32Array.from({length:41},(_,j)=>a.readFloatLE(j*4));
  const state={previousMode:a.readUInt32LE(0),eyeResetFlag:a.readUInt32LE(12),filters:Array.from({length:6},(_,j)=>v.slice(17+j*4,21+j*4))};
  const result=finishMcmChaseSmoothing(state,{targets:v.slice(5,11),eye:v.slice(11,14),target:v.slice(14,17)},{mode:a.readUInt32LE(4),actorType:a.readUInt32LE(8),usePrevious:a.readUInt32LE(16)});
  const actual=Buffer.alloc(128);actual.writeUInt32LE(state.previousMode,0);actual.writeUInt32LE(state.eyeResetFlag,4);
  [...result.target,...result.eye,...state.filters.flatMap(r=>[...r])].forEach((v,j)=>actual.writeFloatLE(v,8+j*4));
  for(let j=0;j<32;j++)if(actual.readUInt32LE(j*4)!==output.readUInt32LE(i*128+j*4)){differences++;if(examples.length<10)examples.push({case:i,word:j,expected:output.readUInt32LE(i*128+j*4),actual:actual.readUInt32LE(j*4)});}
 }
 return {cases:input.length/164,words:output.length/4,differences,examples};
}
