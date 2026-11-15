// Pinned Wine 11, synchronous state-upload cleanup. This models the store
// location and source, not the dirty-state/upload/particle-visibility gates.
export function mcmRenderHeapStore(stateApplyEntryEsp, heapHandle){
 // stateblock prologue: push EBP/EDI/ESI/EBX, align 16, reserve 0x860.
 const apply=((stateApplyEntryEsp-16)&0xfffffff0)>>>0;
 // Upload, resource update, synchronous command dispatch, CRT free and
 // RtlFreeHeap leave the helper's EBP-0x14 at apply-0xa08.
 return {address:(apply-0xa08)>>>0,value:heapHandle>>>0};
}
