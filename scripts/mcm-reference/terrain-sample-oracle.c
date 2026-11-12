#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char nodes[3][0x58],samples[17*17*16];
static void*children[2][256];
int main(int argc,char**argv) {
 if(argc!=4)return 2;
 map_image(argv[1]);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__cdecl *)(void))0x20001720)();
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open terrain cases/results");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid count");
 for(uint32_t i=0;i<count;i++) {
  float v[9],normal[3];memset(nodes,0,sizeof nodes);memset(children,0,sizeof children);
  if(fread(v,sizeof v,1,in)!=1)fail("truncated input");
  int mode=(int)v[0],x=(int)v[1],z=(int)v[2];
  memcpy(nodes[0]+0xc,v+4,8);*(void**)(nodes[0]+0x50)=samples;
  for(int j=0;j<289;j++){uint16_t h=(uint16_t)((int)v[3]+j*137);memcpy(samples+j*16+2,&h,2);memcpy(samples+j*16+4,v+6,12);}
  for(int j=1;j<3;j++){*(uint32_t*)(nodes[j]+0x20)=j;*(void**)(nodes[j]+0x54)=children[j-1];for(int k=0;k<256;k++)children[j-1][k]=nodes[j-1];}
  unsigned char*root=nodes[mode<3?mode:1];
  if(mode==3)*(void**)(root+0x54)=NULL;
  if(mode==4)memset(children[0],0,sizeof children[0]);
  double height=((double (__attribute__((thiscall)) *)(void*,int,int))0x2008a730)(root,x,z);
  double heightNormal=((double (__attribute__((thiscall)) *)(void*,int,int,float*))0x2008a840)(root,x,z,normal);
  if(fwrite(&height,8,1,out)!=1||fwrite(&heightNormal,8,1,out)!=1||fwrite(normal,12,1,out)!=1)fail("write result");
 }
 if(fgetc(in)!=EOF)fail("trailing input");
 fclose(in);if(fclose(out))fail("close results");return 0;
}
