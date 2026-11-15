#define main unused_helper_main
#include "oracle.c"
#undef main
uint32_t product_input[32],product_output[16];void product_phase(void);void product_exit(void);
__asm__(".text\n_product_phase:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0x100,%esp\n mov $_product_input,%esi\n lea 0x10(%esp),%edi\n mov $16,%ecx\n rep movsl\n lea 0x50(%esp),%edi\n mov $16,%ecx\n rep movsl\n mov $_product_input+64,%esi\n lea 0x90(%esp),%edi\n mov $16,%ecx\n rep movsl\n push $0x2004fb53\n ret\n_product_exit:\n lea 0x90(%esp),%esi\n mov $_product_output,%edi\n mov $16,%ecx\n rep movsl\n add $0x100,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);unsigned char*p=(void*)0x2004febd;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)product_exit-(uintptr_t)p-5;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");while(fread(product_input,sizeof product_input,1,in)==1){unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));product_phase();if(fwrite(product_output,sizeof product_output,1,out)!=1)fail("write");}return ferror(in)||fclose(out)?7:0;
}
