#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char uv_frame[0x40];void uv_phase(void);void uv_exit(void);
__asm__(".text\n_uv_phase:\n push %ebp\n push %ebx\n push %esi\n push %edi\n mov $_uv_frame+0x20,%ebp\n push $0x2003af75\n ret\n_uv_exit:\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){if(argc!=3)return 2;map_image(argv[1]);unsigned char*p=(void*)0x2003b003;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)uv_exit-(uint32_t)(uintptr_t)p-5;FlushInstructionCache(GetCurrentProcess(),p,5);unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));uv_phase();FILE*out=fopen(argv[2],"wb");if(!out||fwrite((void*)0x200f7b20,512,1,out)!=1||fclose(out))fail("output");return 0;}
