#define main unused_helper_main
#include "oracle.c"
#undef main
static BYTE owner[0x100],bank[0x1210];
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[16],r[2];size_t n;
 for(uint32_t i=0;i<17;i++)*(uint32_t*)(0x200e84d8+i*4)=i*17;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset(bike,0,sizeof bike);memset(owner,0,sizeof owner);memset(bank,0,sizeof bank);put32(0x50,(uint32_t)bank);put32(0x5c,(uint32_t)owner);put32(0x28,a[0]);put32(0x2c,a[1]);put32(0x24,a[2]);put32(0xc,a[7]);put32(0x10,a[8]);put32(0x204,a[9]);memcpy(owner+0x48,a+10,12);memcpy(owner+0x60,a+13,4);memcpy(owner+0x88,a+14,4);
  uint32_t offset=(a[4]*17+a[3])*16;bank[offset+1]=a[15]&255;*(uint16_t*)(bank+offset+2)=a[6];*(uint16_t*)(0x20118fd0+(a[15]&255)*2)=a[5];
  unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));r[0]=((uint32_t(__attribute__((thiscall))*)(void*,uint32_t,uint32_t))0x2008ce60)(bike,a[3],a[4]);memcpy(r+1,owner+0x88,4);if(fwrite(r,sizeof r,1,out)!=1)fail("write");
 }if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
