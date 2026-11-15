// Original 45c8d0 / 45c820. The heap remains an explicit environment boundary:
// its pointer identity, failure policy and size lookup are not reconstructed here.
export function allocateMcmOwnedArray(owner, accounting, heap, count, size) {
 const pointer=heap.calloc(count>>>0,size>>>0);
 if(pointer){
  accounting.bytes=(accounting.bytes+(size>>>0))>>>0;
  owner.bytes=(owner.bytes+(size>>>0))>>>0;
 }
 return pointer;
}
export function freeMcmOwned(owner, accounting, heap, pointer) {
 if(pointer){
  accounting.bytes=(accounting.bytes-heap.size(pointer))>>>0;
  owner.bytes=(owner.bytes-heap.size(pointer))>>>0;
 }
 heap.free(pointer);
}
