#define main unused_helper_main
#include "oracle.c"
#undef main
static FILE*out;static unsigned calls,case_number;
static LPVOID WINAPI observed_alloc(LPVOID address,SIZE_T size,DWORD type,DWORD protect){
 LPVOID result=case_number==9?NULL:VirtualAlloc(address,size,type,protect);
 fprintf(out,"%s{\"operation\":\"commit\",\"address\":%u,\"size\":%u,\"ok\":%s}",calls++?",":"",(unsigned)(uintptr_t)address,(unsigned)size,result==address?"true":"false");return result;
}
static BOOL WINAPI observed_free(LPVOID address,SIZE_T size,DWORD type){
 BOOL ok=case_number==9?FALSE:VirtualFree(address,size,type);fprintf(out,"%s{\"operation\":\"%s\",\"address\":%u,\"size\":%u,\"ok\":%s}",calls++?",":"",type==MEM_DECOMMIT?"decommit":"release",(unsigned)(uintptr_t)address,(unsigned)size,ok?"true":"false");return ok;
}
static BOOL WINAPI observed_heap_free(HANDLE heap,DWORD flags,LPVOID address){
 BOOL ok=VirtualFree(address,0,MEM_RELEASE);fprintf(out,"%s{\"operation\":\"freeRegion\",\"address\":%u,\"size\":0,\"ok\":%s}",calls++?",":"",(unsigned)(uintptr_t)address,ok?"true":"false");return ok;
}
static void hex(unsigned char*b,unsigned n){for(unsigned i=0;i<n;i++)fprintf(out,"%02x",b[i]);}
static void snapshot(void){
 unsigned char*head=(void*)0x200ebaa0,*r=head;unsigned n=0;
 fprintf(out,"{\"head\":%u,\"currentRegion\":%u,\"freePageCounter\":%u,\"threshold\":480,\"regions\":[",(unsigned)(uintptr_t)head,*(unsigned*)0x200ec2b4,*(unsigned*)0x200ec2b8);
 do{
  fprintf(out,"%s{\"address\":%u,\"hex\":\"",n++?",":"",(unsigned)(uintptr_t)r);hex(r,0x814);fprintf(out,"\",\"pages\":[");
  unsigned char*base=*(void**)(r+0x810);unsigned pages=0;
  if(base)for(unsigned i=0;i<1024;i++)if(r[16+i]!=255){fprintf(out,"%s{\"address\":%u,\"freeUnits\":%u,\"hex\":\"",pages++?",":"",(unsigned)(uintptr_t)(base+i*4096),r[16+i]);hex(base+i*4096,256);fprintf(out,"\"}");}
  fprintf(out,"]}");r=*(void**)r;
 }while(r!=head);fprintf(out,"]}");
}
static uint32_t random_state=8123;
static uint32_t next_random(void){random_state=random_state*1664525u+1013904223u;return random_state;}
int main(int argc,char**argv){
 if(argc!=3)return 2;map_image(argv[1]);if(memcmp((void*)0x200c55d0,"\x53\x56\x57",3))fail("guard");
 *(uintptr_t*)0x20127770=(uintptr_t)observed_alloc;*(uintptr_t*)0x2012776c=(uintptr_t)observed_free;
 *(uintptr_t*)0x201276fc=(uintptr_t)observed_heap_free;
 out=fopen(argv[2],"wx");if(!out)fail("open");
 for(unsigned n=0;n<11;n++){case_number=n;
  unsigned char*regions[2]={(void*)0x200ebaa0,VirtualAlloc(NULL,4096,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)},*bases[2];
  if(!regions[1])fail("region metadata");
  for(unsigned j=0;j<2;j++){
   unsigned char*r=regions[j];memset(r,0,0x814);*(void**)r=regions[n==10?j:1-j];*(void**)(r+4)=regions[n==10?j:1-j];*(DWORD*)(r+8)=n>=10||n==8?0:(j?15:0);*(DWORD*)(r+12)=n>=10||n==8?1:16;
   memset(r+16,255,1024);memset(r+0x410,241,1024);
   bases[j]=VirtualAlloc(NULL,0x400000,MEM_RESERVE,PAGE_READWRITE);if(!bases[j]||!VirtualAlloc(bases[j],65536,MEM_COMMIT,PAGE_READWRITE))fail("initial pages");*(void**)(r+0x810)=bases[j];
   for(unsigned i=0;i<(n>=10||n==8?1:16);i++){
    unsigned char*p=bases[j]+i*4096;unsigned used=n==10?1:(n==8?j:(i==0?1:(i<4?0:230)));
    *(void**)p=p+8+used;*(DWORD*)(p+4)=240-used;p[248]=255;p[8]=used;r[16+i]=240-used;
   }
  }
  *(void**)0x200ec2b4=regions[n==8?1:n%2];*(DWORD*)0x200ec2b8=31;
  fprintf(out,"{\"case\":%u,\"initial\":",n);snapshot();fprintf(out,",\"steps\":[");
  uintptr_t live[256];unsigned count=0;
  for(unsigned step=0;step<(n>=10||n==8?1:192);step++){
   unsigned isFree=step==0||(count&&(next_random()%100)<45);uintptr_t pointer;unsigned units=1+next_random()%240;
   if(isFree){unsigned index=count?next_random()%count:0;pointer=step==0?(uintptr_t)(bases[n==8?1:n%2]+256):live[index];if(step)live[index]=live[--count];fprintf(out,"%s{\"operation\":\"free\",\"pointer\":%u,\"services\":[",step?",":"",(unsigned)pointer);}
   else fprintf(out,"%s{\"operation\":\"allocate\",\"units\":%u,\"services\":[",step?",":"",units);
   calls=0;
   if(isFree){unsigned char*p=(void*)(pointer&~4095u),*r=pointer>=(uintptr_t)bases[0]&&pointer<(uintptr_t)bases[0]+0x400000?regions[0]:regions[1];((void(__cdecl*)(void*,void*,void*))0x200c5580)(r,p,p+8+(pointer-(uintptr_t)p-256)/16);}
   else {pointer=(uintptr_t)((void*(__cdecl*)(unsigned))0x200c55d0)(units);if(pointer)live[count++]=pointer;}
   fprintf(out,"],\"result\":%u,\"after\":",isFree?0:(unsigned)pointer);snapshot();fprintf(out,"}");
  }
  fprintf(out,"]}\n");for(unsigned j=0;j<2;j++)VirtualFree(bases[j],0,MEM_RELEASE);VirtualFree(regions[1],0,MEM_RELEASE);
 }
 if(fclose(out))fail("write");return 0;
}
