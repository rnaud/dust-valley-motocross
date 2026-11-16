#define main unused_helper_main
#include "oracle.c"
#undef main
#define BASE 0x21000000u
static uint32_t*w(uint32_t p){return(uint32_t*)p;}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);if(VirtualAlloc((void*)BASE,0x10000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)BASE)fail("arena");
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 for(uint32_t i=0;i<17;i++)*w(0x200e84d8+i*4)=i*17;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[24];size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset((void*)BASE,0,0x10000);uint32_t builder=BASE+0x1000,bank=BASE+0x5000,index=a[6]*17+a[5];
  for(uint32_t i=0;i<0x2d34/4;i++)*w(builder+i*4)=a[21]+i*0x9e3779b9u;
  *w(builder)=BASE;*w(builder+4)=a[1];*w(builder+8+index*8)=a[2];*w(builder+12+index*8)=a[3];*w(builder+0x2d30)=a[4];
  *w(BASE+0x28)=a[7];*w(BASE+0x2c)=a[8];*w(BASE+0x24)=a[9];*w(BASE+0xc)=a[10];*w(BASE+0x10)=a[11];*w(BASE+0x48)=a[12];*w(BASE+0x50)=bank;*w(BASE+0x1d4)=a[15];*w(BASE+0x1d0)=a[16];
  *(uint16_t*)(bank+index*16+2)=a[17];for(uint32_t i=0;i<3;i++)*w(bank+index*16+4+i*4)=a[18+i];
  *w(0x200e8524)=a[13];*w(0x20124fd8)=a[14];
  if(a[0])((void(__attribute__((thiscall))*)(void*,uint32_t))0x20089f50)((void*)builder,BASE);
  uint32_t result[2];for(uint32_t i=0;i<2;i++)result[i]=((uint32_t(__attribute__((thiscall))*)(void*,uint32_t,uint32_t))0x2008b350)((void*)builder,a[5],a[6]);
  if(fwrite(result,sizeof result,1,out)!=1||fwrite((void*)builder,0x2d34,1,out)!=1)fail("write");
 }
 if(n||ferror(in)||fclose(out))fail("input/output");fclose(in);return 0;
}
