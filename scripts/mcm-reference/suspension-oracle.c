/* Original suspension helper, with its original sqrt table initialized. */
#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv) {
 if(argc!=4)return 2;
 map_image(argv[1]);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__cdecl *)(void))0x20001640)();
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open suspension cases/results");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid count");
 for(uint32_t i=0;i<count;i++) {
  float v[14],force[3],damping[3];memset(bike,0,sizeof bike);
  if(fread(v,sizeof v,1,in)!=1)fail("truncated input");
  memcpy(bike+0x558,&v[13],4);
  ((void (__attribute__((thiscall)) *)(void*,float*,float*,float,float,float,float,float,float,float*,float*,float))0x200b11e0)(bike,v,v+3,v[6],v[7],v[8],v[9],v[10],v[11],force,damping,v[12]);
  if(fwrite(force,12,1,out)!=1||fwrite(damping,12,1,out)!=1)fail("write suspension result");
 }
 if(fgetc(in)!=EOF)fail("trailing input");
 fclose(in);if(fclose(out))fail("close results");return 0;
}
