#define main unused_helper_main
#include "oracle.c"
#undef main
static BYTE owner[0x100];
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);((void(__cdecl*)(void))0x20001640)();FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[16];size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset(bike,0,sizeof bike);memset(owner,0,sizeof owner);put32(0x5c,(uint32_t)owner);memcpy(owner+0x48,a,12);memcpy(bike+0x1dc,a+3,16);put32(0x14,a[7]);put32(0x18,a[8]);memcpy(owner+0x54,a+9,4);memcpy(owner+0x5c,a+10,4);put32(0x208,a[11]);put32(0x188,a[12]);put32(0x18c,a[13]);memcpy(owner+0x90,a+14,4);
  unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));float result=((float(__attribute__((thiscall))*)(void*))0x2008ca70)(bike);
  uint32_t row[6]={bits(result),get32(0x188),get32(0x18c),get32(0x190),get32(0x194),*(uint32_t*)(owner+0x90)};if(fwrite(row,sizeof row,1,out)!=1)fail("write");
 }
 if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
