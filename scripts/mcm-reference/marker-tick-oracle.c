#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char marker[0xa4];
static uint32_t calls[8],used;
static int __attribute__((thiscall)) children(void*self,float dt){calls[used++]=1;calls[used++]=bits(dt);return 7;}
static void __attribute__((thiscall)) rotate(void*self,float x,float y,float z,float angle){
 calls[used++]=2;calls[used++]=(uint32_t)(uintptr_t)self;
 calls[used++]=bits(x);calls[used++]=bits(y);calls[used++]=bits(z);calls[used++]=bits(angle);
}
static void patch(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)target-address-5;FlushInstructionCache(GetCurrentProcess(),p,5);}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);patch(0x20020760,children);patch(0x200b7d90,rotate);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 uint32_t dt,result;unsigned short cw=0x027f;
 while(fread(marker,sizeof marker,1,in)==1){
  if(fread(&dt,4,1,in)!=1)fail("input");used=0;memset(calls,0,sizeof calls);
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));
  result=((int (__attribute__((thiscall)) *)(void*,float))0x20075450)(marker,value(dt));
  if(fwrite(marker,sizeof marker,1,out)!=1||fwrite(&result,4,1,out)!=1||fwrite(&used,4,1,out)!=1||fwrite(calls,sizeof calls,1,out)!=1)fail("output");
 }
 if(ferror(in)||fclose(out))fail("finish");
 return 0;
}
