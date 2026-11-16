import {playMcmSound,stopMcmSoundGroup} from '../../src/physics/mcm/sound-device-control.js';
export function compareSoundDeviceControl(input,output){
 if(input.length%132||output.length!==input.length/132*1032)throw Error('Invalid device corpus sizes');
 const differences=[];let commands=0;
 for(let row=0;row<input.length/132;row++){
  const b=input.subarray(row*132,(row+1)*132),u=o=>b.readUInt32LE(o*4),actual=Buffer.alloc(1032),log=[];
  const device={stop(n,reset){const result=u(11+(n-1)*4);log.push([2,n,reset,result]);return result;},play(n,reserved,loop){log.push([3,n,reserved,loop]);},status(n){const status=u(9+(n-1)*4),result=u(10+(n-1)*4);log.push([1,n,status,result]);return {status,result};},error(code,path,line){log.push([4,code,path,line]);}};
  let result=1;
  if(u(0)){
   let first=null;for(let j=u(8)-1;j>=0;j--)first={handle:j+1,buffer:u(12+j*4)?j+1:null,next:first};
   result=stopMcmSoundGroup(first,u(7),device);
  }else playMcmSound({enabled:u(1),reactionsEnabled:u(2)},u(3),u(6),u(4),u(5),device);
  actual.writeUInt32LE(result);actual.writeUInt32LE(log.length,4);log.flat().forEach((v,i)=>actual.writeUInt32LE(v>>>0,8+i*4));commands+=log.length;
  const expected=output.subarray(row*1032,(row+1)*1032);
  for(let o=0;o<1032;o+=4)if(actual.readUInt32LE(o)!==expected.readUInt32LE(o))differences.push({case:row,offset:o,actual:actual.readUInt32LE(o),expected:expected.readUInt32LE(o)});
 }
 return {cases:input.length/132,comparedWords:output.length/4,commands,differences};
}
