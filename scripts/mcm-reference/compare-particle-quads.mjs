import {buildMcmParticleQuads,submitMcmParticleQuads} from '../../src/physics/mcm/particle-quads.js';
export function compareParticleQuads(input,output){
 if(input.length%0x3ec||output.length!==input.length/0x3ec*1576)throw Error('Invalid quad corpus');let vertices=0,commands=0,draws=0;const differences=[];
 for(let row=0;row<input.length/0x3ec;row++){
  const b=input.subarray(row*0x3ec,(row+1)*0x3ec),count=b.readUInt32LE(0),actual=Buffer.alloc(1576,0xa5),view=x=>new DataView(x.buffer,x.byteOffset,x.length);vertices+=count*4;
  const order=buildMcmParticleQuads(Array.from({length:count},(_,i)=>view(b.subarray(0xa4+i*72,0xa4+(i+1)*72))),Array.from({length:count},(_,i)=>view(b.subarray(0x2e4+i*32,0x2e4+(i+1)*32))),{flags:b.readUInt32LE(4),seed:b.readUInt32LE(8),near:b.readFloatLE(12),far:b.readFloatLE(16),viewDepth:[0,1,2,3].map(i=>b.readFloatLE(0x14+i*4)),uv:view(b.subarray(0x24,0xa4))},view(actual.subarray(32)));
  for(let i=0;i<8;i++)actual.writeUInt32LE(i<count?order[i]:i,i*4);
  const calls=[],log=(...values)=>calls.push([...values,...Array(8-values.length).fill(0)]);
  const result=count?submitMcmParticleQuads({texture:1,format:b.readUInt32LE(0x3e8),totalCount:b.readUInt32LE(0x3e4),visibleCount:count,vertices:1,indices:2},{bindTexture:t=>log(1,t),setState:(...args)=>log(2,...args),draw:(...args)=>log(3,...args)}):1;
  commands+=calls.length;draws+=+(count>0);actual.fill(0,1056);actual.writeUInt32LE(result,1056);actual.writeUInt32LE(calls.length,1060);calls.flat().forEach((v,i)=>actual.writeUInt32LE(v>>>0,1064+i*4));
  const expected=output.subarray(row*1576,(row+1)*1576);for(let o=0;o<1576;o+=4)if(actual.readUInt32LE(o)!==expected.readUInt32LE(o)&&differences.length<30)differences.push({case:row,offset:o,actual:actual.readUInt32LE(o),expected:expected.readUInt32LE(o)});
 }
 return {cases:input.length/0x3ec,comparedWords:output.length/4,vertices,draws,commands,differences};
}
