#define main unused_helper_main
#include "oracle.c"
#undef main
float forces_input[34];uint32_t forces_output[12];
void run_forces(void);void forces_exit(void);
void setup_forces(unsigned char*s){
 float*v=forces_input;
 memcpy(bike+0x558,v,4);memcpy(s+0x190,v+1,4);*(uint32_t*)(s+0xa8)=(uint32_t)v[2];*(uint32_t*)(s+0xa4)=(uint32_t)v[3];
 memcpy(s+0x4a4,v+4,12);memcpy(s+0x84c,v+7,12);memcpy(s+0x23c,v+10,4);memcpy(bike+0x5b8,v+11,16);memcpy(bike+0x5ac,v+15,4);memcpy(s+0x894,v+16,12);
 memcpy(s+0x498,v+19,12);memcpy(s+0x840,v+22,12);memcpy(s+0x238,v+25,4);memcpy(bike+0x5c8,v+26,16);memcpy(bike+0x5a8,v+30,4);memcpy(s+0x888,v+31,12);
}
void copy_forces(unsigned char*s){memcpy(forces_output,s+0x408,12);memcpy(forces_output+3,s+0x894,12);memcpy(forces_output+6,s+0x414,12);memcpy(forces_output+9,s+0x888,12);}
__asm__(".text\n_run_forces:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup_forces\n add $4,%esp\n mov $_bike,%esi\n mov $0x200a9bbf,%eax\n jmp *%eax\n_forces_exit:\n mov %esp,%eax\n push %eax\n call _copy_forces\n add $4,%esp\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);unsigned char*p=(void*)0x200a9d5c;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)forces_exit-0x200a9d5c-5;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__cdecl *)(void))0x20001640)();memset((void*)0x20125290,0,12);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(forces_input,sizeof forces_input,1,in)!=1)fail("input");
  memset(bike,0,sizeof bike);run_forces();if(fwrite(forces_output,sizeof forces_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
