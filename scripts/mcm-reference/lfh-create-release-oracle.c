#define main unused_helper_main
#include "oracle.c"
#undef main
static int read_memory(DWORD a,void*out,size_t n){memcpy(out,(void*)(uintptr_t)a,n);return 1;}
static int write_particle_hex(FILE*out,const BYTE*b,size_t n){for(size_t i=0;i<n;i++)fprintf(out,"%02x",b[i]);return !ferror(out);}
#include "capture-rider-heap.c"
static unsigned bin_index(unsigned size){if(size<=512)return (size-1)/16;unsigned bit=0;for(unsigned v=size-1;v>>=1;)bit++;return (bit-7)*16+((size-1)-(1u<<bit))/(1u<<(bit-4));}
static void snapshot(FILE*out,HANDLE heap){fprintf(out,"{\"heap\":%u",(unsigned)(uintptr_t)heap);if(!capture_rider_free_list(out,(DWORD)(uintptr_t)heap,"freeList")||!capture_heap_regions(out,(DWORD)(uintptr_t)heap))fail("snapshot");fprintf(out,"}");}
int main(int argc,char**argv){
 if(argc!=2)return 2;FILE*out=fopen(argv[1],"wx");if(!out)fail("open");unsigned sizes[]={16,48,120,248,504,632,760,888};
 for(unsigned n=0;n<8;n++){
  HANDLE heap=HeapCreate(0,0x200000,0);if(!heap)fail("heap");unsigned size=sizes[n],index=bin_index(size+8);DWORD bins=*(DWORD*)((BYTE*)heap+0x460);if(!bins)fail("bins");
  for(unsigned i=0;!*(DWORD*)(uintptr_t)(bins+index*32+8);i++){if(i>2100||!HeapAlloc(heap,0,size))fail("activation");}
  fprintf(out,"{\"case\":%u,\"request\":%u,\"initial\":",n,size);snapshot(out,heap);fprintf(out,",\"steps\":[");
  unsigned char*slots[36][31];
  for(unsigned g=0;g<36;g++){
   fprintf(out,"%s{\"operation\":\"allocate-group\",\"pointers\":[",g?",":"");
   for(unsigned i=0;i<31;i++){unsigned char*p=HeapAlloc(heap,0,size);if(!p||!(p[-1]&0x80))fail("not LFH");slots[g][i]=p;fprintf(out,"%s%u",i?",":"",(unsigned)(uintptr_t)p);}
   DWORD*w=(DWORD*)(slots[g][0]-8),stride=(w[0]&65535)*8;BYTE*group=slots[g][0]-24-(w[1]&65535)*stride;
   fprintf(out,"],\"affinity\":%lu,\"after\":",*(DWORD*)(group+8));snapshot(out,heap);fprintf(out,"}");
  }
  for(unsigned g=0;g<36;g++){
   fprintf(out,",{\"operation\":\"free-group\",\"pointers\":[");
   for(unsigned i=0;i<31;i++){unsigned j=(i*17)%31;fprintf(out,"%s%u",i?",":"",(unsigned)(uintptr_t)slots[g][j]);if(!HeapFree(heap,0,slots[g][j]))fail("free");}
   fprintf(out,"],\"after\":");snapshot(out,heap);fprintf(out,"}");
  }
  fprintf(out,"]}\n");if(!HeapDestroy(heap))fail("destroy");
 }
 if(fclose(out))fail("write");return 0;
}
