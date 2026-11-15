// Intact 1d7ec0 pixel descriptor and b04c0 texture-argument predicate.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
static uint8_t state[0x1c2c],caps[0xa0],decl[0x20],vertex[0xa0],declaration[0x20],views[8][8],textures[8][0x108],formats[8][0x88],out[132];
int main(int argc,char**argv){
 if(argc!=4)return 2;uint8_t*b=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!b)return 3;
 const uint8_t guard[]={0x55,0x89,0xe5,0x57,0x56,0x53,0x83,0xe4,0xf8};if(memcmp(b+0x1d7ec0,guard,sizeof guard))return 4;
 FILE*in=fopen(argv[2],"rb"),*output=fopen(argv[3],"wb");if(!in||!output)return 5;
 uint32_t a[231];size_t n;unsigned cases=0;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  if(a[33]>8)return 6;
  memset(state,0,sizeof state);memset(caps,0,sizeof caps);memset(decl,0,sizeof decl);memset(vertex,0,sizeof vertex);memset(declaration,0,sizeof declaration);memset(views,0,sizeof views);memset(textures,0,sizeof textures);memset(formats,0,sizeof formats);memcpy(out,a,132);
  *(uint32_t*)(caps+8)=a[33];*(uint32_t*)(caps+0x30)=a[34];caps[0x51]=a[35];caps[0x54]=a[35]>>8;caps[0x55]=a[35]>>16;
  memcpy(state+0x1c20,a+36,4);*(uint32_t*)(state+0x1c24)=a[37];*(uint32_t*)(state+0x1ae4)=a[38];*(uint32_t*)(state+0x1a4)=a[39];*(uint32_t*)(state+0x1958)=a[40];*(uint32_t*)(state+0x1c28)=a[41];
  *(uintptr_t*)(state+0x1b8)=a[42]?(uintptr_t)vertex:0;*(uint32_t*)(vertex+0x9c)=a[43];decl[0x18]=a[44];decl[0x1d]=a[44]>>8;*(uintptr_t*)(state+0x2c)=(uintptr_t)decl;
  *(uintptr_t*)(state+8)=a[45]?(uintptr_t)declaration:0;declaration[0x19]=a[46];
  for(unsigned j=0;j<8;j++){
   if(a[47+j*18]>26||a[47+j*18+3]>26)return 6;memcpy(state+0x13c4+j*0x48,a+47+j*18,72);
   const uint32_t*t=a+191+j*5;*(uintptr_t*)(state+0x784+j*4)=t[0]?(uintptr_t)views[j]:0;*(uintptr_t*)(views[j]+4)=t[1]?(uintptr_t)textures[j]:0;
   *(uint16_t*)(formats[j]+0x84)=t[2];*(uintptr_t*)(textures[j]+0x1c)=(uintptr_t)formats[j];*(uint32_t*)(textures[j]+0x18)=t[3];textures[j][0x104]=t[4];
  }
  ((void(__cdecl*)(void*,void*,void*))(b+0x1d7ec0))(state,caps,out);
  if(fwrite(out,1,sizeof out,output)!=sizeof out)return 7;cases++;
 }
 fprintf(stderr,"cases=%u\n",cases);int bad=n||ferror(in);fclose(in);return fclose(output)||bad?8:0;
}
