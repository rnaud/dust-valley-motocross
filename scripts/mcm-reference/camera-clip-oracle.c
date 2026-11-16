#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[2];BYTE camera[0x200]={0};size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));((void(__attribute__((thiscall))*)(void*,float,float))0x2007a190)(camera,value(a[0]),value(a[1]));if(fwrite(camera+0x1a8,8,1,out)!=1)fail("output");}
 if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
