import {queryMcmTerrainSegment} from '../../src/physics/mcm/terrain-segment.js';

export function runTerrainSegmentCase(bytes){
 if(bytes.length!==72)throw new Error('Expected 72-byte terrain segment case');
 const vector=offset=>Array.from({length:3},(_,i)=>bytes.readFloatLE(offset+i*4));
 const root={minimumHeight:bytes.readInt32LE(4),maximumHeight:bytes.readInt32LE(8),shift:bytes.readUInt32LE(12)};
 const terrain={heightScale:bytes.readFloatLE(0),root},output=vector(40),observed=Buffer.alloc(48);
 const result=queryMcmTerrainSegment(terrain,vector(16),vector(28),output,bytes.readUInt32LE(68),
  (node,a,b,out,option)=>{
   if(node!==root)throw new Error('Root identity changed');
   observed.writeUInt32LE(observed.readUInt32LE(4)+1,4);
   [...a,...b].forEach((x,i)=>observed.writeFloatLE(x,8+i*4));observed.writeUInt32LE(option,44);
   out.splice(0,3,...vector(52));return bytes.readUInt32LE(64);
  });
 observed.writeUInt32LE(result,0);output.forEach((x,i)=>observed.writeFloatLE(x,32+i*4));
 return observed;
}

export function compareTerrainSegments(cases,original){
 if(original.length!==cases.length*48)throw new Error('Original segment output size mismatch');
 const differences=[];let calls=0;
 cases.forEach((c,index)=>{
  const actual=runTerrainSegmentCase(Buffer.from(c.hex,'hex')),expected=original.subarray(index*48,(index+1)*48);
  calls+=expected.readUInt32LE(4);
  for(let offset=0;offset<48;offset+=4)if(actual.readUInt32LE(offset)!==expected.readUInt32LE(offset))
   differences.push({case:c.name,offset,expected:expected.readUInt32LE(offset),actual:actual.readUInt32LE(offset)});
 });
 return {cases:cases.length,wordComparisons:cases.length*12,traversalCalls:calls,differences};
}
