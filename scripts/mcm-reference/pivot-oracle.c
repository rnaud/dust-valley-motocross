/* Call the original pivot-rotation helper with independent inputs. */
#define main unused_helper_main
#include "oracle.c"
#undef main
typedef struct { float v[16]; } Matrix;
static uint8_t node[0x114];
int main(int argc,char**argv) {
 if(argc!=4)return 2;
 map_image(argv[1]);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open transform cases/results");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid count");
 for(uint32_t i=0;i<count;i++) {
  Matrix a;float axis[3],angle,pivot[3];memset(node,0,sizeof node);
  if(fread(&a,64,1,in)!=1||fread(axis,12,1,in)!=1||fread(&angle,4,1,in)!=1||fread(pivot,12,1,in)!=1)fail("truncated input");
  memcpy(node+0x84,&a,64);node[0x104]=1;
  unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
  ((void (__attribute__((thiscall)) *)(void*,float,float,float,float,float,float,float))0x200b8070)(node,pivot[0],pivot[1],pivot[2],axis[0],axis[1],axis[2],angle);
  if(fwrite(node+0x84,64,1,out)!=1||fwrite(node+0x104,4,1,out)!=1)fail("write transform result");
 }
 if(fgetc(in)!=EOF)fail("trailing input");
 fclose(in);if(fclose(out))fail("close results");return 0;
}
