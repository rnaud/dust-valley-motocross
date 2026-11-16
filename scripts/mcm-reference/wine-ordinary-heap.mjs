import {loadWineHeap} from './load-wine-heap.mjs';
// Retained ordinary blocks + free-list placement. LFH and region growth/release
// must be routed by the caller. Committed-page state/backpointer payload writes
// are not projected here; observable block headers and free-list links are.
export function createWineOrdinaryHeap(initial){
 const state=structuredClone(initial),{freeList}=loadWineHeap(state);
 const size=b=>((b.words[1]>>>24)&1?b.words[0]:b.words[0]&65535)*8;
 const locate=pointer=>{for(const region of state.regions){const index=region.blocks.findIndex(b=>b.header===pointer-8);if(index>=0)return {region,index,block:region.blocks[index]};}throw Error('Uncaptured ordinary heap pointer');};
 const freeWords=(region,header,bytes)=>[bytes/8,(0x01460000|(Math.floor(header/65536)-Math.floor(region.address/65536)))>>>0];
 const previousFlag=(block,enabled)=>{if(block)block.words[1]=((block.words[1]&~0x02000000)|(enabled?0x02000000:0))>>>0;};
 return {allocate(request,{raw=false}={}){
  if(!Number.isInteger(request)||request<(raw?0:1024)||request>0x7efe0)throw Error('Unsupported ordinary CRT request');
  const needed=raw?Math.max(24,Math.ceil((Math.max(8,request)+8)/8)*8):Math.ceil(request/16)*16+8;
  const pointer=freeList.select(needed);if(pointer===null)return null;
  const {region,index,block}=locate(pointer),oldBytes=size(block),result=freeList.allocate(request,{raw}),bytes=(result.words[0]&65535)*8,remaining=oldBytes-bytes;
  const used={header:block.header,words:result.words};
  if(remaining){const rest={header:block.header+bytes,words:freeWords(region,block.header+bytes,remaining)};region.blocks.splice(index,1,used,rest);previousFlag(region.blocks[index+2],true);}
  else{region.blocks[index]=used;previousFlag(region.blocks[index+1],false);}
  return pointer;
 },free(pointer){
  const {region,index,block}=locate(pointer),flags=block.words[1]>>>24;
  if((flags&~2)!==0||((block.words[1]>>>16)&255)!==0x75)throw Error('Not an ordinary used block');
  const previous=region.blocks[index-1],next=region.blocks[index+1],mergePrevious=!!(previous&&(previous.words[1]>>>24&1)),mergeNext=!!(next&&(next.words[1]>>>24&1));
  const first=index-(mergePrevious?1:0),count=1+(mergePrevious?1:0)+(mergeNext?1:0),last=first+count===region.blocks.length;
  if(!first&&last&&region.address!==state.heap+0x468)throw Error('Region release service required');
  const header=region.blocks[first].header,bytes=size(block)+(mergePrevious?size(previous):0)+(mergeNext?size(next):0),words=freeWords(region,header,bytes);
  if(mergePrevious)freeList.remove(previous.header+8);if(mergeNext)freeList.remove(next.header+8);
  freeList.insert(header,words,last);region.blocks.splice(first,count,{header,words});previousFlag(region.blocks[first+1],true);
 },words(pointer){return locate(pointer).block.words.slice();},snapshot(){return {freeList:freeList.snapshot(),regions:state.regions.map(r=>({address:r.address,blocks:r.blocks.map(b=>({header:b.header,words:b.words.slice()}))}))};}};
}
