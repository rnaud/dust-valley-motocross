#define main unused_helper_main
#include "oracle.c"
#undef main
#define BASE 0x21000000u
#define COUNT 25
static uint32_t a[8],trace[32768],used,projections;
static const uint32_t slots[16]={0,1,15,16,17,51,85,119,136,153,204,238,239,240,254,255};
static uint32_t*w(uint32_t p){return(uint32_t*)(uintptr_t)p;}
static void logword(uint32_t v){if(used==32768)fail("trace overflow");trace[used++]=v;}
static uint32_t decision(uint32_t k){switch(a[0]%6){case 0:return 0;case 1:return 2;case 2:return 1;case 3:return k%3;case 4:return k%5?1:0;default:return k%7==0?2:1;}}
static uint32_t __attribute__((thiscall)) project(void*self,uint32_t camera,uint32_t transform,float*center,float*extent,uint32_t unused,uint32_t*inside){
 logword(1);logword((uint32_t)self);logword(camera);logword(transform);for(int i=0;i<3;i++)logword(bits(center[i]));for(int i=0;i<3;i++)logword(bits(extent[i]));logword(unused);logword(inside?1:0);
 uint32_t result=decision(projections++);if(inside)*inside=result==2?8:result?3:0;return result?1:0;
}
static uint32_t __attribute__((thiscall)) sphere(void*self,uint32_t camera,uint32_t transform,float*center,uint32_t radius,uint32_t unused){
 logword(2);logword((uint32_t)self);logword(camera);logword(transform);for(int i=0;i<3;i++)logword(bits(center[i]));logword(radius);logword(unused);return decision(projections++)?1:0;
}
static void __attribute__((thiscall)) select_node(void*self,uint32_t resource,uint32_t transform,uint32_t recurse){
 uint32_t p=(uint32_t)self,id=(p-BASE)/0x400;logword(3);logword(p);logword(resource);logword(transform);logword(recurse);
 *w(p+0x188)+=1;if(a[7]&2)*(BYTE*)(p+0x181)=id%3==0;
}
static void __attribute__((thiscall)) release_node(void*self,uint32_t pointer){logword(4);logword((uint32_t)self);logword(pointer);*w(BASE+0x18088)+=1;}
static void patch(uint32_t p,void*t){BYTE*b=(void*)p;b[0]=0xe9;*(uint32_t*)(b+1)=(uint32_t)t-p-5;}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);if(VirtualAlloc((void*)BASE,0x20000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)BASE)fail("arena");

#ifndef REAL_BOUNDS
 patch(0x2007e8a0,project);
#endif
#ifndef REAL_SPHERE
 patch(0x2007f620,sphere);
#endif
#ifdef REAL_SELECTION
 ((void(__cdecl*)(void))0x20001640)();patch(0x2005c820,release_node);
#else
 patch(0x2008d500,select_node);
#endif
 FlushInstructionCache(GetCurrentProcess(),0,0);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset((void*)BASE,0,0x20000);used=projections=0;
  for(uint32_t id=0;id<COUNT;id++){
   uint32_t p=BASE+id*0x400;for(uint32_t off=0;off<0x210;off+=4)*w(p+off)=a[1]^(id*0x1020304u+off*0x10101u);
   *w(p+0x54)=id<5?BASE+0x10000+id*0x400:0;*w(p+0x58)=id==0?0:id<17?BASE:BASE+(1+(id-17)/2)*0x400;*w(p+0x5c)=BASE+0x18000;*w(p+0x20)=(a[1]+id)%3;*w(p+0x184)=(a[1]+id)%3?0x12345:0;*(BYTE*)(p+0x181)=(a[7]&4)&&id%4==0;*(BYTE*)(p+0x182)=0;
   for(uint32_t j=0;j<3;j++){*w(p+0x1ec+j*4)=bits((float)((int)id*7+(int)j*3-80));*w(p+0x1f8+j*4)=bits(j==1?20.f:8.f);}
  }
#ifdef REAL_SELECTION
  for(uint32_t id=0;id<COUNT;id++){
   uint32_t p=BASE+id*0x400;*w(p)=0x200d9b2c;*w(p+0x34)=id<5?1:0;*w(p+0x1c)=((a[0]+id)%4)*1000;*w(p+0x1b4)=(a[0]+id)%3;
   *w(p+0x14)=0;*w(p+0x18)=30;*w(p+0x208)=bits(1.f);*w(p+0x1dc)=bits((float)id*8-100);*w(p+0x1e4)=bits((float)id*8-84);*w(p+0x1e0)=bits((float)id*4-50);*w(p+0x1e8)=bits((float)id*4-34);
  }
  *w(BASE+0x18048)=bits((float)(a[1]%300)-150);*w(BASE+0x1804c)=bits((float)(a[1]%100)-20);*w(BASE+0x18050)=bits((float)(a[1]%200)-100);*w(BASE+0x18054)=a[0]%4;*w(BASE+0x1805c)=bits(.1f);*w(BASE+0x18090)=a[1];
#endif
  for(uint32_t i=0;i<16;i++)*w(BASE+0x10000+slots[i]*4)=BASE+(i+1)*0x400;
  for(uint32_t i=0;i<4;i++){*w(BASE+0x10400+i*0x400)=BASE+(17+i*2)*0x400;*w(BASE+0x10400+i*0x400+255*4)=BASE+(18+i*2)*0x400;}
  *w(BASE+0x1801c)=BASE+0x19000;*w(BASE+0x1902c)=0x12345000;*w(0x200e7b28)=0x45678000;*w(0x200e2380)=a[7]&1;*w(0x200ee04c)=a[1];*w(0x200ee050)=a[1]+1;for(uint32_t i=0;i<=16;i++)*w(0x200e8490+i*4)=i*16;
  uint32_t transform=0xabc100;
#ifdef REAL_BOUNDS
  transform=BASE+0x1b000;*w(BASE+0x1902c)=BASE+0x1a000;*w(0x200e2380)=0;
  for(uint32_t i=0;i<16;i++)*w(transform+i*4)=0;
  *w(transform)=bits(.002f*(1+a[0]));*w(transform+20)=bits(.003f*(1+a[0]));*w(transform+40)=bits(.004f*(1+a[0]));*w(transform+48)=bits((float)(a[1]%5)*.25f);*w(transform+52)=bits(.5f);*w(transform+56)=bits(.5f);*w(transform+60)=bits(1.f);
#endif
#ifdef REAL_SPHERE
  *w(0x200e2380)=a[7]&1;*w(BASE+0x1a098)=bits(1.f);*w(BASE+0x1a0a8)=bits(100.f);*w(BASE+0x1a1a8)=bits(1.f);*w(BASE+0x1a1ac)=bits(1000.f);*w(BASE+0x1a0f0)=bits(.02f);
  for(uint32_t id=0;id<COUNT;id++)*w(BASE+id*0x400+0x20c)=bits(10.f);
#endif
  float center[3]={-12.25f,3.5f,18.75f},extent[3]={128.f,24.f,96.f};unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
  uint32_t result=((uint32_t(__attribute__((thiscall))*)(void*,uint32_t,uint32_t,float*,float*,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t))0x2008cf50)((void*)BASE,0xabc000,transform,center,extent,a[5],a[6],a[4],a[2],a[3]);
  uint32_t header[6]={result,*w(0x200ee04c),*w(0x200ee050),used,*w(BASE+0x18090),*w(BASE+0x18088)};if(fwrite(header,sizeof header,1,out)!=1)fail("write");for(uint32_t id=0;id<COUNT;id++)if(fwrite((void*)(BASE+id*0x400),0x210,1,out)!=1)fail("write");if(fwrite(trace,4,used,out)!=used)fail("write");
 }
 if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
