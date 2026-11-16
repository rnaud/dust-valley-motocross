#define main unused_helper_main
#include "oracle.c"
#undef main
static int read_memory(DWORD a,void*out,size_t n){memcpy(out,(void*)(uintptr_t)a,n);return 1;}
static int write_particle_hex(FILE*out,const BYTE*b,size_t n){for(size_t i=0;i<n;i++)fprintf(out,"%02x",b[i]);return !ferror(out);}
#include "capture-rider-heap.c"
static unsigned char*allocate(HANDLE heap,unsigned size){*(uintptr_t*)0x2012572c=(uintptr_t)heap;unsigned char*p=((void*(__cdecl*)(uint32_t))0x200bf960)(size);if(!p)fail("allocate");if(p[-1]&0x80)fail("unexpected LFH allocation");return p;}
int main(int argc,char**argv){
 if(argc!=3)return 2;map_image(argv[1]);if(memcmp((void*)0x200bf960,"\x56\x57\x8b\x7c\x24\x0c",6))fail("guard");
 *(uintptr_t*)0x201276f8=(uintptr_t)HeapAlloc;*(uint32_t*)0x200ec2bc=0;
 FILE*out=fopen(argv[2],"w");if(!out)fail("open");
 for(unsigned n=0;n<512;n++){
  HANDLE heap=HeapCreate(0,0,0);if(!heap)fail("heap");unsigned char*p[12];
  for(unsigned i=0;i<12;i++)p[i]=allocate(heap,1024+i*800+(n%16)*16);
  for(unsigned i=n%2;i<12;i+=2)if(!HeapFree(heap,0,p[i]))fail("free");
  unsigned request=1024+((n*193)%14000);
  fprintf(out,"{\"case\":%u,\"request\":%u",n,request);if(!capture_rider_free_list(out,(DWORD)(uintptr_t)heap,"freeList"))fail("snapshot");
  unsigned char*result=allocate(heap,request);DWORD words[2];memcpy(words,result-8,8);
  fprintf(out,",\"pointer\":%u,\"words\":[%lu,%lu]",(unsigned)(uintptr_t)result,words[0],words[1]);
  if(!capture_rider_free_list(out,(DWORD)(uintptr_t)heap,"afterFreeList"))fail("after snapshot");fprintf(out,"}\n");
  if(!HeapDestroy(heap))fail("destroy");
 }
 if(fclose(out))fail("write");return 0;
}
