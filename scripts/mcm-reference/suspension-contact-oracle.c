#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char component[0x60],node[0x114];
int main(int argc,char**argv) {
 if(argc!=4)return 2;
 map_image(argv[1]);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__cdecl *)(void))0x2009d650)();
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open contact cases/results");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid count");
 for(uint32_t i=0;i<count;i++) {
  float v[18],displacement[3],velocity[3],compression,travel;uint32_t limited;
  memset(bike,0,sizeof bike);memset(component,0,sizeof component);memset(node,0,sizeof node);
  if(fread(v,sizeof v,1,in)!=1)fail("truncated input");
  *(void**)component=node;node[0x104]=1;*(void**)(bike+0x8e4)=component;
  memcpy(component+0x48,v+3,4);memcpy(component+0x58,v+4,8);memcpy(component+0x4c,v+15,12);
  memcpy(bike+0x590,v+1,4);memcpy(bike+0x5a4,v+2,4);memcpy(bike+0x598,v+12,12);
  ((void (__attribute__((thiscall)) *)(void*,float,float*,float*,float*,float*,float*,float*,uint32_t*))0x200b0db0)(bike,v[0],v+6,v+9,displacement,velocity,&compression,&travel,&limited);
  if(fwrite(displacement,12,1,out)!=1||fwrite(velocity,12,1,out)!=1||fwrite(&compression,4,1,out)!=1||fwrite(&travel,4,1,out)!=1||fwrite(node+0xb4,12,1,out)!=1||fwrite(component+0x4c,12,1,out)!=1||fwrite(component+0x5c,4,1,out)!=1||fwrite(component+0x44,4,1,out)!=1||fwrite(&limited,4,1,out)!=1||fwrite(node+0x104,4,1,out)!=1)fail("write result");
 }
 if(fgetc(in)!=EOF)fail("trailing input");
 fclose(in);if(fclose(out))fail("close results");return 0;
}
