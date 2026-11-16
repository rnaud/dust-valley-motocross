import {advanceMcmSceneOwner} from '../../src/physics/mcm/scene-owner-frame.js';
export function buildSceneOwnerFrameCases(){
 const values=[0,1,2,3,0x7fffffff,0x80000000,0xfffffffe,0xffffffff],rows=[];
 for(const size of values)for(const index of values)for(const count of values){const b=Buffer.alloc(12);[size,index,count].forEach((v,i)=>b.writeUInt32LE(v,i*4));rows.push(b);}
 return Buffer.concat(rows);
}
export function compareSceneOwnerFrame(input,output){
 if(input.length%12||output.length!==input.length/12*16)throw Error('Invalid frame-owner oracle sizes');
 const differences=[];
 for(let i=0;i<input.length/12;i++){
  const b=Buffer.alloc(0x44);input.copy(b,0x38,i*12,i*12+12);const result=advanceMcmSceneOwner(new DataView(b.buffer,b.byteOffset,b.length));
  const words=[b.readUInt32LE(0x38),b.readUInt32LE(0x3c),b.readUInt32LE(0x40),result];
  words.forEach((actual,j)=>{const expected=output.readUInt32LE(i*16+j*4);if(actual!==expected)differences.push({case:i,word:j,actual,expected});});
 }
 return {cases:input.length/12,comparedWords:input.length/3,differences};
}
