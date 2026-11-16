import {mcmSoundAttenuation} from '../../src/physics/mcm/sound-distance.js';import {floatBits} from '../../src/physics/mcm/math.js';
export function compareSoundDistance(input,output){
 if(input.length%32||output.length!==input.length/32*12)throw Error('Invalid sound distance oracle sizes');const differences=[];
 for(let i=0;i<input.length/32;i++){
  const row=input.subarray(i*32,(i+1)*32),a=[0,4,8].map(o=>row.readFloatLE(o)),b=[12,16,20].map(o=>row.readFloatLE(o)),r=mcmSoundAttenuation(a,b,row.readInt32LE(28)),words=[floatBits(r.distance),r.volume>>>0,r.pan>>>0];
  words.forEach((actual,j)=>{const expected=output.readUInt32LE(i*12+j*4);if(actual!==expected)differences.push({case:i,word:j,actual,expected});});
 }
 return {cases:input.length/32,comparedWords:output.length/4,differences};
}
