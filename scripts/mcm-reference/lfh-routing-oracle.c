#define main unused_helper_main
#include "oracle.c"
#undef main
static int read_memory(DWORD a,void*out,size_t n){memcpy(out,(void*)(uintptr_t)a,n);return 1;}
static int write_particle_hex(FILE*out,const BYTE*b,size_t n){for(size_t i=0;i<n;i++)fprintf(out,"%02x",b[i]);return !ferror(out);}
#include "capture-rider-heap.c"
static unsigned char*allocate(HANDLE heap,unsigned size){*(uintptr_t*)0x2012572c=(uintptr_t)heap;unsigned char*p=((void*(__cdecl*)(uint32_t))0x200bf960)(size);if(!p)fail("allocate");return p;}
static void snapshot(FILE*out,HANDLE heap){fprintf(out,"{\"heap\":%u",(unsigned)(uintptr_t)heap);if(!capture_rider_free_list(out,(DWORD)(uintptr_t)heap,"freeList")||!capture_heap_regions(out,(DWORD)(uintptr_t)heap))fail("snapshot");fprintf(out,"}");}
int main(int argc,char**argv){
 if(argc!=3)return 2;map_image(argv[1]);if(memcmp((void*)0x200bf960,"\x56\x57\x8b\x7c\x24\x0c",6))fail("guard");
 *(uintptr_t*)0x201276f8=(uintptr_t)HeapAlloc;*(uint32_t*)0x200ec2bc=0;
 FILE*out=fopen(argv[2],"w");if(!out)fail("open");
 for(unsigned n=0;n<8;n++){
  HANDLE heap=HeapCreate(0,0,0);if(!heap)fail("heap");unsigned size=16+n*80;unsigned char*p=NULL,*first[31],*second[31];
  for(unsigned i=0;i<64;i++){p=allocate(heap,size);if(p[-1]&0x80)break;}if(!(p[-1]&0x80))fail("LFH enable");first[0]=p;
  for(unsigned i=1;i<31;i++)first[i]=allocate(heap,size);
  second[0]=allocate(heap,size);DWORD*w=(DWORD*)(second[0]-8);unsigned stride=(w[0]&65535)*8,index=w[1]&65535;unsigned char*group=second[0]-8-index*stride-16;DWORD affinity=((DWORD*)group)[2];
  for(unsigned i=0;i<31;i++)if(!HeapFree(heap,0,first[i]))fail("free first");
  fprintf(out,"{\"case\":%u,\"request\":%u,\"affinity\":%lu,\"initial\":",n,size,affinity);snapshot(out,heap);fprintf(out,",\"steps\":[");
  for(unsigned i=0;i<31;i++){p=allocate(heap,size);if(i<30)second[i+1]=p;else first[0]=p;
   fprintf(out,"%s{\"operation\":\"allocate\",\"pointer\":%u,\"after\":",i?",":"",(unsigned)(uintptr_t)p);snapshot(out,heap);fprintf(out,"}");
  }
  for(unsigned i=0;i<32;i++){p=i<31?second[i]:first[0];if(!HeapFree(heap,0,p))fail("free result");fprintf(out,",{\"operation\":\"free\",\"pointer\":%u,\"after\":",(unsigned)(uintptr_t)p);snapshot(out,heap);fprintf(out,"}");}
  fprintf(out,"]}\n");if(!HeapDestroy(heap))fail("destroy");
 }
 if(fclose(out))fail("write");return 0;
}
