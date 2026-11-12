#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char nodes[3][0x114];
int main(int argc,char**argv) {
 if(argc!=4)return 2;
 map_image(argv[1]);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open transform cases/results");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid count");
 for(uint32_t i=0;i<count;i++) {
  float v[52],result[3];memset(nodes,0,sizeof nodes);
  if(fread(v,sizeof v,1,in)!=1)fail("truncated input");
  int mode=(int)v[51],depth=mode==3?2:mode;
  for(int j=0;j<3;j++) {
   memcpy(nodes[j]+0x84,v+16*j,64);
   if(j)*(void**)(nodes[j]+0x108)=nodes[j-1];
  }
  if(mode==3){memcpy(nodes[2]+0xc4,v,64);nodes[2][0x104]=7;}
  ((void* (__attribute__((thiscall)) *)(void*,float*,float*))0x200b8720)(nodes[depth],result,v+48);
  if(fwrite(nodes[depth]+0xc4,64,1,out)!=1||fwrite(result,12,1,out)!=1)fail("write transform result");
  for(int j=0;j<3;j++)if(fwrite(nodes[j]+0x104,4,1,out)!=1)fail("write flags");
 }
 if(fgetc(in)!=EOF)fail("trailing input");
 fclose(in);if(fclose(out))fail("close results");return 0;
}
