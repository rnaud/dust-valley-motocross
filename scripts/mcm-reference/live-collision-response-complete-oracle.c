// Execute the complete original type-1 response for a captured crashed player.
#include <stdint.h>
#include <stdio.h>
static uint32_t completion[3];
static void run_complete_response(unsigned char*,unsigned char*);
static void write_completion(FILE*);
#define LIVE_COLLISION_SETUP() ((void)0)
#define LIVE_COLLISION_UPDATE(m,o) run_complete_response(m,o)
#define LIVE_COLLISION_STOP() completion[0]
#define LIVE_COLLISION_HEADER(out) write_completion(out)
#include "live-collision-grid-oracle.c"
static void run_complete_response(unsigned char*m,unsigned char*o){
 (void)m;unsigned char*b=*(void**)(o+0x94),*other=*(void**)(o+0x88);
 if(*(uint32_t*)o||*(uint32_t*)b!=0x4d9a94||*(uint32_t*)(b+0x614)||!other||*(uint32_t*)(other+0x104)!=1||!*(uint32_t*)(b+0x844))fail("expected crashed player bike/rider response");
 // Original 0x427110 reads this chain before its crashed-player early return.
 unsigned char*owner=*(void**)(b+0x41c),*notification=*(void**)(owner+0x3c),*world=*(void**)(notification+0x3c);
 if(*(void**)(world+0x1ec)!=b)fail("expected original notification player");
 ((void (__attribute__((thiscall)) *)(void*,int,void*))0x2009d900)(b,1,o);
 completion[0]=1;completion[1]=*(uint32_t*)(b+0x844);completion[2]=1;
}
static void write_completion(FILE*out){if(fwrite(completion,sizeof completion,1,out)!=1)fail("completion header");}
