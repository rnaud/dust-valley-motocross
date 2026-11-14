#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void (__cdecl *)(void))0x20001720)();
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 float args[10],matrix[16];
 while(fread(args,sizeof args,1,in)==1){
  unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
  typedef float*(__cdecl *View)(float*,float,float,float,float,float,float,float,float,float,float);
  float*result=((View)0x20075760)(matrix,args[0],args[1],args[2],args[3],args[4],args[5],args[6],args[7],args[8],args[9]);
  if(result!=matrix)fail("return pointer");
  if(fwrite(matrix,sizeof matrix,1,out)!=1)fail("output");
 }
 if(ferror(in)||fclose(out))fail("finish");
 return 0;
}
