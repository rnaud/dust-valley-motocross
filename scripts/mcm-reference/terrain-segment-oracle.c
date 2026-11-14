// Isolated wrapper oracle: original 0x410ac0 and its clipping helpers execute.
// ONLY 0x48e4c0 is replaced to record its arguments and supply explicit outputs.
// This validates the wrapper boundary, not terrain traversal or live query hits.
#define main unused_helper_main
#include "oracle.c"
#undef main
static uint32_t input[18],observed[12];
static unsigned char terrain[0x48],root[0x28];
static uint32_t __attribute__((thiscall)) traversal(void*self,float*a,float*b,float*out,void*option){
 if(self!=root)fail("root identity");
 observed[1]++;memcpy(observed+2,a,12);memcpy(observed+5,b,12);
 observed[11]=(uint32_t)(uintptr_t)option;memcpy(out,input+13,12);return input[16];
}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);
 unsigned char*entry=(void*)0x2008e4c0;
 if(entry[0]!=0x81||entry[1]!=0xec)fail("unexpected traversal entry");
 entry[0]=0xe9;*(uint32_t*)(entry+1)=(uint32_t)(uintptr_t)traversal-(uint32_t)(uintptr_t)entry-5;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 unsigned short cw=0x027f;
 while(fread(input,sizeof input,1,in)==1){
  memset(observed,0,sizeof observed);memcpy(terrain+0x40,input,4);*(void**)(terrain+0x44)=root;
  memcpy(root+0x14,input+1,8);memcpy(root+0x24,input+3,4);memcpy(observed+8,input+10,12);
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));
  observed[0]=((uint32_t (__attribute__((thiscall)) *)(void*,void*,void*,void*,void*))0x20010ac0)
   (terrain,input+4,input+7,observed+8,(void*)(uintptr_t)input[17]);
  if(fwrite(observed,sizeof observed,1,out)!=1)fail("write");
 }
 if(ferror(in)||fclose(out))fail("finish");
 return 0;
}
