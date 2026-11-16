import {stepMcmRidingSound} from '../../src/physics/mcm/riding-sound.js';
export function compareEngineSound(input,output){
 if(input.length%0xf6c||output.length!==input.length/0xf6c*0x548)throw Error('Wrong engine sound oracle sizes');const differences=[];let commands=0;
 for(let i=0;i<input.length/0xf6c;i++){
  const source=input.subarray(i*0xf6c,(i+1)*0xf6c),actual=Buffer.alloc(0x548),expected=output.subarray(i*0x548,(i+1)*0x548);source.copy(actual,0,0,0x128);
  const args=source.subarray(0xf50),u=o=>args.readUInt32LE(o);let mask=u(20);const cursors=Array(6).fill(u(24)),log=[],id=n=>{if(n<1||n>6)throw Error('Invalid sound identity');return n-1;};
  const device={gearSeekEnabled:u(16),stop(n,reset){n=id(n);log.push([1,n,reset,0]);mask&=~(1<<n);if(reset)cursors[n]=0;},playing(n){n=id(n);const v=(mask>>n)&1;log.push([5,n,v,0]);return v;},position(n){n=id(n);log.push([4,n,cursors[n],0]);return cursors[n];},seek(n,v){n=id(n);log.push([3,n,v,0]);cursors[n]=v;},play(n,loop){n=id(n);log.push([2,n,loop,0]);mask|=1<<n;},throttle(action,option){log.push([7,action,option,u(4)]);return u(4);},skid(action,option){log.push([8,action,option,u(8)]);return u(8);},random(){log.push([6,0,u(12),0]);return u(12);}};
  const view=b=>new DataView(b.buffer,b.byteOffset,b.length);
  stepMcmRidingSound(view(actual.subarray(0,0x128)),view(source.subarray(0x128,0xdf0)),view(source.subarray(0xdf0,0xf50)),args.readFloatLE(0),device);
  actual.writeUInt32LE(mask,0x128);cursors.forEach((v,j)=>actual.writeUInt32LE(v,0x12c+j*4));actual.writeUInt32LE(log.length,0x144);log.forEach((row,j)=>row.forEach((v,k)=>actual.writeUInt32LE(v>>>0,0x148+j*16+k*4)));commands+=log.length;
  for(let o=0;o<actual.length;o+=4)if(actual.readUInt32LE(o)!==expected.readUInt32LE(o))differences.push({case:i,offset:o,actual:actual.readUInt32LE(o),expected:expected.readUInt32LE(o)});
 }
 return {cases:input.length/0xf6c,comparedWords:output.length/4,commands,differences};
}
