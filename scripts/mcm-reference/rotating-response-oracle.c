#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char component[0x60],node[0x114];
float response_input[49];uint32_t response_output[33];
void run_response(void);void response_exit(void);
void setup_response(unsigned char*s){
 memcpy(s+0x10,response_input+16,4);*(uint32_t*)(s+0x2c)=(uint32_t)response_input[35];
 memcpy(s+0x4f8,response_input+23,12);memcpy(s+0x858,response_input+26,12);memcpy(s+0x2e8,response_input+29,12);
 memcpy(s+0x30c,response_input+37,12);memcpy(s+0x498,response_input+40,12);memcpy(s+0x840,response_input+43,12);
 memcpy(s+0x238,response_input+46,4);
}
void copy_response(unsigned char*s){
 memcpy(response_output,s+0x498,12);memcpy(response_output+3,s+0x840,12);memcpy(response_output+6,s+0x84,4);memcpy(response_output+7,s+0x238,4);
 memcpy(response_output+8,node+0x84,64);memcpy(response_output+24,component+0x58,4);
 memcpy(response_output+25,component+0x44,4);memcpy(response_output+26,s+0x40,4);memcpy(response_output+27,node+0x104,4);
 memcpy(response_output+28,bike+0x594,4);memcpy(response_output+29,s+0x30c,12);memcpy(response_output+32,s+0xa4,4);
}
__asm__(".text\n_run_response:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup_response\n add $4,%esp\n mov $_bike,%esi\n mov $0x200a7b33,%eax\n jmp *%eax\n_response_exit:\n mov %esp,%eax\n push %eax\n call _copy_response\n add $4,%esp\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);unsigned char*p=(void*)0x200a7c46;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)response_exit-0x200a7c46-5;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__cdecl *)(void))0x2009d650)();memset((void*)0x20125290,0,12);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  float*v=response_input;if(fread(v,sizeof response_input,1,in)!=1)fail("input");
  memset(bike,0,sizeof bike);memset(component,0,sizeof component);memset(node,0,sizeof node);
  *(void**)component=node;*(void**)(bike+0x8e8)=component;memcpy(node+0x84,v,64);
  memcpy(component+0x54,v+18,4);memcpy(component+0x48,v+19,8);memcpy(component+0x58,v+21,8);
  memcpy(bike+0x594,v+17,4);memcpy(bike+0x510,v+32,12);
  *(uint32_t*)(bike+0x844)=(uint32_t)v[36];*(uint32_t*)(component+0x44)=(uint32_t)v[47];*(uint32_t*)(node+0x104)=(uint32_t)v[48];
  run_response();if(fwrite(response_output,33*4,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
