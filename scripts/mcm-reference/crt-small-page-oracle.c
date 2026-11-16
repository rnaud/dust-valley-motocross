#define main unused_helper_main
#include "oracle.c"
#undef main
static uint32_t random_state=0x512bc;
static uint32_t next_random(void){random_state=random_state*1664525u+1013904223u;return random_state;}
static void snapshot(FILE*out,unsigned char*page,unsigned char*region){
 fprintf(out,"{\"address\":%u,\"freeUnits\":%u,\"hex\":\"",(unsigned)(uintptr_t)page,region[16]);
 for(unsigned i=0;i<256;i++)fprintf(out,"%02x",page[i]);fprintf(out,"\"}");
}
int main(int argc,char**argv){
 if(argc!=3)return 2;map_image(argv[1]);
 if(memcmp((void*)0x200c5850,"\x8b\x44\x24\x04\x53",5))fail("page guard");
 unsigned char*page=VirtualAlloc(NULL,4096,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE);if(!page)fail("page");
 unsigned char region[0x814];FILE*out=fopen(argv[2],"wx");if(!out)fail("open");
 for(unsigned n=0;n<64;n++){
  memset(page,0,4096);memset(region,0,sizeof(region));*(uintptr_t*)(region+0x810)=(uintptr_t)page;region[16]=240;region[0x410]=241;
  *(uintptr_t*)page=(uintptr_t)(page+8);*(DWORD*)(page+4)=240;page[248]=255;
  uintptr_t live[240];unsigned count=0;
  fprintf(out,"{\"case\":%u,\"initial\":",n);snapshot(out,page,region);fprintf(out,",\"steps\":[");
  for(unsigned step=0;step<256;step++){
   if(step)fprintf(out,",");
   if(count&&(next_random()%100)<(n%2?48:28)){
    unsigned index=next_random()%count;uintptr_t pointer=live[index];unsigned char*map=page+8+(pointer-(uintptr_t)page-256)/16;
    *(DWORD*)0x200ec2b8=0; // Isolate page free from the separate region decommit service.
    ((void(__cdecl*)(void*,void*,void*))0x200c5580)(region,page,map);live[index]=live[--count];
    fprintf(out,"{\"operation\":\"free\",\"pointer\":%u,\"after\":",(unsigned)pointer);
   }else{
    unsigned units=1+next_random()%(n<48?30:240);
    uintptr_t pointer=(uintptr_t)((void*(__cdecl*)(void*,unsigned,unsigned))0x200c5850)(page,region[16],units);
    if(pointer){region[16]-=units;live[count++]=pointer;}
    fprintf(out,"{\"operation\":\"allocate\",\"units\":%u,\"pointer\":%u,\"after\":",units,(unsigned)pointer);
   }
   snapshot(out,page,region);fprintf(out,"}");
  }
  fprintf(out,"]}\n");
 }
 if(fclose(out))fail("write");return 0;
}
