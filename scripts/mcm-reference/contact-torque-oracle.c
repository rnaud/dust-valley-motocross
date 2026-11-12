/* Execute the unmodified original contact torque helper. */
#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv) {
 if(argc!=4)return 2;
 map_image(argv[1]);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open torque cases/results");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid count");
 for(uint32_t i=0;i<count;i++) {
  float v[13],torque[3];unsigned char component[0x48]={0};memset(bike,0,sizeof bike);
  if(fread(v,sizeof v,1,in)!=1)fail("truncated input");
  memcpy(bike+0x4dc,v+6,4);memcpy(bike+0x534,v+7,4);
  *(uint32_t*)(bike+0x614)=(uint32_t)v[8];
  memcpy(bike+0x6ec,v+10,4);memcpy(component+0x44,v+11,4);
  *(void**)(bike+0x8ec)=component;
  ((void* (__attribute__((thiscall)) *)(void*,float*,float*,float*,int,float))0x200b1ad0)(bike,torque,v,v+3,(int)v[9],v[12]);
  if(fwrite(torque,12,1,out)!=1||fwrite(bike+0x534,4,1,out)!=1)fail("write torque result");
 }
 if(fgetc(in)!=EOF)fail("trailing input");
 fclose(in);if(fclose(out))fail("close results");return 0;
}
