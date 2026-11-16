#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[2];size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset(bike,0,sizeof bike);put32(0x54,a[0]);put32(0x58,a[1]);unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
  ((void(__attribute__((thiscall))*)(void*))0x200112f0)(bike);
  uint32_t row[4]={get32(0x5c),get32(0x60),get32(0x64),get32(0x68)};if(fwrite(row,sizeof row,1,out)!=1)fail("write");
 }
 if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
