import {sortMcmParticlesByDepth} from '../../src/physics/mcm/particle-sort.js';
export function compareParticleSort(input,output){
 if(input.length%4100||output.length!==input.length/4100*4096)throw Error('Invalid particle sort corpus');
 const differences=[];let active=0;
 for(let row=0;row<input.length/4100;row++){
  const b=input.subarray(row*4100,(row+1)*4100),count=b.readUInt32LE(0);active+=count;
  const order=sortMcmParticlesByDepth(Array.from({length:count},(_,i)=>i),i=>b.readFloatLE(4+i*4));
  for(let i=0;i<1024;i++){const actual=i<count?order[i]:i,expected=output.readUInt32LE(row*4096+i*4);if(actual!==expected)differences.push({case:row,index:i,actual,expected});}
 }
 return {cases:input.length/4100,comparedWords:output.length/4,activeParticles:active,differences};
}
