#define main unused_helper_main
#include "oracle.c"
#undef main
#define BASE 0x21000000u
static uint32_t*w(uint32_t p){return(uint32_t*)p;}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);if(VirtualAlloc((void*)BASE,0x10000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)BASE)fail("arena");
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 for(uint32_t i=0;i<17;i++){*w(0x200e84d8+i*4)=i*17;*w(0x200e8490+i*4)=i*16;}
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[8];size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset((void*)BASE,0,0x10000);memset((void*)0x2011f0e0,0x5a,0x2d34);memset((void*)0x20121e18,0x6b,0x1000);
  *w(0x2011f0e4)=0xffffffff;*w(BASE+0x50)=BASE+0x8000;*w(BASE+0x10)=a[6]&1?0xbf800000:0x3f000000;*w(BASE+0xc)=0x41880000;*w(BASE+0x24)=a[6]%5;*w(BASE+0x28)=0xfffffff0;*w(BASE+0x2c)=32;
  *w(BASE+0x48)=a[5];*w(BASE+0x1d0)=0x3e800000;*w(BASE+0x1d4)=0xbe000000;*w(0x20124fd8)=0x3d800000;*w(0x200e8524)=a[6]&2;
  *w(BASE+0x54)=a[2]?BASE+0x6000:0;*w(BASE+0x1b4)=a[3];*(BYTE*)(BASE+0x181)=a[4];
  uint32_t seed=a[0];for(uint32_t i=0;i<289;i++){seed=seed*1664525+1013904223;*(BYTE*)(BASE+0x60+i)=a[1]==0?0:a[1]==1?128:(seed>>24);*(uint16_t*)(BASE+0x8000+i*16+2)=i*37;*w(BASE+0x8000+i*16+4)=0x3e800000;*w(BASE+0x8000+i*16+8)=0x3f000000;*w(BASE+0x8000+i*16+12)=0xbe800000;}
  for(uint32_t i=0;i<256;i++){uint32_t id=i%16+1,p=BASE+id*0x400;*w(BASE+0x6000+i*4)=i%7?p:0;*w(p+0x1a0)=id%4==0?2:0;*w(p+0x1ac)=id%4==1?3:0;*w(p+0x184)=id%4!=2;}
  ((void(__attribute__((thiscall))*)(void*,uint32_t))0x20089f50)((void*)0x2011f0e0,BASE);
  uint32_t corner=a[7]&3,x=corner&1?16:0,y=corner&2?16:0,dx=corner&1?-8:8,dy=corner&2?-8:8,flag=0x12345678;
  uint32_t result[2];
#ifdef FALLBACK
  result[0]=((uint32_t(__attribute__((thiscall))*)(void*,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t))0x2008bfd0)((void*)BASE,3,x,y,dx*2,dy*2);
#else
  result[0]=((uint32_t(__attribute__((thiscall))*)(void*,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t*))0x2008b190)((void*)BASE,8,3,x,y,dx,dy,&flag);
#endif
  result[1]=flag;
  if(fwrite(result,sizeof result,1,out)!=1||fwrite((void*)0x2011f0e0,0x2d34,1,out)!=1||fwrite((void*)0x20121e18,0x1000,1,out)!=1)fail("write");
 }
 if(n||ferror(in)||fclose(out))fail("input/output");fclose(in);return 0;
}
