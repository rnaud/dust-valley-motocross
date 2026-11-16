// Original CRT _heap_alloc with an explicit private Win32 heap service.
#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);
 if(memcmp((void*)0x200bf960,"\x56\x57\x8b\x7c\x24\x0c",6))fail("guard");
 *(uintptr_t*)0x201276f8=(uintptr_t)HeapAlloc;
 *(uint32_t*)0x200ec2bc=0; // Explicitly select the original large-allocation path.
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t request,result[5];size_t n;unsigned count=0;
 while((n=fread(&request,1,4,in))==4){
  HANDLE heap=HeapCreate(0,0,0);if(!heap)fail("heap");*(uintptr_t*)0x2012572c=(uintptr_t)heap;
  unsigned char*p=((void*(__cdecl*)(uint32_t))0x200bf960)(request);if(!p)fail("allocate");
  result[0]=request;memcpy(result+1,p-8,8);result[3]=(uint32_t)HeapSize(heap,0,p);result[4]=(uint32_t)(uintptr_t)p;
  if(fwrite(result,sizeof result,1,out)!=1)fail("write");if(!HeapFree(heap,0,p)||!HeapDestroy(heap))fail("cleanup");count++;
 }
 if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",count);return 0;
}
