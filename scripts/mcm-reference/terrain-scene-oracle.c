#define main unused_helper_main
#include "oracle.c"
#undef main
#define BASE 0x21000000u
static uint32_t a[8],trace[16],used,clockCalls;
static uint32_t*w(uint32_t p){return(uint32_t*)(uintptr_t)p;}
static void logword(uint32_t v){if(used==16)fail("trace overflow");trace[used++]=v;}
static uint32_t __attribute__((stdcall)) clock_read(void){
 logword(1);logword(clockCalls);if(!clockCalls&&a[6]){*w(BASE+0x958)=a[4];*w(BASE+0x95c)=a[5];*w(BASE+0x1c)=BASE+0x1100;}
 return a[clockCalls++?3:2];
}
static int __attribute__((thiscall)) prepare(void*self,uint32_t pending,uint32_t camera,uint32_t mode){logword(2);logword((uint32_t)self);logword(pending);logword(camera);logword(mode);*w(BASE+0x95c)=0xffffffff;*w(BASE+0x9f0)=0xdeadbeef;return a[7];}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);if(VirtualAlloc((void*)BASE,0x2000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)BASE)fail("arena");
 BYTE*p=(void*)0x200125b0;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)prepare-(uint32_t)p-5;*w(0x201278a8)=(uint32_t)clock_read;FlushInstructionCache(GetCurrentProcess(),0,0);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset((void*)BASE,0,0x2000);memset(trace,0,sizeof trace);used=clockCalls=0;
  *w(BASE+0x1c)=BASE+0x1000;*w(BASE+0x102c)=0x12345678;*w(BASE+0x112c)=0x87654321;*w(BASE+0x958)=a[0];*w(BASE+0x95c)=a[1];
  uint32_t result=((int(__attribute__((thiscall))*)(void*,float))0x20011000)((void*)BASE,0.016f);
  uint32_t row[5]={result,*w(BASE+0x958),*w(BASE+0x95c),*w(BASE+0x9f0),used};if(fwrite(row,sizeof row,1,out)!=1||fwrite(trace,sizeof trace,1,out)!=1)fail("write");
 }
 if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
