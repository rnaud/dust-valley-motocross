import {mcmRenderProductAddress} from './render-dirty.js';

// Pinned Wine stateblock paths 0x1bdd9b / 0x1bf703. Only the 64-byte
// transform upload is covered; other uploads and buffer lifetime are separate.
export function mcmRenderTransformUpload({stateAddress,entryEsp,transformed,dirty104,dirty108,flags58}){
 const viewport=!!transformed;
 const needed=viewport
  ? !!((dirty108&0x40)||(dirty104&0x00400000))
  : !!(dirty104&0x40000000)&&!!((flags58&8)||(dirty108&0x40));
 if(!needed)return null;
 return {kind:6,flags:0x10000,offset:256,count:64,
  data:viewport?mcmRenderProductAddress(entryEsp):(stateAddress+0x2de0)>>>0};
}

// The three later upload families at 0x1bffd9..0x1c0374. Other upload
// families can execute between these; this is not the complete schedule.
export function mcmRenderAuxiliaryUploads({entryEsp,dirty108,state2540}){
 const data=mcmRenderProductAddress(entryEsp),uploads=[];
 if(dirty108&2)uploads.push({callerRva:state2540?0x1c10ab:0x1c158e,
  kind:6,flags:state2540?0xc000:0x4000,offset:0,count:state2540?256:128,data});
 if(dirty108&1)uploads.push({callerRva:0x1c004f,
  kind:6,flags:0x20000,offset:320,count:512,data:(data+0x140)>>>0});
 if(dirty108&0x140)uploads.push({callerRva:0x1c0374,
  kind:7,flags:0x400,offset:388,count:28,data});
 return uploads;
}
