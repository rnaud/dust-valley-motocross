#define main unused_helper_main
#include "oracle.c"
#undef main
#define BASE 0x21000000u
static uint32_t a[8],trace[16384],used;
static uint32_t*w(uint32_t p){return(uint32_t*)p;}
static void logword(uint32_t v){if(used==16384)fail("trace overflow");trace[used++]=v;}
static void __attribute__((thiscall)) propagate(void*self,uint32_t x,uint32_t y,uint32_t active){logword(1);logword((uint32_t)self);logword(x);logword(y);logword(active);*w(BASE+0x80b4)+=1;}
static void __attribute__((thiscall)) rebuild(void*self){logword(2);logword((uint32_t)self);*w(BASE+0x807c)=((uint32_t)self-BASE)/0x400%2;*w(BASE+0x80c0)+=3;}
static void __attribute__((thiscall)) optional(void*self){logword(3);logword((uint32_t)self);*w(BASE+0x80c0)+=7;}
static void __attribute__((thiscall)) boundary(void*self,uint32_t child,uint32_t x,uint32_t y,uint32_t active,uint32_t mask,uint32_t source){logword(4);logword((uint32_t)self);logword(child);logword(x);logword(y);logword(active);logword(mask);logword(source);*w(BASE+0x80b4)+=1;}
static void patch(uint32_t p,void*t){BYTE*b=(void*)p;b[0]=0xe9;*(uint32_t*)(b+1)=(uint32_t)t-p-5;}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);if(VirtualAlloc((void*)BASE,0x10000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)BASE)fail("arena");
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));((void(__cdecl*)(void))0x2004e950)();
#ifdef REAL_PROPAGATION
#ifndef REAL_PATCH
 patch(0x2008e1c0,boundary);
#endif
#else
 patch(0x2008db00,propagate);patch(0x2008d9b0,rebuild);
#endif
 patch(0x2008ca00,optional);FlushInstructionCache(GetCurrentProcess(),0,0);
 for(uint32_t i=0;i<17;i++){*w(0x200e84d8+i*4)=i*17;*w(0x200e8490+i*4)=i*16;}for(uint32_t v=0;v<289;v++){*w(0x20122ba8+v*32)=v%17;*w(0x20122bac+v*32)=v/17;}
#ifdef REAL_PROPAGATION
 ((void(__cdecl*)(void))0x2008a120)();
#endif
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset((void*)BASE,0,0x10000);used=0;
  for(uint32_t id=0;id<3;id++){
   uint32_t p=BASE+id*0x400,b=BASE+0x2000+id*0x1800;*w(p+0x50)=b;*w(p+0x5c)=BASE+0x8000;*w(p+0x54)=id?0:BASE+0x1000;*w(p+0x58)=id?BASE:0;*w(p+0x184)=(a[2]>>id)&1;*(BYTE*)(p+0x181)=(a[2]>>(id+3))&1;
   *w(p+0xc)=bits((float)id*10);*w(p+0x10)=bits(.25f);*w(p+0x204)=bits(1.f+(float)id*.5f);*w(p+0x24)=id+1;*w(p+0x28)=id*32;*w(p+0x2c)=0-id*16;
   *w(p+0x188)=(a[3]+id*7)&65535;*w(p+0x18c)=(a[4]+id*11)&65535;*w(p+0x190)=(a[5]+id*13)&65535;*w(p+0x194)=(a[6]+id*17)&65535;
   for(uint32_t v=0;v<289;v++){static const BYTE flags[8]={0,0x40,0x80,0xc0,1,2,0x81,0xc5};*(BYTE*)(p+0x60+v)=flags[(a[0]+v+id)%8];*(BYTE*)(b+v*16+1)=(a[0]+v)&255;*(uint16_t*)(b+v*16+2)=(a[0]+v*7)&65535;*(int16_t*)(b+0x1410+v*2)=(v*37)%289;}
   for(uint32_t v=0;v<256;v++)*(int16_t*)(b+0x1210+v*2)=v*289/255;
  }
#ifdef REAL_PATCH
  *w(BASE+0x20)=1;*w(BASE+0x428)=0;*w(BASE+0x42c)=0;*w(BASE+0x430)=0;*w(BASE+0x828)=240;*w(BASE+0x82c)=240;*w(BASE+0x830)=255;
#endif
  *w(BASE+0x1000)=BASE+0x400;*w(BASE+0x13fc)=BASE+0x800;
  *w(BASE+0x8048)=bits((float)(a[0]%300)-150);*w(BASE+0x804c)=bits((float)(a[0]%100));*w(BASE+0x8050)=bits((float)(a[0]%200)-100);*w(BASE+0x8060)=bits(.5f);*w(BASE+0x8088)=a[7];*w(BASE+0x80b0)=a[7];*w(BASE+0x80c0)=a[0];*w(BASE+0x8548)=a[7];
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));((void(__attribute__((thiscall))*)(void*))(a[1]?0x2008d680:0x2008d6f0))((void*)BASE);
  if(fwrite(&used,4,1,out)!=1)fail("write");for(uint32_t id=0;id<3;id++)if(fwrite((void*)(BASE+id*0x400),0x210,1,out)!=1)fail("write");if(fwrite((void*)(BASE+0x8000),0x600,1,out)!=1||fwrite(trace,4,used,out)!=used)fail("write");
 }if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
