import {createMcmSoundControllerDevice} from '../../src/physics/mcm/sound-controller-device.js';
import {stepMcmRidingSound} from '../../src/physics/mcm/riding-sound.js';
export function compareComposedCrashSound(input,output){
 if(input.length%0xfa0||output.length!==input.length/0xfa0*0x57c)throw Error('Wrong engine sound oracle sizes');const differences=[];let commands=0;
 for(let i=0;i<input.length/0xfa0;i++){
  const source=input.subarray(i*0xfa0,(i+1)*0xfa0),actual=Buffer.alloc(0x57c),expected=output.subarray(i*0x57c,(i+1)*0x57c);source.copy(actual,0,0,0x128);
  const args=source.subarray(0xf50),u=o=>args.readUInt32LE(o);let mask=u(20);const cursors=Array(19).fill(u(24)),log=[],id=n=>{if(n<1||n>19)throw Error('Invalid sound identity');return n-1;};
  const device={gearSeekEnabled:u(16),stop(n,reset){n=id(n);log.push([1,n,reset,0]);mask&=~(1<<n);if(reset)cursors[n]=0;return 1;},playing(n){n=id(n);const v=(mask>>n)&1;log.push([5,n,v,0]);return v;},position(n){n=id(n);log.push([4,n,cursors[n],0]);return cursors[n];},seek(n,v){n=id(n);log.push([3,n,v,0]);cursors[n]=v;},stopGroup(n,reset){log.push([10,n,reset,0]);},volume(n,v){log.push([9,id(n),v>>>0,0]);},play(n,reserved,loop){n=id(n);log.push([2,n,loop,reserved]);mask|=1<<n;},throttle(action,option){log.push([7,action,option,u(4)]);return u(4);},skid(action,option){log.push([8,action,option,u(8)]);return u(8);},random(){log.push([6,0,u(12),0]);return u(12);}};
  device.status=n=>{n=id(n);const status=(mask>>n)&1;log.push([10,n,status,0]);return {result:0,status};};
  let group=null;for(let n=5;n>=1;n--)group={handle:n,buffer:source.readUInt32LE(0xf9c)&(1<<(n-1))?n:null,next:group};
  const controller=createMcmSoundControllerDevice(device,{enabled:source.readUInt32LE(0xf94),reactionsEnabled:source.readUInt32LE(0xf98)},new Map([[source.readUInt32LE(0x44),group]]));
  const view=b=>new DataView(b.buffer,b.byteOffset,b.length);
  stepMcmRidingSound(view(actual.subarray(0,0x128)),view(source.subarray(0x128,0xdf0)),view(source.subarray(0xdf0,0xf50)),args.readFloatLE(0),controller,{rider:(()=>{const r=new DataView(new ArrayBuffer(0x150));r.setUint32(0x14c,source.readUInt32LE(0xf6c),true);return r;})(),listener:[0,1,2].map(j=>source.readFloatLE(0xf70+j*4)),wreckBytes:[0,1,2,3,4,5].map(j=>source.readUInt32LE(0xf7c+j*4))});
  actual.writeUInt32LE(mask,0x128);cursors.forEach((v,j)=>actual.writeUInt32LE(v,0x12c+j*4));actual.writeUInt32LE(log.length,0x178);log.forEach((row,j)=>row.forEach((v,k)=>actual.writeUInt32LE(v>>>0,0x17c+j*16+k*4)));commands+=log.length;
  for(let o=0;o<actual.length;o+=4)if(actual.readUInt32LE(o)!==expected.readUInt32LE(o))differences.push({case:i,offset:o,actual:actual.readUInt32LE(o),expected:expected.readUInt32LE(o)});
 }
 return {cases:input.length/0xfa0,comparedWords:output.length/4,commands,differences};
}
