#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char component[0x60],node[0x114];
int main(int argc,char**argv) {
 if(argc!=4)return 2;
 map_image(argv[1]);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open rotating suspension cases/results");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid count");
 for(uint32_t i=0;i<count;i++) {
  float v[27],velocity[3];memset(component,0,sizeof component);memset(node,0,sizeof node);
  if(fread(v,sizeof v,1,in)!=1)fail("truncated input");
  *(void**)component=node;node[0x104]=1;memcpy(node+0x84,v,64);
  memcpy(component+0x54,v+19,4);memcpy(component+0x48,v+20,8);memcpy(component+0x58,v+22,8);
  uint32_t increasing=((int (__attribute__((thiscall)) *)(void*,float,float,float*,float*,float*))0x2009ebf0)(component,v[16],v[17],v+18,v+24,velocity);
  if(fwrite(v+24,12,1,out)!=1||fwrite(velocity,12,1,out)!=1||fwrite(v+18,4,1,out)!=1||fwrite(component+0x58,4,1,out)!=1||fwrite(node+0x84,64,1,out)!=1||fwrite(component+0x44,4,1,out)!=1||fwrite(&increasing,4,1,out)!=1||fwrite(node+0x104,4,1,out)!=1)fail("write result");
 }
 if(fgetc(in)!=EOF)fail("trailing input");
 fclose(in);if(fclose(out))fail("close results");return 0;
}
