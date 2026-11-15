// Intact pinned fixed-function vertex descriptor producer, no function stubs.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
static uint8_t state[0x1c20],decl[0x20],stream[0x388],caps[0x58],out[44];
static uint32_t lights[8];
int main(int argc,char**argv){
 if(argc!=4)return 2;uint8_t*b=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!b)return 3;
 const uint8_t guard[]={0x55,0xb9,0x0b,0,0,0,0x89,0xe5};if(memcmp(b+0x1d8600,guard,sizeof guard))return 4;
 DWORD old;if(!VirtualProtect(b+0x216360,1,PAGE_READWRITE,&old))return 5;b[0x216360]&=~1;
 const unsigned offsets[]={0x1b10,0x1af0,0x1ad8,0x1aec,0x1928,0x1a4,0x1ae8,0x1af8,0x1b04,0x1b00,0x1afc,0x1924,0x1ae4,0x1974};
 FILE*in=fopen(argv[2],"rb"),*output=fopen(argv[3],"wb");if(!in||!output)return 6;
 uint32_t a[35];size_t n;unsigned cases=0;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset(state,0,sizeof state);memset(decl,0,sizeof decl);memset(stream,0,sizeof stream);memset(caps,0,sizeof caps);memset(out,0xcc,sizeof out);
  memcpy(decl+0x18,a,6);*(uintptr_t*)(state+0x2c)=(uintptr_t)decl;
  for(unsigned j=0;j<14;j++)*(uint32_t*)(state+offsets[j])=a[2+j];
  memcpy(state+0x1c1c,a+16,4);
  for(unsigned j=0;j<8;j++){
   *(uint32_t*)(state+0x13ec+j*0x48)=a[17+j];lights[j]=a[25+j];
   *(uintptr_t*)(state+0x1894+j*4)=lights[j]==0xffffffff?0:(uintptr_t)(lights+j);
  }
  memcpy(caps+0x54,a+33,2);*(uint32_t*)(stream+0x384)=a[34];
  ((void(__cdecl*)(void*,void*,void*,void*))(b+0x1d8600))(state,stream,caps,out);
  if(fwrite(out,1,sizeof out,output)!=sizeof out)return 7;cases++;
 }
 fprintf(stderr,"cases=%u\n",cases);int bad=n||ferror(in);fclose(in);return fclose(output)||bad?8:0;
}
