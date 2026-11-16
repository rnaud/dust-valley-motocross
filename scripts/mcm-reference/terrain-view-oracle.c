#define main unused_helper_main
#include "oracle.c"
#undef main
#define BASE 0x21000000u
static DWORD __attribute__((stdcall)) clock_read(void){return 0;}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);if(VirtualAlloc((void*)BASE,0x2000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)BASE)fail("arena");
 BYTE*p=(void*)0x200126c8;p[0]=0xe9;*(uint32_t*)(p+1)=0x20012892-(uint32_t)p-5;*(uint32_t*)0x201278a8=(uint32_t)clock_read;FlushInstructionCache(GetCurrentProcess(),0,0);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[8];size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset(bike,0x55,sizeof bike);memset((void*)BASE,0,0x2000);put32(0x40,a[0]);put32(0x54,a[7]);memcpy((void*)(BASE+0x144),a+1,12);*(uint32_t*)(BASE+0x13c)=a[4];*(uint32_t*)(BASE+0x180)=a[5];
  unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
  ((void(__attribute__((thiscall))*)(void*,uint32_t,void*,uint32_t))0x200125b0)(bike,0,(void*)BASE,a[6]);
  if(fwrite(bike+0x40,0x78,1,out)!=1)fail("write");
 }
 if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
