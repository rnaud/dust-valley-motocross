// Wine 11 x86 group-local transitions. Bin selection, thread affinity routing
// and returning a released group to its bin are explicit caller services.
export function createWineLfhGroup(initial){
 const state=structuredClone(initial),{address,stride,slots}=state;
 if(slots.length!==31||!Number.isInteger(stride)||stride<16||stride%8)throw Error('Invalid LFH group');
 for(let i=0;i<31;i++)if(slots[i].header!==address+16+i*stride||(slots[i].words[1]&65535)!==i||(slots[i].words[0]&65535)*8!==stride)throw Error('Invalid LFH slot');
 return {allocate(size,affinity){
  if(!Number.isInteger(size)||size<0||size>stride-8||!Number.isInteger(affinity)||affinity<0||affinity>31)throw Error('Invalid LFH allocation');
  if(state.freeBits>>>31||!state.freeBits)return null;
  const bit=(state.freeBits&-state.freeBits)>>>0,index=31-Math.clz32(bit),slot=slots[index];
  if((slot.words[1]>>>24)!==0x81)throw Error('LFH bitmap/header disagreement');
  state.freeBits=(state.freeBits&~bit)>>>0;if(!state.freeBits)state.freeBits=0x80000000;
  state.affinity=affinity;slot.words=[(stride/8|((stride-8-size)<<16))>>>0,(0x80750000|index)>>>0];
  return slot.header+8;
 },free(pointer){
  const index=(pointer-address-24)/stride;
  if(!Number.isInteger(index)||index<0||index>=31)throw Error('Unknown LFH slot');
  const slot=slots[index],bit=2**index;
  if((state.freeBits&bit)||(slot.words[1]>>>24)!==0x80)throw Error('LFH double free or invalid slot');
  slot.words=[stride/8,(0x81460000|index)>>>0];state.freeBits=(state.freeBits|bit)>>>0;
  const released=state.freeBits===0xffffffff;if(released)state.freeBits=0x7fffffff;
  return {released};
 },snapshot(){return structuredClone(state);}};
}
