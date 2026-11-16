#define main unused_helper_main
#include "oracle.c"
#undef main
#define BASE 0x21000000u
static uint32_t a[16],trace[32],used;
static uint32_t*word(uint32_t p){return(uint32_t*)(uintptr_t)p;}
static void logword(uint32_t v){if(used>=32)fail("trace overflow");trace[used++]=v;}
static int __attribute__((thiscall)) children(void*self,float dt){logword(1);logword((uint32_t)self);logword(bits(dt));*word(BASE+0x16f4)=a[9];*word(0x200e2ef0)=a[10];return 7;}
static void __attribute__((thiscall)) refresh(void*self){logword(2);logword((uint32_t)self);if(a[11]){*word(BASE+0x100)=bits(2.5f);*word(0x200e2ef4)=7;}}
static void __attribute__((thiscall)) rectangle(void*self,uint32_t*r){logword(3);logword((uint32_t)self);for(int i=0;i<4;i++)logword(r[i]);}
static void __attribute__((thiscall)) map(void*self){logword(4);logword((uint32_t)self);}
static void __attribute__((thiscall)) visible10(void*self){logword(5);logword((uint32_t)self);logword(0x10);if(a[12])*word(BASE+0x260)=0;}
static void __attribute__((thiscall)) visible14(void*self){logword(5);logword((uint32_t)self);logword(0x14);if(a[12])*word(BASE+0x260)=0;}
static void patch(uint32_t p,void*t){BYTE*b=(void*)p;b[0]=0xe9;*(uint32_t*)(b+1)=(uint32_t)t-p-5;FlushInstructionCache(GetCurrentProcess(),b,5);}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);if(VirtualAlloc((void*)BASE,0xb000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)BASE)fail("arena");
 patch(0x20029d90,children);patch(0x20023a10,refresh);patch(0x2002a200,rectangle);patch(0x20024b60,map);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset((void*)BASE,0,0xb000);memset(trace,0,sizeof trace);used=0;
  *word(0x200e4fb4)=BASE+0x1000;*word(BASE+0x16f4)=a[3];*word(0x200e2ef0)=a[4];*word(0x200e2ef4)=a[2];*word(0x200e2ef8)=a[13];
  *word(BASE+0x100)=a[0];*word(BASE+0x260)=a[5];*word(BASE+0xf8)=BASE+0x2000;*word(BASE+0xfc)=BASE+0x3000;
  *word(BASE+0x2030)=BASE+0x4000+a[7]*0x1000;*word(BASE+0x31ec)=BASE+0x4000+a[8]*0x1000;
  *word(BASE+0x9010)=(uint32_t)visible10;*word(BASE+0x9014)=(uint32_t)visible14;
  for(unsigned i=0;i<3;i++){*word(BASE+0x234+i*4)=BASE+0x4000+i*0x1000;*word(BASE+0x4434+i*0x1000)=BASE+0x7000+i*0x200;*word(BASE+0x712c+i*0x200)=(a[6]>>i)&1;*word(BASE+0x264+i*4)=BASE+0x8000+i*0x100;*word(BASE+0x8000+i*0x100)=BASE+0x9000;}
  unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
  uint32_t result=((int(__attribute__((thiscall))*)(void*,float))0x20023b50)((void*)BASE,value(a[1]));
  uint32_t output[6]={result,*word(BASE+0x100),*word(0x200e2ef4),*word(0x200e2ef8),*word(BASE+0x260),used};if(fwrite(output,sizeof output,1,out)!=1||fwrite(trace,sizeof trace,1,out)!=1)fail("output");
 }
 if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
