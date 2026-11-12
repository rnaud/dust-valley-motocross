/* Unmodified original front/rear tire force helpers. */
#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv) {
 if(argc!=4)return 2;
 map_image(argv[1]);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open tire cases/results");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid count");
 for(uint32_t i=0;i<count;i++) {
  float v[10],result[6];memset(bike,0,sizeof bike);
  if(fread(v,sizeof v,1,in)!=1)fail("truncated input");
  memcpy(bike+0x578,v,12);memcpy(bike+0x584,v,12);memcpy(bike+0x5b0,v+7,8);
  ((void (__attribute__((thiscall)) *)(void*,float,float*,float*,float*,float*,float*))0x200b1870)(bike,v[6],v+3,result,result+1,result+2,result+3);
  if(fwrite(result,sizeof result,1,out)!=1)fail("write front result");
  ((void (__attribute__((thiscall)) *)(void*,float,float,float*,float*,float*,float*,float*))0x200b1960)(bike,v[6],v[9],v+3,result,result+1,result+2,result+3);
  if(fwrite(result,sizeof result,1,out)!=1)fail("write rear result");
 }
 if(fgetc(in)!=EOF)fail("trailing input");
 fclose(in);if(fclose(out))fail("close results");return 0;
}
