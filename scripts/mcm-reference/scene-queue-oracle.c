#define main unused_helper_main
#include "oracle.c"
#undef main
#define BASE 0x21000000u
static uint32_t input[8],freed,children_count;
static uint32_t*word(uint32_t a){return(uint32_t*)(uintptr_t)a;}
static uint32_t head(unsigned i){return i?BASE+i*0x100:0;}
static int __attribute__((thiscall)) children(void*self,float dt){children_count++;*word((uint32_t)self+0x54)=head(input[1]);return 7;}
static void __cdecl release(void*p){freed=(uint32_t)p;if(input[7]!=3)*word(BASE+0x54)=head(input[7]);}
static void patch(uint32_t a,void*t){unsigned char*p=(void*)a;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)t-a-5;FlushInstructionCache(GetCurrentProcess(),p,5);}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);if(VirtualAlloc((void*)BASE,0x1000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)BASE)fail("arena");
 patch(0x20020760,children);patch(0x200be900,release);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");size_t n;
 while((n=fread(input,1,sizeof input,in))==sizeof input){
  memset((void*)BASE,0,0x1000);freed=children_count=0;
  *word(BASE+0x54)=head(input[0]);*word(BASE+0x180)=input[2];*word(BASE+0x184)=input[3];*word(BASE+0x188)=BASE+0x200;
  *word(BASE+0x280)=input[4];*word(BASE+0x284)=input[5];
  unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
  uint32_t result=((int(__attribute__((thiscall))*)(void*,float))0x200253e0)((void*)BASE,value(input[6]));
  uint32_t output[6]={result,*word(BASE+0x54),*word(BASE+0x184),*word(BASE+0x284),freed,children_count};if(fwrite(output,sizeof output,1,out)!=1)fail("output");
 }
 if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
