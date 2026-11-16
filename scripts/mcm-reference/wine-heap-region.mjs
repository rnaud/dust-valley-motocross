// Partial Wine 11 x86 ordinary-heap service. Allocation placement is explicit;
// this models header mutations only, not free-list selection, LFH or regions.
export function createWineHeapRegion(initial){
 const blocks=initial.map(b=>({...b}));
 const validate=b=>{
  if(!Number.isInteger(b.pointer)||!Number.isInteger(b.bytes)||b.bytes<24||b.bytes%8||b.bytes/8>65535||!Number.isInteger(b.regionOffset)||b.regionOffset<0||b.regionOffset>65535)throw Error('Unsupported heap block');
 };
 blocks.forEach((b,i)=>{validate(b);if(i&&blocks[i-1].pointer+blocks[i-1].bytes!==b.pointer)throw Error('Heap region has missing blocks');});
 const index=pointer=>{const i=blocks.findIndex(b=>b.pointer===pointer);if(i<0)throw Error('Uncaptured heap pointer');return i;};
 return {
  words(pointer){const i=index(pointer),b=blocks[i];return [b.bytes/8,((b.regionOffset)|((b.free?0x46:0x75)<<16)|((b.free?1:(i&&blocks[i-1].free?2:0))<<24))>>>0];},
  free(pointer){let i=index(pointer),b=blocks[i];if(b.free)throw Error('Double free');if(!i||i===blocks.length-1)throw Error('Uncaptured heap neighbor');
   b.free=true;
   if(blocks[i+1].free){b.bytes+=blocks[i+1].bytes;blocks.splice(i+1,1);}
   if(blocks[i-1].free){blocks[i-1].bytes+=b.bytes;blocks.splice(i,1);b=blocks[--i];}
   validate(b);
  },
  allocateAt(pointer,request){const i=index(pointer),b=blocks[i],bytes=Math.ceil(request/16)*16+8;
   if(!Number.isInteger(request)||request<1024||!b.free||bytes>b.bytes)throw Error('Unsupported heap allocation');
   const remaining=b.bytes-bytes;if(remaining&&remaining<24)throw Error('Unsupported unsplit allocation tail');
   if(remaining)blocks.splice(i+1,0,{pointer:pointer+bytes,bytes:remaining,regionOffset:b.regionOffset+Math.floor((pointer+bytes-8)/65536)-Math.floor((pointer-8)/65536),free:true});
   b.bytes=bytes;b.free=false;validate(b);return pointer;
  },
 };
}
