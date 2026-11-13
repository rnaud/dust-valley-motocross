#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char node[0x114];
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void (__cdecl *)(void))0x20001720)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  float v[59];uint32_t r[24];if(fread(v,sizeof v,1,in)!=1)fail("input");
  memset(node,0,sizeof node);memcpy(node+0x84,v,64);memcpy(node+0xc4,v+16,64);*(int*)(node+0x104)=(int)v[32];
  typedef void (__cdecl *Impulse)(float,float,void*,float*,float*,float*,float*,float*,float*,float*,float*,int,float);
  ((Impulse)0x2005b3c0)(v[33],v[34],node,v+35,v+38,v+41,v+44,v+47,v+50,v+53,v+56,(int)v[57],v[58]);
  memcpy(r,v+50,28);memcpy(r+7,node+0xc4,64);memcpy(r+23,node+0x104,4);
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
