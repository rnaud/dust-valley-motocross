// The debug event suspends the process for this entire observation. Batch nearby
// allocations to reduce Wine ReadProcessMemory overhead; emit only named bytes,
// in the original allocation order. Never write to the target process.
static AnimationBlock* sorted_animations[sizeof animation_blocks / sizeof animation_blocks[0]];
static int animation_address_order(const void*a,const void*b){
 const DWORD x=(*(AnimationBlock*const*)a)->address,y=(*(AnimationBlock*const*)b)->address;
 return x<y?-1:x>y;
}
static int refresh_animation_observations(void){
 static BYTE buffer[65536];
 // Rebuild even when the count is unchanged: a later export can replace the
 // allocation table with a different graph of the same size.
 for(unsigned i=0;i<animation_count;i++)sorted_animations[i]=&animation_blocks[i];
 qsort(sorted_animations,animation_count,sizeof sorted_animations[0],animation_address_order);
 for(unsigned first=0;first<animation_count;){
  unsigned end=first+1;
  const DWORD start=sorted_animations[first]->address;
  uint64_t stop=(uint64_t)start+sorted_animations[first]->size;
  if(stop>UINT32_MAX||stop-start>sizeof buffer)return 0;
  while(end<animation_count){
   const AnimationBlock*b=sorted_animations[end];
   const uint64_t next=(uint64_t)b->address+b->size;
   if(b->address<stop||b->address-stop>4096||next>UINT32_MAX||next-start>sizeof buffer)break;
   stop=next;end++;
  }
  if(!read_memory(start,buffer,(DWORD)(stop-start))){
   // A gap may cross an unreadable page. The requested allocations can still
   // be valid; retry them individually instead of dropping the observation.
   for(unsigned i=first;i<end;i++){
    AnimationBlock*b=sorted_animations[i];
    if(!read_memory(b->address,b->bytes,b->size))return 0;
   }
  }else for(unsigned i=first;i<end;i++){
   AnimationBlock*b=sorted_animations[i];memcpy(b->bytes,buffer+b->address-start,b->size);
  }
  first=end;
 }
 // Optional native audit at the same stopped boundary, before any target
 // instruction resumes. This deliberately sacrifices the speed improvement.
 if(getenv("MCM_VERIFY_ANIMATION_BATCH"))for(unsigned i=0;i<animation_count;i++){
  const AnimationBlock*b=&animation_blocks[i];BYTE bytes[sizeof b->bytes];
  if(!read_memory(b->address,bytes,b->size)||memcmp(bytes,b->bytes,b->size))return 0;
 }
 return 1;
}
