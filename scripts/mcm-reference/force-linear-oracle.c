#define main unused_helper_main
#include "oracle.c"
#undef main
float linear_input[37];uint32_t linear_output[20];
void run_linear(void);void linear_exit(void);
void setup_linear(unsigned char*s){
 float*v=linear_input;
 memcpy(s+0x294,v,12);memcpy(bike+0x55c,v+3,4);memcpy(s+0x10,v+4,4);
 memcpy(bike+0x4f8,v+5,12);memcpy(bike+0x510,v+8,12);*(uint32_t*)(bike+0x61c)=(uint32_t)v[11];
 *(uint32_t*)(s+0x34)=(uint32_t)v[12];*(uint32_t*)(s+0x24)=(uint32_t)v[13];
 memcpy(bike+0x738,v+14,4);memcpy(s+0xcc,v+15,4);memcpy(s+0xc8,v+16,4);
 memcpy(bike+0x584,v+17,12);memcpy(s+0x4ec,v+20,12);memcpy(bike+0x540,v+23,12);
 const unsigned stack[]={0x90,0x44,0x54,0,0x68};
 for(int j=0;j<5;j++)if(stack[j])memcpy(s+stack[j],v+26+j,4);
 memcpy(bike+0x5dc,v+29,4);memcpy(bike+0x5f4,v+31,4);memcpy(bike+0x4f0,v+32,4);
 memcpy(bike+0x8cc,v+33,4);memcpy(bike+0x6d8,v+34,12);
}
void copy_linear(unsigned char*s){
 memcpy(linear_output,bike+0x4f8,12);memcpy(linear_output+3,bike+0x510,12);memcpy(linear_output+6,bike+0x6a4,4);
 memcpy(linear_output+7,bike+0x51c,12);memcpy(linear_output+10,s+0x4e0,12);memcpy(linear_output+13,bike+0x540,12);
 memcpy(linear_output+16,bike+0x6d8,12);memcpy(linear_output+19,s+0x78,4);
}
__asm__(".text\n_run_linear:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup_linear\n add $4,%esp\n mov $_bike,%esi\n xor %ebx,%ebx\n sub $0x14,%esp\n mov $0x200aaf02,%eax\n jmp *%eax\n_linear_exit:\n mov %esp,%eax\n push %eax\n call _copy_linear\n add $4,%esp\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);unsigned char*p=(void*)0x200ab49e;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)linear_exit - 0x200ab49e - 5;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__cdecl *)(void))0x20001640)();memset((void*)0x20125290,0,12);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(linear_input,sizeof linear_input,1,in)!=1)fail("input");
  memset(bike,0,sizeof bike);run_linear();if(fwrite(linear_output,sizeof linear_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
