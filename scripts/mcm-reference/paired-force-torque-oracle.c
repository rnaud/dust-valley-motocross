#define main unused_helper_main
#include "oracle.c"
#undef main
float paired_input[33];uint32_t paired_output[13];
void run_paired(void);void paired_exit(void);
unsigned char paired_node[0x114];
void setup_paired(unsigned char*s){
 float*v=paired_input;
 memcpy(s+0x294,v,12);memcpy(s+0x2ac,v+3,12);memcpy(s+0x2b8,v+6,12);
 memcpy(s+0x3c0,v+9,12);memcpy(s+0x3fc,v+12,12);
 memset(paired_node,0,sizeof paired_node);memcpy(paired_node+0xc4,v+15,64);*(uint32_t*)(paired_node+0x104)=1;
 *(void**)(bike+0x434)=paired_node;memcpy(bike+0x6ec,v+31,4);memcpy(bike+0x8bc,v+32,4);
}
void copy_paired(unsigned char*s){memcpy(paired_output,s+0x294,12);memcpy(paired_output+3,s+0x2d0,12);memcpy(paired_output+6,bike+0x540,24);memcpy(paired_output+12,bike+0x8bc,4);}
__asm__(".text\n_run_paired:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup_paired\n add $4,%esp\n mov $_bike,%esi\n lea 0x540(%esi),%ebx\n lea 0x54c(%esi),%edi\n mov $0x200aa77d,%eax\n jmp *%eax\n_paired_exit:\n mov %esp,%eax\n push %eax\n call _copy_paired\n add $4,%esp\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);unsigned char*p=(void*)0x200aa959;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)paired_exit-0x200aa959-5;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__cdecl *)(void))0x20001640)();memset((void*)0x20125290,0,12);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(paired_input,sizeof paired_input,1,in)!=1)fail("input");
  memset(bike,0,sizeof bike);run_paired();if(fwrite(paired_output,sizeof paired_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
