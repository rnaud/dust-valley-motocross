#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char node[0x114],owner[0x40],audio[0x40],audio_world[0x200];
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void (__cdecl *)(void))0x20001720)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  float v[72];uint32_t r[29];if(fread(v,sizeof v,1,in)!=1)fail("input");
  memset(node,0,sizeof node);memcpy(node+0x84,v,64);memcpy(node+0xc4,v+16,64);*(int*)(node+0x104)=(int)v[32];
  memset(bike,0,sizeof bike);memset(owner,0,sizeof owner);memset(audio,0,sizeof audio);memset(audio_world,0,sizeof audio_world);
  *(void**)(bike+0x434)=node;*(void**)(bike+0x41c)=owner;*(void**)(owner+0x3c)=audio;*(void**)(audio+0x3c)=audio_world;
  memcpy(bike+0x55c,v+34,4);memcpy(bike+0x5e0,v+33,4);memcpy(bike+0x5f0,v+44,12);memcpy(bike+0x5fc,v+59,12);
  memcpy(bike+0x534,v+50,12);memcpy(bike+0x510,v+53,12);memcpy(bike+0x528,v+62,12);memcpy(bike+0x654,v+65,12);*(int*)(bike+0x844)=(int)v[68];
  typedef void (__attribute__((thiscall))*Impulse)(void*,float*,float*,float*,float*,float*,int,float);
  ((Impulse)0x2009d7f0)(bike,v+35,v+38,v+41,v+69,v+47,(int)v[57],v[58]);
  memcpy(r,bike+0x534,12);memcpy(r+3,bike+0x510,12);memcpy(r+6,bike+0x528,12);memcpy(r+9,bike+0x654,12);memcpy(r+12,node+0xc4,64);memcpy(r+28,node+0x104,4);
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
