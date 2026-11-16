#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char*allocate(HANDLE heap,unsigned size){*(uintptr_t*)0x2012572c=(uintptr_t)heap;unsigned char*p=((void*(__cdecl*)(uint32_t))0x200bf960)(size);if(!p)fail("allocate");return p;}
static void snapshot(FILE*out,unsigned char*group,unsigned stride){
 DWORD *meta=(DWORD*)group;
 fprintf(out,"{\"address\":%u,\"freeBits\":%lu,\"affinity\":%lu,\"stride\":%u,\"slots\":[",(unsigned)(uintptr_t)group,meta[1],meta[2],stride);
 for(unsigned i=0;i<31;i++){DWORD*w=(DWORD*)(group+16+i*stride);fprintf(out,"%s{\"header\":%u,\"words\":[%lu,%lu]}",i?",":"",(unsigned)(uintptr_t)w,w[0],w[1]);}fprintf(out,"]}");
}
int main(int argc,char**argv){
 if(argc!=3)return 2;map_image(argv[1]);if(memcmp((void*)0x200bf960,"\x56\x57\x8b\x7c\x24\x0c",6))fail("guard");
 *(uintptr_t*)0x201276f8=(uintptr_t)HeapAlloc;*(uint32_t*)0x200ec2bc=0;
 FILE*out=fopen(argv[2],"w");if(!out)fail("open");
 for(unsigned n=0;n<32;n++){
  HANDLE heap=HeapCreate(0,0,0);if(!heap)fail("heap");unsigned size=16+n*24;unsigned char*p=NULL;
  for(unsigned i=0;i<64;i++){p=allocate(heap,size);if(p[-1]&0x80)break;}
  if(!(p[-1]&0x80))fail("LFH not enabled");DWORD*w=(DWORD*)(p-8);unsigned stride=(w[0]&65535)*8,index=w[1]&65535;
  unsigned char*group=p-8-index*stride-16;unsigned char*slots[31]={0};slots[index]=p;
  fprintf(out,"{\"case\":%u,\"request\":%u,\"initial\":",n,size);snapshot(out,group,stride);fprintf(out,",\"steps\":[");
  for(unsigned i=0;i<30;i++){p=allocate(heap,size);w=(DWORD*)(p-8);unsigned j=w[1]&65535;if(!(p[-1]&0x80)||p-8-j*stride-16!=group||slots[j])fail("unexpected group");slots[j]=p;
   fprintf(out,"%s{\"operation\":\"allocate\",\"pointer\":%u,\"after\":",i?",":"",(unsigned)(uintptr_t)p);snapshot(out,group,stride);fprintf(out,"}");
  }
  for(unsigned i=0;i<31;i++){unsigned j=(i*(n%30+1))%31;if(!slots[j]||!HeapFree(heap,0,slots[j]))fail("free");
   fprintf(out,",{\"operation\":\"free\",\"pointer\":%u,\"after\":",(unsigned)(uintptr_t)slots[j]);snapshot(out,group,stride);fprintf(out,"}");
  }
  fprintf(out,"]}\n");if(!HeapDestroy(heap))fail("destroy");
 }
 if(fclose(out))fail("write");return 0;
}
