// Portable transport tests: cc test-animation-observations.c -o /tmp/test-animation-observations
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
typedef uint32_t DWORD;
typedef unsigned char BYTE;
typedef struct {DWORD address,size;BYTE bytes[0x78];} AnimationBlock;
static AnimationBlock animation_blocks[8];
static unsigned animation_count,reads;
static DWORD unreadable;
static BYTE memory[131072];
static int read_memory(DWORD address,void*target,DWORD size){
 reads++;
 if((uint64_t)address+size>sizeof memory || (unreadable>=address&&unreadable<(uint64_t)address+size))return 0;
 memcpy(target,memory+address,size);return 1;
}
#include "capture-animation-observations.c"
static void check(void){
 for(unsigned i=0;i<animation_count;i++)assert(!memcmp(animation_blocks[i].bytes,memory+animation_blocks[i].address,animation_blocks[i].size));
}
int main(void){
 for(unsigned i=0;i<sizeof memory;i++)memory[i]=(BYTE)(i*37+(i>>8));
 unreadable=UINT32_MAX;
 animation_count=3;
 animation_blocks[0]=(AnimationBlock){.address=200,.size=48};
 animation_blocks[1]=(AnimationBlock){.address=100,.size=52};
 animation_blocks[2]=(AnimationBlock){.address=80000,.size=120};
 assert(refresh_animation_observations());assert(reads==2);check();
 assert(animation_blocks[0].address==200); // Output order is unchanged.
 reads=0;unreadable=175; // Gap inaccessible; both named allocations remain valid.
 assert(refresh_animation_observations());assert(reads==4);check();
 unreadable=210;assert(!refresh_animation_observations()); // Required byte missing.
 unreadable=UINT32_MAX;reads=0;
 animation_blocks[0].address=90000;animation_blocks[1].address=90048;
 assert(refresh_animation_observations());assert(reads==2);check(); // Same count, new graph.
 animation_blocks[0].address=UINT32_MAX-10;assert(!refresh_animation_observations());
 animation_count=0;reads=0;assert(refresh_animation_observations());assert(reads==0);
 puts("animation batching: contents, ordering, unreadable gaps, required bytes, replacement graph and overflow passed");
 return 0;
}
