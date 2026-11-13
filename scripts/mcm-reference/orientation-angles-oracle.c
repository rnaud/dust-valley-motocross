#define main unused_helper_main
#include "oracle.c"
#undef main
#include "oracle-imports.h"
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);bind_oracle_kernel_imports();
 if(!((int (__cdecl *)(void))0x200c5230)())fail("CRT heap");
 if(!((int (__cdecl *)(void))0x200c24e0)())fail("CRT thread");
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  float v[6],r[6];if(fread(v,sizeof v,1,in)!=1)fail("input");
  typedef int (__cdecl *Angles)(float,float,float,float,float,float,float*,float*,float*,float*,float*,float*);
  int result=((Angles)0x2003f870)(v[0],v[1],v[2],v[3],v[4],v[5],r,r+1,r+2,r+3,r+4,r+5);
  if(result!=1)fail("return");
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
