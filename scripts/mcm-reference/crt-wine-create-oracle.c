#define main unused_helper_main
#include "oracle.c"
#undef main
static FILE*out;static unsigned calls,fail_stage;
static void*metadata;static HANDLE backing_heap;
static int read_memory(DWORD a,void*out,size_t n){memcpy(out,(void*)(uintptr_t)a,n);return 1;}
static int write_particle_hex(FILE*out,const BYTE*b,size_t n){for(size_t i=0;i<n;i++)fprintf(out,"%02x",b[i]);return !ferror(out);}
#include "capture-rider-heap.c"

static LPVOID WINAPI observed_alloc(LPVOID address,SIZE_T size,DWORD type,DWORD protect){
 unsigned reserve=type==MEM_RESERVE;
 LPVOID result=fail_stage==(reserve?2:3)?NULL:VirtualAlloc(address,size,type,protect);
 fprintf(out,"%s{\"operation\":\"%s\",\"address\":%u,\"size\":%u,",calls++?",":"",reserve?"reserve":"commit",(unsigned)(uintptr_t)address,(unsigned)size);
 if(reserve)fprintf(out,"\"result\":%u}",(unsigned)(uintptr_t)result);else fprintf(out,"\"ok\":%s}",result?"true":"false");return result;
}
static BOOL WINAPI observed_free(LPVOID address,SIZE_T size,DWORD type){
 BOOL ok=VirtualFree(address,size,type);fprintf(out,"%s{\"operation\":\"release\",\"address\":%u,\"size\":0,\"ok\":%s}",calls++?",":"",(unsigned)(uintptr_t)address,ok?"true":"false");return ok;
}
static LPVOID WINAPI observed_heap_alloc(HANDLE heap,DWORD flags,SIZE_T size){
 metadata=fail_stage==1?NULL:HeapAlloc(heap,flags,size);
 fprintf(out,"%s{\"operation\":\"allocateRegion\",\"address\":0,\"size\":%u,\"result\":%u}",calls++?",":"",(unsigned)size,(unsigned)(uintptr_t)metadata);return metadata;
}
static BOOL WINAPI observed_heap_free(HANDLE heap,DWORD flags,LPVOID address){
 BOOL ok=HeapFree(heap,flags,address);metadata=NULL;
 fprintf(out,"%s{\"operation\":\"freeRegion\",\"address\":%u,\"size\":0,\"ok\":%s}",calls++?",":"",(unsigned)(uintptr_t)address,ok?"true":"false");return ok;
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
static void pair_snapshot(void){
 fprintf(out,"{\"crt\":");snapshot();fprintf(out,",\"wine\":{\"heap\":%u",(unsigned)(uintptr_t)backing_heap);
 if(!capture_rider_free_list(out,(DWORD)(uintptr_t)backing_heap,"freeList")||!capture_heap_regions(out,(DWORD)(uintptr_t)backing_heap))fail("wine snapshot");fprintf(out,"}}");
}
int main(int argc,char**argv){
 if(argc!=3)return 2;map_image(argv[1]);if(memcmp((void*)0x200c5270,"\x83\x3d",2))fail("guard");
 *(uintptr_t*)0x20127770=(uintptr_t)observed_alloc;*(uintptr_t*)0x2012776c=(uintptr_t)observed_free;
 *(uintptr_t*)0x201276f8=(uintptr_t)observed_heap_alloc;*(uintptr_t*)0x201276fc=(uintptr_t)observed_heap_free;
 out=fopen(argv[2],"wx");if(!out)fail("open");
 for(unsigned n=0;n<4;n++){
  unsigned char*head=(void*)0x200ebaa0,*base=NULL;memset(head,0,0x814);*(void**)head=head;*(void**)(head+4)=head;*(DWORD*)(head+12)=0xffffffff;
  if(n%2){
   base=VirtualAlloc(NULL,0x400000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE);if(!base)fail("initial region");*(void**)(head+0x810)=base;memset(head+0x410,241,1024);
   for(unsigned i=0;i<1024;i++){unsigned char*p=base+i*4096;*(void**)p=p+8;p[8]=240;p[248]=255;}
  }
  *(void**)0x200ec2b4=head;*(DWORD*)0x200ec2b8=0;metadata=NULL;fail_stage=0;
  backing_heap=HeapCreate(0,0,0);if(!backing_heap)fail("backing heap");*(void**)0x2012572c=backing_heap;
  unsigned units=n<2?30:240;
  fprintf(out,"{\"case\":%u,\"initial\":",n);pair_snapshot();fprintf(out,",\"steps\":[{\"operation\":\"allocate\",\"units\":%u,\"services\":[",units);calls=0;
  uintptr_t result=(uintptr_t)((void*(__cdecl*)(unsigned))0x200c55d0)(units);
  fprintf(out,"],\"result\":%u,\"after\":",(unsigned)result);pair_snapshot();fprintf(out,"}]}\n");
  if(result){unsigned char*r=*(void**)0x200ec2b4;VirtualFree(*(void**)(r+0x810),0,MEM_RELEASE);}
  if(base)VirtualFree(base,0,MEM_RELEASE);if(metadata)HeapFree(backing_heap,0,metadata);if(!HeapDestroy(backing_heap))fail("destroy");
 }
 if(fclose(out))fail("write");return 0;
}
