#define main unused_helper_main
#include "oracle.c"
#undef main
#define BASE 0x21000000u
static uint32_t a[4],trace[64],used;
static uint32_t*word(uint32_t p){return(uint32_t*)(uintptr_t)p;}
static void logword(uint32_t v){if(used>=64)fail("trace overflow");trace[used++]=v;}
static void __attribute__((thiscall)) rectangle(void*self,void*r){logword(1);logword((uint32_t)self);logword((uint32_t)r);}
static int __attribute__((stdcall)) acquire(void*self,uint32_t*dc){logword(2);logword((uint32_t)self);*dc=0x12345678;return a[1];}
static int __attribute__((stdcall)) backgroundColor(uint32_t dc,uint32_t v){logword(3);logword(dc);logword(v);return 99;}
static int __attribute__((stdcall)) backgroundMode(uint32_t dc,uint32_t v){logword(4);logword(dc);logword(v);return 99;}
static int __attribute__((stdcall)) textColor(uint32_t dc,uint32_t v){logword(5);logword(dc);logword(v);return 99;}
static void draw(void*self,uint32_t method,uint32_t dc){logword(6);logword((uint32_t)self);logword(method);logword(dc);if(a[3])*word(BASE+0x30)=BASE+0x300;}
#define DRAW(name,addr) static void __attribute__((thiscall)) name(void*self,uint32_t dc){draw(self,addr,dc);}
DRAW(draw0,0x423d20) DRAW(draw1,0x4243e0) DRAW(draw2,0x423f80) DRAW(draw3,0x423ce0) DRAW(draw4,0x424900)
static int __attribute__((stdcall)) release(void*self,uint32_t dc){logword(7);logword((uint32_t)self);logword(dc);return a[2];}
static void __attribute__((cdecl)) error(uint32_t result,uint32_t file,uint32_t line){logword(8);logword(result);logword(file-0x1fc00000);logword(line);}
static void __attribute__((thiscall)) blit(void*self,uint32_t x,uint32_t y,uint32_t flags){logword(9);logword((uint32_t)self);logword(x);logword(y);logword(flags);if(a[3])*word(BASE+0x30)=BASE+0x400;}
static void __attribute__((thiscall)) present(void*self){logword(10);logword((uint32_t)self);}
static void patch(uint32_t p,void*t){BYTE*b=(void*)p;b[0]=0xe9;*(uint32_t*)(b+1)=(uint32_t)t-p-5;FlushInstructionCache(GetCurrentProcess(),b,5);}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);if(VirtualAlloc((void*)BASE,0x4000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)BASE)fail("arena");
 patch(0x2002a200,rectangle);patch(0x20023d20,draw0);patch(0x200243e0,draw1);patch(0x20023f80,draw2);patch(0x20023ce0,draw3);patch(0x20024900,draw4);patch(0x20090ec0,error);patch(0x20024c20,blit);patch(0x20042370,present);
 *word(0x201275cc)=(uint32_t)backgroundColor;*word(0x201275a0)=(uint32_t)backgroundMode;*word(0x201275c0)=(uint32_t)textColor;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset((void*)BASE,0,0x4000);memset(trace,0,sizeof trace);used=0;
  *word(0x200e4fb4)=BASE+0x1000;*(uint16_t*)(BASE+0x2072)=a[0];*word(BASE+0x30)=BASE+0x200;
  for(int i=2;i<=4;i++){*word(BASE+i*0x100+0x18)=BASE+0x500+i*0x100;*word(BASE+0x500+i*0x100)=BASE+0xa00;}
  *word(BASE+0xa44)=(uint32_t)acquire;*word(BASE+0xa68)=(uint32_t)release;
  uint32_t result=((int(__attribute__((thiscall))*)(void*))0x20023a10)((void*)BASE);
  uint32_t header[3]={result,*word(BASE+0x30),used};if(fwrite(header,sizeof header,1,out)!=1||fwrite(trace,sizeof trace,1,out)!=1)fail("output");
 }
 if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
