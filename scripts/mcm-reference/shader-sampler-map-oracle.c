// Intact pinned sampler-map producer and modern range helper; no stubs.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
static uint8_t context[0x600],gl[0x800],shader[8];
int main(int argc,char**argv){
 if(argc!=4)return 2;uint8_t*b=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!b)return 3;
 const uint8_t entry[]={0x55,0x89,0xe5,0x83,0xec,0x14},range[]={0x55,0x89,0xe5,0x57,0x56,0x53,0x83,0xec,0x14};
 if(memcmp(b+0x1a43e0,entry,sizeof entry)||memcmp(b+0x1db660,range,sizeof range))return 4;
 DWORD old;if(!VirtualProtect(b+0x2160a8,1,PAGE_READWRITE,&old))return 5;b[0x2160a8]&=~2;
 if(!VirtualProtect(b+0x216360,1,PAGE_READWRITE,&old))return 5;b[0x216360]&=~2;
 *(uintptr_t*)(context+0x3fc)=(uintptr_t)gl;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 6;
 uint32_t a[11],result[3];size_t n;unsigned cases=0;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  *(uint32_t*)shader=a[1];shader[4]=(uint8_t)a[2];memcpy(gl+0x30,a+3,32);
  result[0]=0x12345678;result[1]=0x87654321;
  void*map=((void*(__cdecl*)(void*,void*,uint32_t*,uint32_t*))(b+0x1a43e0))(context,a[0]?NULL:shader,result,result+1);
  if(map&&map!=context+0x574)return 7;result[2]=map!=NULL;
  if(fwrite(result,1,sizeof result,out)!=sizeof result)return 8;cases++;
 }
 fprintf(stderr,"cases=%u\n",cases);int bad=n||ferror(in);fclose(in);return fclose(out)||bad?9:0;
}
