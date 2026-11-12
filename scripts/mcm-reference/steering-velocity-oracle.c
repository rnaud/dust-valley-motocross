/* Original steering velocity correction, including all mutable bike fields. */
#define main unused_helper_main
#include "oracle.c"
#undef main
#include "oracle-imports.h"
static unsigned char component[0x48];
int main(int argc,char**argv) {
 if(argc!=4)return 2;
 map_image(argv[1]);
 bind_oracle_kernel_imports();
 if(!((int (__cdecl *)(void))0x200c5230)())fail("initialize original CRT heap");
 if(!((int (__cdecl *)(void))0x200c24e0)())fail("initialize original CRT thread state");
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open steering cases/results");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid count");
 for(uint32_t i=0;i<count;i++) {
  float v[18];memset(bike,0,sizeof bike);
  if(fread(v,sizeof v,1,in)!=1)fail("truncated input");
  memcpy(bike+0x510,v+6,12);memcpy(bike+0x540,v+9,12);memcpy(component+0x44,v+12,4);*(void**)(bike+0x8ec)=component;
  memcpy(bike+0x5d8,v+13,4);memcpy(bike+0x560,v+14,8);*(uint32_t*)(bike+0x620)=(uint32_t)v[17];
  float angle=((float (__attribute__((thiscall)) *)(void*,float*,float*,float))0x200b1320)(bike,v,v+3,v[16]);
  if(fwrite(bike+0x510,12,1,out)!=1||fwrite(bike+0x540,12,1,out)!=1||fwrite(bike+0x6b4,4,1,out)!=1||fwrite(&angle,4,1,out)!=1)fail("write result");
 }
 if(fgetc(in)!=EOF)fail("trailing input");
 fclose(in);if(fclose(out))fail("close results");return 0;
}
