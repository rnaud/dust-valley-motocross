#define main unused_helper_main
#include "oracle.c"
#undef main
uint32_t control_input[3],control_output[2];
void control_start(void);void control_end(void);
__asm__(".text\n_control_start:\n push %ebx\n push %esi\n push %edi\n push %ebp\n sub $0xc0,%esp\n mov $_bike,%edi\n mov _control_input,%eax\n mov %eax,0xbc(%esp)\n mov _control_input+4,%eax\n mov %eax,0x2c(%esp)\n push $0x2006f4ea\n ret\n_control_end:\n mov 0x6f4(%edi),%eax\n mov %eax,_control_output\n mov 0x34(%esp),%eax\n mov %eax,_control_output+4\n add $0xc0,%esp\n pop %ebp\n pop %edi\n pop %esi\n pop %ebx\n ret\n");
int main(int argc,char**argv){if(argc!=4)return 2;map_image(argv[1]);if(memcmp((void*)0x2006f4ea,"\xd9\x44\x24\x2c",4)||memcmp((void*)0x2006f69e,"\x8b\x87\xa4\x06\x00\x00",6))fail("control guards");unsigned char*p=(void*)0x2006f69e;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)control_end-(uint32_t)(uintptr_t)p-5;FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");size_t n;unsigned count=0;unsigned short cw=0x027f;while((n=fread(control_input,1,sizeof control_input,in))==sizeof control_input){put32(0x6f4,control_input[2]);__asm__ volatile("fninit; fldcw %0"::"m"(cw));control_start();if(fwrite(control_output,sizeof control_output,1,out)!=1)fail("write");count++;}if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",count);return 0;}
