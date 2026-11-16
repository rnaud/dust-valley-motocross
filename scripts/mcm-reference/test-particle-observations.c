// Portable read-only transport checks; compile with cc and run locally.
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
typedef uint32_t DWORD;typedef unsigned char BYTE;
static BYTE memory[200000];static unsigned reads,corruptAfter;static DWORD unreadable=UINT32_MAX;
static int read_memory(DWORD address,void*target,DWORD size){reads++;if((uint64_t)address+size>sizeof memory||(address<=unreadable&&(uint64_t)address+size>unreadable))return 0;memcpy(target,memory+address,size);if(corruptAfter&&reads>corruptAfter)((BYTE*)target)[0]^=1;return 1;}
#include "capture-particle-pool.c"
static void setup(unsigned stride){for(unsigned i=0;i<sizeof memory;i++)memory[i]=(BYTE)(i*37+(i>>8));for(unsigned i=0;i<1000;i++)retained_particle_addresses[i]=10000+(999-i)*stride;unreadable=UINT32_MAX;reads=0;}
static void check(void){for(unsigned i=0;i<1000;i++)assert(!memcmp(retained_particle_bytes[i],memory+retained_particle_addresses[i],0x48));}
int main(void){
 setup(72);assert(refresh_particle_observations());assert(reads==2);check();assert(retained_particle_addresses[0]==10000+999*72);
 setup(80);unreadable=10075;assert(refresh_particle_observations());assert(reads>2);check();
 unreadable=10010;assert(!refresh_particle_observations());
 setup(72);retained_particle_addresses[0]=retained_particle_addresses[1];assert(!refresh_particle_observations());
 setup(72);retained_particle_addresses[0]=UINT32_MAX-20;assert(!refresh_particle_observations());
 setup(72);setenv("MCM_VERIFY_PARTICLE_BATCH","1",1);assert(refresh_particle_observations());assert(reads==1002);check();reads=0;corruptAfter=2;assert(!refresh_particle_observations());corruptAfter=0;unsetenv("MCM_VERIFY_PARTICLE_BATCH");
 FILE*f=tmpfile();assert(f);BYTE bytes[]={0,1,0x10,0xab,0xff};assert(write_particle_hex(f,bytes,sizeof bytes));rewind(f);char text[11]={0};assert(fread(text,1,10,f)==10);assert(!strcmp(text,"000110abff"));fclose(f);
 setup(72);retained_pool_address=0;
 for(unsigned i=0;i<1000;i++)memcpy(memory+100+0x44+i*4,retained_particle_addresses+i,4);
 char *snapshots[2];
 for(unsigned pass=0;pass<2;pass++){
  f=tmpfile();assert(f);assert(capture_retained_particle_pool(f,100));long size=ftell(f);assert(size>144000);snapshots[pass]=calloc((size_t)size+1,1);assert(snapshots[pass]);rewind(f);assert(fread(snapshots[pass],1,size,f)==(size_t)size);fclose(f);
  assert(strstr(snapshots[pass],"\"particleBatchAudited\":false"));char *hex=strstr(snapshots[pass],"\"particlesHex\":\"");assert(hex);hex+=16;
  for(unsigned i=0;i<1000;i++)for(unsigned j=0;j<72;j++){unsigned value;assert(sscanf(hex+(i*72+j)*2,"%2x",&value)==1);assert(value==memory[retained_particle_addresses[i]+j]);}
  DWORD swap;memcpy(&swap,memory+100+0x44,4);memcpy(memory+100+0x44,memory+100+0x48,4);memcpy(memory+100+0x48,&swap,4);
 }
 assert(!strcmp(strstr(snapshots[0],"\"particlesHex\""),strstr(snapshots[1],"\"particlesHex\"")));free(snapshots[0]);free(snapshots[1]);
 puts("particle batching: original order, exact bytes, gap fallback, invalid allocations, individual-read audit and hex output passed");return 0;
}
