// Stop at the first original gameplay callback; never substitute a no-op response.
#include <stdint.h>
#include <stdio.h>
#include <setjmp.h>
static uint32_t boundary[3];static jmp_buf callback_exit;
static void run_live_dispatch(unsigned char*,unsigned char*);
static void write_boundary(FILE*);
#define LIVE_COLLISION_SETUP() ((void (__cdecl *)(void))0x20001640)()
#define LIVE_COLLISION_UPDATE(m,o) run_live_dispatch(m,o)
#define LIVE_COLLISION_STOP() boundary[0]
#define LIVE_COLLISION_HEADER(out) write_boundary(out)
#include "live-collision-grid-oracle.c"
static void __cdecl stop_primary(void*owner){boundary[0]=1;boundary[1]=(uintptr_t)owner;boundary[2]=0;longjmp(callback_exit,1);}
static void __cdecl stop_secondary(void*owner){boundary[0]=1;boundary[1]=(uintptr_t)owner;boundary[2]=1;longjmp(callback_exit,1);}
static void run_live_dispatch(unsigned char*m,unsigned char*object){
 uint32_t count=*(uint32_t*)(m+4),saved[60][2];
 for(uint32_t i=0;i<count;i++){unsigned char*o=*(void**)(m+8+i*4);for(unsigned j=0;j<2;j++)saved[i][j]=*(uint32_t*)(o+0x108+j*4);if(saved[i][0])*(void**)(o+0x108)=stop_primary;if(saved[i][1])*(void**)(o+0x10c)=stop_secondary;}
 if(!setjmp(callback_exit))((void (__attribute__((thiscall)) *)(void*,void*))0x2002ccc0)(m,object);
 for(uint32_t i=0;i<count;i++){unsigned char*o=*(void**)(m+8+i*4);for(unsigned j=0;j<2;j++)*(uint32_t*)(o+0x108+j*4)=saved[i][j];}
}
static void write_boundary(FILE*out){if(fwrite(boundary,sizeof boundary,1,out)!=1)fail("callback boundary");}
