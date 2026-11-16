#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[6];size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset(bike,0,sizeof bike);put32(0x108,a[0]);put32(0x10c,a[1]);put32(0x110,a[2]);put32(0x114,a[3]);put32(0xe4,a[5]);
  unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
  uint32_t result=((int(__attribute__((thiscall))*)(void*,float))0x20022df0)(bike,value(a[4]));
  uint32_t row[6]={result,get32(0x108),get32(0x10c),get32(0x110),get32(0x114),get32(0xe4)};if(fwrite(row,sizeof row,1,out)!=1)fail("write");
 }
 if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
