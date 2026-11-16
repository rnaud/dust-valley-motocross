#define main unused_helper_main
#include "oracle.c"
#undef main
#define BASE 0x21000000u
static uint32_t hit,calls;
static uint32_t*w(uint32_t p){return(uint32_t*)(uintptr_t)p;}
static int __attribute__((thiscall)) query(void*self,void*start,void*end,void*out,uint32_t option){if((uint32_t)self!=BASE+0x2000||(uint32_t)start!=BASE+0x1144||(uint32_t)end!=BASE+0x3000||option)fail("query arguments");calls++;return hit;}
int transition(uint32_t cached);
__asm__(".text\n_transition:\n push %esi\n mov $0x21000000,%esi\n mov 8(%esp),%eax\n mov $0x20022fc7,%edx\n call *%edx\n pop %esi\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);if(VirtualAlloc((void*)BASE,0x4000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)BASE)fail("arena");
 BYTE*p=(void*)0x20010ac0;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)query-(uint32_t)p-5;*(BYTE*)0x2002301a=0xc3;FlushInstructionCache(GetCurrentProcess(),0,0);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[7];size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset((void*)BASE,0,0x4000);*w(BASE+0x1c)=BASE+0x400;*w(BASE+0x42c)=BASE+0x1000;*w(BASE+0xf8)=BASE+0x500;*w(BASE+0x540)=BASE+0x2000;
  *w(BASE+0xfc)=a[0];*w(BASE+0x100)=a[1];*w(BASE+0x104)=a[2];*w(BASE+0x118)=a[3];hit=a[4];*w(BASE+0x108)=a[5];*w(BASE+0x10c)=a[6];calls=0;
  uint32_t cached=((int(__attribute__((thiscall))*)(void*,void*))0x20022ed0)((void*)BASE,(void*)(BASE+0x3000));uint32_t result=transition(cached);
  uint32_t row[7]={result,*w(BASE+0x100),*w(BASE+0x104),*w(BASE+0x118),*w(BASE+0x108),*w(BASE+0x10c),calls};if(fwrite(row,sizeof row,1,out)!=1)fail("write");
 }
 if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
