import {tickMcmMarker} from '../../src/physics/mcm/marker-tick.js';
export function buildMarkerTickCases(){
 const cases=[];
 for(let i=0;i<512;i++){
  const b=Buffer.alloc(0xa8),put=(o,v)=>b.writeUInt32LE(v>>>0,o),set=(o,v)=>b.writeFloatLE(v,o);
  put(0x30,0x12340000);put(0x34,1);put(0x60,i&1);put(0x70,(i>>1)&1);put(0x74,(i>>2)&1);put(0x8c,(i>>3)&1);
  set(0x64,[0,.2,1,NaN][(i>>4)&3]);set(0x6c,[0,.2,.3,2][(i>>6)&3]);
  set(0x78,[0,.05,.5,NaN][(i>>4)&3]);set(0x7c,[0,.03,.5,1][(i>>6)&3]);
  put(0x80,[0,1,999,0xffffffff][(i>>4)&3]);put(0x84,(i>>6)&3);
  [0,1,0].forEach((v,j)=>set(0x90+j*4,v));set(0x9c,33);set(0xa0,[0,-4,200,NaN][(i>>6)&3]);set(0xa4,i&256?.125:.016);
  cases.push(b);
 }
 return Buffer.concat(cases);
}
export function compareMarkerTick(input,output){
 if(input.length%0xa8||output.length!==input.length/0xa8*0xcc)throw Error('Invalid marker oracle sizes');
 const differences=[];let comparedWords=0,changedWords=0;
 for(let i=0;i<input.length/0xa8;i++){
  const source=input.subarray(i*0xa8,(i+1)*0xa8),expected=output.subarray(i*0xcc,(i+1)*0xcc),actual=Buffer.alloc(0xcc),calls=[];
  source.copy(actual,0,0,0xa4);const view=new DataView(actual.buffer,actual.byteOffset,0xa4),bits=x=>new Uint32Array(Float32Array.of(x).buffer)[0];
  const result=tickMcmMarker(view,source.readFloatLE(0xa4),{children:dt=>calls.push(1,bits(dt)),rotate:(address,axis,angle)=>calls.push(2,address,...axis.map(bits),bits(angle))});
  actual.writeUInt32LE(result,0xa4);actual.writeUInt32LE(calls.length,0xa8);calls.forEach((v,j)=>actual.writeUInt32LE(v,0xac+j*4));
  for(let o=0;o<0xcc;o+=4){comparedWords++;if(o<0xa4&&source.readUInt32LE(o)!==expected.readUInt32LE(o))changedWords++;if(actual.readUInt32LE(o)!==expected.readUInt32LE(o))differences.push({case:i,offset:o,actual:actual.readUInt32LE(o),expected:expected.readUInt32LE(o)});}
 }
 return {cases:input.length/0xa8,comparedWords,changedWords,differences};
}
