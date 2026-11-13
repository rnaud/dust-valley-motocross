import {floatBits,bitsFloat} from './math.js';
import {mcmMultiply} from './x87-arithmetic.js';

// Original 0x4a5672..0x4a57c0, plus crash input clearing at 0x4a5887.
// AI and scripted controllers are explicit pending calls, never approximated.
export function prepareMcmFrameInput(c,input){
 const b=c.bike;
 let branch,analog=-1;
 if(b.field844){
  branch='crash';
  b.fieldb6c=bitsFloat(((floatBits(b.fieldb6c)&0xffffff00)|1)>>>0);
  b.field6ec=b.field6f0=b.field6f4=b.field6e8=0;
  b.fieldb04=b.fieldb08=0;
 }else{
  if(((b.field814<<24)>>24)>=0&&b.field710&&c.frameRider.riderAnimation.stopped){b.field710=0;b.field714=1;}
  if(b.field614)branch='ai';
  else{
   b.fieldb04=b.fieldb08=0;
   if(floatBits(b.field6f8)!==0)analog=bitsFloat(input.analogBits);
   b.field6ec=-bitsFloat(input.longitudinalBits);
   b.field6e8=-bitsFloat(input.steerBits);
   b.field6f4=input.devicePresent&&input.deviceByte!==4&&[2,3].includes(input.deviceKind)?Math.fround(mcmMultiply(mcmMultiply(b.field6e8,b.field6e8),b.field6e8)):b.field6e8;
   b.field6f0=0;
   branch=b.fieldc68?'scripted':'player';
  }
 }
 c.frameEntry.analog=analog;
 return {branch,pendingController:branch==='ai'||branch==='scripted'?branch:null};
}
