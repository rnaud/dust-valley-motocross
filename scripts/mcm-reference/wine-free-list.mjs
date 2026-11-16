// Wine 11 x86 ordinary-heap selection and split/list mutation. This neither chooses LFH
// groups nor grows a heap; absence of a fitting block is an explicit result.
export function wineFreeListIndex(bytes){
 if(!Number.isInteger(bytes)||bytes<0||bytes%8||bytes>0xffffffff)throw Error('Invalid ordinary block size');
 const units=bytes/8;if(units<4)return units;
 const bit=Math.floor(Math.log2(units));return Math.min(60,(bit-1)*4+Math.floor(units/2**(bit-2))%4);
}
export function createWineFreeList(snapshot){
 const {head,entries}=snapshot,byLink=new Map(entries.map(e=>[e.header+8,{...e,words:e.words.slice(),links:e.links.slice()}]));
 if(byLink.size!==entries.length||!byLink.has(head))throw Error('Incomplete free-list snapshot');
 for(const e of entries){
  const flags=e.words[1]>>>24;
  if((flags!==1&&flags!==3)||((e.words[1]>>>16)&255)!==0x46)throw Error('Unsupported free-list entry');
  if(byLink.get(e.links[0])?.links[1]!==e.header+8||byLink.get(e.links[1])?.links[0]!==e.header+8)throw Error('Broken free-list links');
 }
 const seen=new Set();let p=head;
 do{if(seen.has(p))throw Error('Free-list cycle');seen.add(p);p=byLink.get(p).links[0];}while(p!==head);
 if(seen.size!==entries.length)throw Error('Disconnected free-list entries');
 for(let i=0;i<61;i++)if(byLink.get(head+i*16)?.words[1]>>>24!==3)throw Error('Missing free-list sentinel');
 const select=bytes=>{
  let p=byLink.get(head+wineFreeListIndex(bytes)*16).links[0];
  while(p!==head){const e=byLink.get(p);if((e.words[1]>>>24)!==3&&e.words[0]*8>=bytes)return e.header+8;p=e.links[0];}
  return null;
 };
 return {select,allocate(request){
  if(!Number.isInteger(request)||request<1024||request>0x7efe0)throw Error('Unsupported ordinary CRT request');
  const payload=Math.ceil(request/16)*16,needed=payload+8,pointer=select(needed);
  if(pointer===null)return null; // The caller must supply the region-growth service.
  const block=byLink.get(pointer),oldBytes=block.words[0]*8;
  if(typeof block.last!=='boolean')throw Error('Missing terminal-block metadata');
  const bytes=oldBytes-needed>=24?needed:oldBytes,remaining=oldBytes-bytes;
  byLink.get(block.links[0]).links[1]=block.links[1];byLink.get(block.links[1]).links[0]=block.links[0];byLink.delete(pointer);
  if(remaining){
   const header=block.header+bytes,regionOffset=(block.words[1]&65535)+Math.floor(header/65536)-Math.floor(block.header/65536);
   let index=wineFreeListIndex(remaining);if(block.last)index=(index+1)%61;
   const sentinel=head+index*16,before=block.last?sentinel:byLink.get(sentinel).links[0],after=byLink.get(before).links[1],link=header+8;
   if(byLink.has(link))throw Error('Overlapping free-list split');
   byLink.set(link,{header,words:[remaining/8,(0x01460000|regionOffset)>>>0],links:[before,after],last:block.last});
   byLink.get(before).links[1]=link;byLink.get(after).links[0]=link;
  }
  return {pointer,words:[(bytes/8|((bytes-8-payload)<<16))>>>0,(0x00750000|(block.words[1]&65535))>>>0]};
 },snapshot(){const out=[];let p=head;do{const e=byLink.get(p);out.push({...e,words:e.words.slice(),links:e.links.slice()});p=e.links[0];}while(p!==head);return {head,entries:out};}};
}
