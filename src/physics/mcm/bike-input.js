import {floatBits} from './math.js';

// Original bike button gate 0x4a4ab0 and aggregator 0x454f70. Device-level
// responses are supplied in poll order: primary, four secondary devices, final.
// Original POV lookup 0x453fe0 signals inactive for 0xffffffff / 0x0000ffff.
export function queryMcmBikeInput(c){
 const polled=[];
 if(c.ai||c.secondaryControl)return {value:0,polled};
 const raw=c.povValue>>>0;
 if(c.povPresent&&c.povCount>0&&raw!==0xffffffff&&raw!==0xffff){
  if(c.action===4&&!(floatBits(c.engineLevel)&0x7fffffff))return {value:0,polled};
  if(c.action===5&&!(floatBits(c.brake)&0x7fffffff))return {value:0,polled};
 }
 for(let i=0;i<6;i++)if(c.presentMask&(1<<i)){
  polled.push(i);
  if(c.responses[i])return {value:1,polled};
 }
 return {value:0,polled};
}
