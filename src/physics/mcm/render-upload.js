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
