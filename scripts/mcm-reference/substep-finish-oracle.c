#define main unused_helper_main
#include "oracle.c"
#undef main
#include "oracle-imports.h"
float finish_input[10];uint32_t finish_output[16];unsigned char finish_node[0x114];
void run_finish(void);void finish_exit(void);
void setup_finish(unsigned char*s){
 float*v=finish_input;memset(bike,0,sizeof bike);memset(finish_node,0,sizeof finish_node);
 memcpy(finish_node+0xa4,v,12);memcpy(finish_node+0x94,v+3,12);put32(0x434,(uintptr_t)finish_node);memcpy(bike+0x8c8,v+7,4);
 *(int*)(s+0x20)=(int)v[6];memcpy(s+0x10,v+8,4);memcpy(s+0x48,v+9,4);
}
void copy_finish(unsigned char*s){
 memcpy(finish_output,s+0x20,4);finish_output[1]=get32(0x8c8);memcpy(finish_output+2,s+0x10,4);memcpy(finish_output+3,s+0x48,4);
 memcpy(finish_output+4,bike+0x4c0,24);finish_output[10]=get32(0x4e0);finish_output[11]=get32(0x4dc);finish_output[12]=get32(0x4d8);memcpy(finish_output+13,bike+0x4e4,12);
}
__asm__(".text\n_run_finish:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup_finish\n add $4,%esp\n mov $_bike,%esi\n mov $0x200ac89e,%eax\n jmp *%eax\n_finish_exit:\n add $0x30,%esp\n mov %esp,%eax\n push %eax\n call _copy_finish\n add $4,%esp\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);bind_oracle_kernel_imports();
 if(!((int (__cdecl *)(void))0x200c5230)())fail("CRT heap");
 if(!((int (__cdecl *)(void))0x200c24e0)())fail("CRT thread");
 unsigned char*p=(void*)0x200ac94b;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)finish_exit-0x200ac94b-5;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(finish_input,sizeof finish_input,1,in)!=1)fail("input");
  run_finish();
  if(fwrite(finish_output,sizeof finish_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
