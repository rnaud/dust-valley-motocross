/* Execute the original force limiter and both mutable scalar outputs. */
#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv) {
 if(argc!=4)return 2;
 map_image(argv[1]);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open force limit cases/results");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid count");
 for(uint32_t i=0;i<count;i++) {
  float v[8],result[3];memset(bike,0,sizeof bike);
  if(fread(v,sizeof v,1,in)!=1)fail("truncated input");
  memcpy(bike+0x558,v,4);
  ((void* (__attribute__((thiscall)) *)(void*,float*,float*,float,float*,float,float*))0x200ad310)(bike,result,v+4,v[3],v+5,v[1],v+2);
  if(fwrite(result,12,1,out)!=1||fwrite(v+4,4,1,out)!=1||fwrite(v+2,4,1,out)!=1)fail("write result");
 }
 if(fgetc(in)!=EOF)fail("trailing input");
 fclose(in);if(fclose(out))fail("close results");return 0;
}
