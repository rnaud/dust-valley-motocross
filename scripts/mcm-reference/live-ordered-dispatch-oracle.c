// Dispatch the captured current primary object; trace and execute original callbacks.
#include <stdint.h>
#include <stdio.h>
static uint32_t trace[257],completed;
static void setup_dispatch(void);
static void run_ordered_dispatch(unsigned char*,unsigned char*);
static void write_trace(FILE*);
#define LIVE_COLLISION_SETUP() setup_dispatch()
#define LIVE_COLLISION_UPDATE(m,o) run_ordered_dispatch(m,o)
#define LIVE_COLLISION_STOP() completed
#define LIVE_COLLISION_HEADER(out) write_trace(out)
#include "live-collision-grid-oracle.c"
static void record(void*owner,uint32_t kind){if(trace[0]>=128)fail("callback trace limit");trace[1+trace[0]*2]=(uintptr_t)owner;trace[2+trace[0]*2]=kind;trace[0]++;}
static void __cdecl bike_primary(void*p){record(p,0);((void (__cdecl *)(void*))0x2009e490)(p);}
static void __cdecl bike_secondary(void*p){record(p,1);((void (__cdecl *)(void*))0x2009e610)(p);}
static void __cdecl rider_primary(void*p){record(p,2);((void (__cdecl *)(void*))0x2000bb20)(p);}
static void __cdecl rider_secondary(void*p){record(p,3);((void (__cdecl *)(void*))0x2000bb30)(p);}
static void __cdecl unsupported(void*p){(void)p;fail("unsupported live callback reached");}
static void*callback(uint32_t address){switch(address){case 0:return NULL;case 0x49e490:return bike_primary;case 0x49e610:return bike_secondary;case 0x40bb20:return rider_primary;case 0x40bb30:return rider_secondary;default:return unsupported;}}
static void setup_dispatch(void){
 ((void (__cdecl *)(void))0x20001640)();HMODULE winmm=LoadLibraryA("winmm.dll");if(!winmm)fail("winmm");
 *(void**)0x201278a8=(void*)GetProcAddress(winmm,"timeGetTime");if(!*(void**)0x201278a8)fail("timeGetTime");
}
static void run_ordered_dispatch(unsigned char*m,unsigned char*unused){
 (void)unused;uint32_t count=*(uint32_t*)(m+4),saved[60][2];unsigned char*target=*(void**)(m+0x3980);int found=0;
 for(uint32_t i=0;i<count;i++){unsigned char*o=*(void**)(m+8+i*4);if(o==target)found=1;for(unsigned j=0;j<2;j++){saved[i][j]=*(uint32_t*)(o+0x108+j*4);*(void**)(o+0x108+j*4)=callback(saved[i][j]);}}
 if(!found)fail("captured primary not registered");
 ((void (__attribute__((thiscall)) *)(void*,void*))0x2002ccc0)(m,target);
 for(uint32_t i=0;i<count;i++){unsigned char*o=*(void**)(m+8+i*4);for(unsigned j=0;j<2;j++){uint32_t*p=(void*)(o+0x108+j*4);if(*p==(uintptr_t)callback(saved[i][j]))*p=saved[i][j];else if(*p>=0x20000000&&*p<0x20139000)*p-=0x1fc00000;else fail("unexpected callback replacement");}}
 completed=1;
}
static void write_trace(FILE*out){if(fwrite(trace,sizeof trace,1,out)!=1)fail("callback trace");}
