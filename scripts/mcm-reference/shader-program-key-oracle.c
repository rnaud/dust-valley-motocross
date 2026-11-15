#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
static uint8_t node[0xb78];
int main(int argc,char**argv){
 if(argc!=4)return 2;uint8_t*b=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!b)return 3;
 const uint8_t guard[]={0x55,0x89,0xe5,0x53,0x8b,0x55,0x08};if(memcmp(b+0x86760,guard,sizeof guard))return 4;
 const unsigned offsets[]={0x18,0x69c,0x6a8,0x6b8,0x6c8,0xb74};
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 5;
 uint32_t a[12];size_t n;unsigned cases=0;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset(node,0x77,sizeof node);for(unsigned i=0;i<6;i++)*(uint32_t*)(node+offsets[i])=a[6+i];
  int32_t result=((int32_t(__cdecl*)(void*,void*))(b+0x86760))(a,node);
  if(fwrite(&result,4,1,out)!=1)return 6;cases++;
 }
 fprintf(stderr,"cases=%u\n",cases);int bad=n||ferror(in);fclose(in);return fclose(out)||bad?7:0;
}
