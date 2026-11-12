#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char component[0x60],node[0x114];
int main(int argc,char**argv) {
 if(argc!=4)return 2;
 map_image(argv[1]);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__cdecl *)(void))0x2009d650)();
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open rotating contact cases/results");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid count");
 for(uint32_t i=0;i<count;i++) {
  float v[35],displacement[3],velocity[3],compression,travel;uint32_t contact;
  memset(bike,0,sizeof bike);memset(component,0,sizeof component);memset(node,0,sizeof node);
  if(fread(v,sizeof v,1,in)!=1)fail("truncated input");
  *(void**)component=node;*(void**)(bike+0x8e8)=component;node[0x104]=1;memcpy(node+0x84,v,64);
  memcpy(component+0x54,v+18,4);memcpy(component+0x48,v+19,8);memcpy(component+0x58,v+21,8);
  memcpy(bike+0x594,v+17,4);memcpy(bike+0x510,v+32,12);
  ((void (__attribute__((thiscall)) *)(void*,float,float*,float*,float*,float*,float*,float*,float*,uint32_t*))0x200b0f60)(bike,v[16],v+23,v+26,v+29,displacement,velocity,&compression,&travel,&contact);
  if(fwrite(displacement,12,1,out)!=1||fwrite(velocity,12,1,out)!=1||fwrite(&compression,4,1,out)!=1||fwrite(&travel,4,1,out)!=1||fwrite(node+0x84,64,1,out)!=1||fwrite(component+0x58,4,1,out)!=1||fwrite(component+0x44,4,1,out)!=1||fwrite(&contact,4,1,out)!=1||fwrite(node+0x104,4,1,out)!=1)fail("write result");
 }
 if(fgetc(in)!=EOF)fail("trailing input");
 fclose(in);if(fclose(out))fail("close results");return 0;
}
