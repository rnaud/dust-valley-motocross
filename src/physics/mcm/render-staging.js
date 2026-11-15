const multiply=(a,b)=>Math.imul(a,b)>>>0;
const divide=(a,b)=>{if(!b)throw new RangeError('Native staging division by zero');return Math.floor((a>>>0)/(b>>>0));};
const blocks=(value,unit)=>divide((value+unit-1)>>>0,unit);

// Pinned Wine RVA 0x7f4e0 and intact pitch/size helpers 0x1d8ce0/0x1d8db0.
// Format is the 33 raw DWORDs through +0x80; all arithmetic is uint32.
export function mcmRenderStagingSize(format,box){
 if(format.length!==33||box.length!==6)throw new RangeError('Invalid staging input');
 const at=offset=>format[offset/4]>>>0,flags=at(0x5c);
 const width=(box[2]-box[0])>>>0,height=(box[3]-box[1])>>>0,depth=(box[5]-box[4])>>>0;
 const rowPitch=multiply(flags&0x20?blocks(width,at(0x34)):width,flags&0x20?at(0x3c):at(0x2c));
 let slicePitch=multiply(rowPitch,flags&0x20?blocks(height,at(0x38)):height);
 if(flags&0x200)slicePitch=divide(multiply(slicePitch,at(0x7c)),at(0x80));
 let size;
 if(flags&0x1000){
  if(!at(0))size=0;
  else if(flags&0x100)size=multiply(multiply(height,width),at(0x2c));
  else size=(divide(multiply(divide((rowPitch*2)>>>0,at(0x48)),height),at(0x4c))+multiply(rowPitch,height))>>>0;
 }else size=(multiply(divide((height-1)>>>0,at(0x38)),rowPitch)+multiply(blocks(width,at(0x34)),at(0x3c))+multiply((depth-1)>>>0,slicePitch))>>>0;
 return {rowPitch,slicePitch,size};
}

// The temporary-allocation branch of 0x1b6840, selected by map flags & 0x3000 == 0.
// Allocator success/pointer is an explicit environment result, not predicted here.
export function mcmRenderTemporaryStage({format,box,mapFlags,allocationPointer,previousState}){
 if(mapFlags&0x3000)throw new RangeError('Persistent staging path not recovered');
 if(previousState.length!==9)throw new RangeError('Invalid staging state');
 const sizing=mcmRenderStagingSize(format,box),pointer=allocationPointer>>>0;
 return {...sizing,mapped:[sizing.rowPitch,sizing.slicePitch,pointer],success:pointer!==0,
  state:pointer?[0,pointer,5,...box.map(v=>v>>>0)]:previousState.map(v=>v>>>0)};
}

// Heap-backed branch of 0x1b7ab0. Buffer-backed reference handling is separate.
export function mcmRenderTemporaryUnmap(state){
 if(state.length!==9||state[0]!==0)throw new RangeError('Expected heap-backed staging state');
 if(!state[1])return null;
 return {upload:state.slice(0,3),box:state.slice(3),state:Array(9).fill(0)};
}
