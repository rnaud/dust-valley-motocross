// Execute original rider crash primary callback on the captured contact.
#include <stdint.h>
#include <stdio.h>
static uint32_t completed;
static void setup_rider(void);
static void run_rider(unsigned char*,unsigned char*);
#define LIVE_COLLISION_SETUP() setup_rider()
#define LIVE_COLLISION_UPDATE(m,o) run_rider(m,o)
#define LIVE_COLLISION_STOP() completed
#define LIVE_COLLISION_HEADER(out) ((void)0)
#include "live-collision-grid-oracle.c"
static void setup_rider(void){
 ((void (__cdecl *)(void))0x20001640)();
 HMODULE winmm=LoadLibraryA("winmm.dll");if(!winmm)fail("winmm");
 *(void**)0x201278a8=(void*)GetProcAddress(winmm,"timeGetTime");if(!*(void**)0x201278a8)fail("timeGetTime");
}
static void run_rider(unsigned char*m,unsigned char*o){
 (void)o;unsigned char*contact=*(void**)(m+12),*r=*(void**)(contact+0x94),*other=*(void**)(contact+0x88);
 if(*(uint32_t*)contact!=1||*(uint32_t*)r!=0x4d6404||!other||*(uint32_t*)(other+0x104)>1)fail("expected rider-bike contact");
 ((void (__attribute__((thiscall)) *)(void*))0x2000e420)(r);completed=1;
}
