#define main unused_helper_main
#include "oracle.c"
#undef main
#define BASE 0x21000000u
static uint32_t used,trace[4096],traced,requests,failEvery;
static uint32_t*w(uint32_t p){return(uint32_t*)p;}
static void logword(uint32_t v){if(traced==4096)fail("trace overflow");trace[traced++]=v;}
static uint32_t __cdecl allocate(uint32_t size){requests++;uint32_t p=0;if(!failEvery||requests%failEvery){if(used+size+16>0x20000)fail("heap overflow");p=BASE+0x10000+used+16;*w(p-4)=size;used+=(size+31)&~15u;}logword(1);logword(size);logword(p);return p;}
static void __cdecl release(uint32_t p){logword(2);logword(p);}
static uint32_t __cdecl allocation_size(uint32_t p){logword(3);logword(p);return*w(p-4);}
static void patch(uint32_t p,void*t){BYTE*b=(void*)p;b[0]=0xe9;*(uint32_t*)(b+1)=(uint32_t)t-p-5;}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);if(VirtualAlloc((void*)BASE,0x30000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)BASE)fail("arena");
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 for(uint32_t i=0;i<17;i++){*w(0x200e84d8+i*4)=i*17;*w(0x200e8490+i*4)=i*16;}
 patch(0x200bf8f0,allocate);patch(0x200bf880,release);patch(0x200c0f20,allocation_size);FlushInstructionCache(GetCurrentProcess(),0,0);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[8];size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset((void*)BASE,0,0x10000);memset((void*)(BASE+0x10000),0xa5,0x20000);memset((void*)0x2011f0e0,0x5a,0x2d34);memset((void*)0x20121e18,0x6b,0x1000);used=traced=requests=0;failEvery=a[6]&1?2:0;*w(0x200e5670)=a[0];*w(0x2011f0e4)=0xffffffff;*w(0x20124fd8)=0x3f000000;*w(0x200e8524)=a[6]&2;
  uint32_t seed=a[0];
  for(uint32_t id=0;id<4;id++){
   uint32_t p=BASE+id*0x400;*w(p+0x50)=BASE+0x6000;*w(p+0x10)=id&1?0xbf800000:0x3f000000;*w(p+0xc)=0x41880000;*w(p+0x24)=id;*w(p+0x28)=id*16;*w(p+0x2c)=id*32;*w(p+0x30)=id==2?255:a[5];*w(p+0x48)=a[5]%9;*w(p+0x1d0)=0x3e800000;*w(p+0x1d4)=0xbe000000;*w(p+0x1d8)=0x3d800000;*w(p+0x5c)=BASE+0x4000;
   *w(p+0x54)=id==0&&a[2]?BASE+0x8000:0;*w(p+0x58)=id==0?BASE+0xc00:id<3?BASE:0;*w(p+0x1b4)=id==3?a[4]&1:((a[4]>>id)&1);*(BYTE*)(p+0x181)=a[3]&1;*(BYTE*)(p+0x182)=(a[3]>>1)&1;
   *w(p+0x184)=id==0?a[1]:((a[1]>>id)&1);*w(p+0x1a0)=id;*w(p+0x1a4)=id&1;*w(p+0x1a8)=(id+1)&1;*w(p+0x1ac)=id+7;
   for(uint32_t i=0;i<289;i++){seed=seed*1664525+1013904223;*(BYTE*)(p+0x60+i)=a[7]%3==0?0:a[7]%3==1?128:seed>>24;}
  }
  *w(BASE+0x8000)=BASE+0x400;*w(BASE+0x8000+255*4)=BASE+0x800;
  for(uint32_t i=0;i<289;i++){*(uint16_t*)(BASE+0x6000+i*16+2)=i*37;*w(BASE+0x6000+i*16+4)=0x3e800000;*w(BASE+0x6000+i*16+8)=0x3f000000;*w(BASE+0x6000+i*16+12)=0xbe800000;}
  uint32_t result=((uint32_t(__attribute__((thiscall))*)(void*,uint32_t,uint32_t,uint32_t,uint32_t))0x2008ac20)((void*)BASE,0,0,16,0);
  if(a[7]&4){for(uint32_t id=0;id<3;id++){*(BYTE*)(BASE+id*0x400+0x182)=1;memset((void*)(BASE+id*0x400+0x60),a[7]&1?128:0,289);}result=((uint32_t(__attribute__((thiscall))*)(void*,uint32_t,uint32_t,uint32_t,uint32_t))0x2008ac20)((void*)BASE,0,0,16,0);}
  uint32_t header[5]={result,*w(0x200e5670),*w(0x20124fd8),used,traced};if(fwrite(header,sizeof header,1,out)!=1)fail("write");for(uint32_t id=0;id<4;id++)if(fwrite((void*)(BASE+id*0x400),0x210,1,out)!=1)fail("write");
  if(fwrite((void*)(BASE+0x4000),0x600,1,out)!=1||fwrite((void*)0x2011f0e0,0x2d34,1,out)!=1||fwrite((void*)0x20121e18,0x1000,1,out)!=1||(used&&fwrite((void*)(BASE+0x10000),used,1,out)!=1)||(traced&&fwrite(trace,traced*4,1,out)!=1))fail("write");
 }
 if(n||ferror(in)||fclose(out))fail("input/output");fclose(in);return 0;
}
