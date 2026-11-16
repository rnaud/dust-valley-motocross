// Observe Wine block splitting/coalescing around original CRT allocations.
#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char *allocate(HANDLE heap,uint32_t size){
 *(uintptr_t*)0x2012572c=(uintptr_t)heap;
 unsigned char*p=((void*(__cdecl*)(uint32_t))0x200bf960)(size);
 if(!p)fail("allocate");return p;
}
static void record(FILE*out,unsigned id,unsigned stage,unsigned char*anchor,unsigned char*next){
 uint32_t words[2];memcpy(words,anchor-8,8);
 fprintf(out,"{\"case\":%u,\"stage\":%u,\"pointer\":%u,\"next\":%u,\"words\":[%u,%u]}\n",id,stage,(unsigned)(uintptr_t)anchor,(unsigned)(uintptr_t)next,words[0],words[1]);
}
int main(int argc,char**argv){
 if(argc!=3)return 2;map_image(argv[1]);
 if(memcmp((void*)0x200bf960,"\x56\x57\x8b\x7c\x24\x0c",6))fail("guard");
 *(uintptr_t*)0x201276f8=(uintptr_t)HeapAlloc;*(uint32_t*)0x200ec2bc=0;
 FILE*out=fopen(argv[2],"w");if(!out)fail("open");
 for(unsigned i=0;i<128;i++){
  HANDLE heap=HeapCreate(0,0,0);if(!heap)fail("heap");
  unsigned size=2048+i*16,other=1024+(i%11)*16;
  unsigned char *guard=allocate(heap,1552),*b=allocate(heap,size),*c=allocate(heap,other),*end=allocate(heap,1024);
  if(b!=guard+1560||c!=b+size+8||end!=c+other+8)fail("noncontiguous setup");
  record(out,i,0,b,c);
  if(!HeapFree(heap,0,c))fail("free c");record(out,i,1,b,c);
  if(!HeapFree(heap,0,b))fail("free b");record(out,i,2,b,c);
  unsigned char*reuse=allocate(heap,size-512);if(reuse!=b)fail("unexpected reuse");record(out,i,3,b,reuse);
  if(!HeapFree(heap,0,reuse))fail("free reuse");record(out,i,4,b,reuse);
  if(!HeapDestroy(heap))fail("destroy");
 }
 if(fclose(out))fail("write");return 0;
}
