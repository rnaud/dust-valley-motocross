#define main unused_helper_main
#include "oracle.c"
#undef main
#define BASE 0x21000000u
static uint32_t a[8],trace[64],used,clocks;
static uint32_t*w(uint32_t p){return(uint32_t*)(uintptr_t)p;}
static void logword(uint32_t v){if(used==64)fail("trace overflow");trace[used++]=v;}
static DWORD __attribute__((stdcall)) clock_read(void){logword(1);logword(clocks);return a[3]+clocks++*a[4];}
static void __attribute__((thiscall)) traverse(void*self,uint32_t resource,uint32_t camera,uint32_t center,uint32_t extent,uint32_t x,uint32_t y,uint32_t size,uint32_t p,uint32_t q){logword(2);logword((uint32_t)self);logword(resource);logword(camera);logword(center);logword(extent);logword(x);logword(y);logword(size);logword(p);logword(q);if(a[5]){*w(BASE+0xc0)=123;*w(BASE+0x44)=BASE+0x1800;}}
static void update(void*self,uint32_t changed){logword(3);logword((uint32_t)self);logword(changed);if(a[5])*w(BASE+0x7c)=!a[2];}
static void __attribute__((thiscall)) changed(void*self){update(self,1);}static void __attribute__((thiscall)) same(void*self){update(self,0);}
static void __attribute__((thiscall)) optionalFirst(void*self){logword(4);logword((uint32_t)self);if(a[5])*w(BASE+0x44)=BASE+0x1000;}
static void __attribute__((thiscall)) optionalSecond(void*self){logword(5);logword((uint32_t)self);}
static void __attribute__((thiscall)) emit(void*self,uint32_t x,uint32_t y,uint32_t size,uint32_t flags){logword(6);logword((uint32_t)self);logword(x);logword(y);logword(size);logword(flags);}
static void patch(uint32_t p,void*t){BYTE*b=(void*)p;b[0]=0xe9;*(uint32_t*)(b+1)=(uint32_t)t-p-5;}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);if(VirtualAlloc((void*)BASE,0x4000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)BASE)fail("arena");
 patch(0x2008cf50,traverse);patch(0x2008d680,changed);patch(0x2008d6f0,same);patch(0x2008ca00,optionalFirst);patch(0x2008c820,optionalSecond);patch(0x2008ac20,emit);*w(0x201278a8)=(uint32_t)clock_read;FlushInstructionCache(GetCurrentProcess(),0,0);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset((void*)BASE,0,0x4000);memset(trace,0,sizeof trace);used=clocks=0;*w(BASE+0x3c)=0x12345678;*w(BASE+0x40)=bits(.01171875f);*w(BASE+0x44)=BASE+0x1000;*w(BASE+0x54)=a[1];*w(BASE+0x7c)=a[2];*w(BASE+0xc0)=a[6];
  *w(0x200e4fb4)=BASE+0x3000;*w(0x200ee04c)=0xffffffff;*w(0x200ee050)=0xffffffff;*w(BASE+0x213c)=bits(85);*w(BASE+0x2144)=bits(12);*w(BASE+0x2148)=bits(34);*w(BASE+0x214c)=bits(-5);*w(BASE+0x2180)=640;
  unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));((void(__attribute__((thiscall))*)(void*,uint32_t,void*,uint32_t))0x200125b0)((void*)BASE,a[7],(void*)(BASE+0x2000),a[0]);
  if(fwrite((void*)BASE,0x9f4,1,out)!=1||fwrite(&used,4,1,out)!=1||fwrite(trace,sizeof trace,1,out)!=1)fail("write");
 }
 if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
