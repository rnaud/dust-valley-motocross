#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 uint32_t args[22],result[5];unsigned char camera[0x200];
 while(fread(args,sizeof args,1,in)==1){
  memset(camera,0,sizeof camera);memcpy(camera+0x180,args+19,8);
  memset(result,0xa5,sizeof result);
  unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
  typedef int (__stdcall *Project)(void*,void*,void*,void*,void*);
  result[4]=((Project)0x2007e650)(camera,args,args+16,args[21]?result:NULL,result+3);
  if(fwrite(result,sizeof result,1,out)!=1)fail("output");
 }
 if(ferror(in)||fclose(out))fail("finish");return 0;
}
