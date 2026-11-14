import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {tickMcmHudRefreshClock} from '../../src/physics/mcm/hud-refresh-clock.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function compareHudRefreshClock(input,output){
 if(!input.length||input.length%24)throw Error('Invalid clock inputs');
 let offset=0,changedWords=0,steps=0,refreshes=0;const differences=[];
 for(let i=0;i<input.length/24;i++){
  const b=input.subarray(i*24,(i+1)*24),clock={elapsed:b.readFloatLE(0),frames:b.readUInt32LE(4),frameMilliseconds:b.readFloatLE(8)},count=b.readUInt32LE(20);
  if(!count||count>10000)throw Error('Invalid clock step count');
  let before=[b.readUInt32LE(0),clock.frames,b.readUInt32LE(8),0];
  for(let step=0;step<count;step++){
   if(offset+16>output.length)throw Error('Short clock outputs');
   let calls=0;tickMcmHudRefreshClock(clock,{dt:b.readFloatLE(12),enabled:b.readUInt32LE(16),refresh:()=>calls++});
   const actual=[floatBits(clock.elapsed),clock.frames,floatBits(clock.frameMilliseconds),calls];
   const expected=Array.from({length:4},(_,j)=>output.readUInt32LE(offset+j*4));
   for(let j=0;j<4;j++){if(expected[j]!==before[j])changedWords++;if(actual[j]!==expected[j])differences.push({case:i,step,word:j,expected:expected[j],actual:actual[j]});}
   refreshes+=expected[3];before=expected;offset+=16;steps++;
  }
 }
 if(offset!==output.length)throw Error('Extra clock outputs');
 return {cases:input.length/24,steps,comparedWords:offset/4,changedWords,refreshes,differences};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const report=compareHudRefreshClock(fs.readFileSync(process.argv[2]),fs.readFileSync(process.argv[3]));console.log(JSON.stringify(report,null,2));if(report.differences.length)process.exitCode=1;}
