#define main unused_helper_main
#include "oracle.c"
#undef main
#define BASE 0x21000000u
static uint32_t a[8],trace[32],used;
static uint32_t*word(uint32_t p){return(uint32_t*)(uintptr_t)p;}
static void logword(uint32_t v){if(used>=32)fail("trace overflow");trace[used++]=v;}
static void __attribute__((thiscall)) clip(void*self,float near_value,float far_value){logword(1);logword((uint32_t)self);logword(bits(near_value));logword(bits(far_value));if(a[2])*word(BASE+0x12c)=BASE+0x300;}
static void __attribute__((thiscall)) matrices(void*self){logword(2);logword((uint32_t)self);if(a[3])*word(BASE+0x12c)=BASE+0x400;}
static uint32_t __stdcall submit(void*self,uint32_t kind,void*matrix){logword(3);logword((uint32_t)self);logword(kind);logword((uint32_t)matrix);return a[4];}
static void __cdecl error(uint32_t result,uint32_t file,uint32_t line){logword(4);logword(result);logword(file-0x20000000+0x400000);logword(line);}
static void patch(uint32_t p,void*t){BYTE*b=(void*)p;b[0]=0xe9;*(uint32_t*)(b+1)=(uint32_t)t-p-5;FlushInstructionCache(GetCurrentProcess(),b,5);}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);if(VirtualAlloc((void*)BASE,0x2000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)BASE)fail("arena");
 patch(0x2007a190,clip);patch(0x2007a670,matrices);patch(0x200909b0,error);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset((void*)BASE,0,0x2000);memset(trace,0,sizeof trace);used=0;
  *word(BASE+0x20)=a[0];*word(BASE+0x38)=a[1];*word(BASE+0x1c)=BASE+0x100;*word(BASE+0x12c)=BASE+0x200;*word(BASE+0x10c)=BASE+0x500;
  *word(BASE+0x500)=BASE+0x600;*word(BASE+0x668)=(uint32_t)submit;
  uint32_t result=((int(__attribute__((thiscall))*)(void*,float))0x2003e660)((void*)BASE,value(a[5]));
  uint32_t output[3]={result,*word(BASE+0x12c),used};if(fwrite(output,sizeof output,1,out)!=1||fwrite(trace,sizeof trace,1,out)!=1)fail("output");
 }
 if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
