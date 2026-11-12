/* Original inertia/damping/integration block. Contact correction flag is clear. */
#define main unused_helper_main
#include "oracle.c"
#undef main
float angular_input[33],angular_output[12];
static unsigned char node[0x114];
void angular_step(void);void angular_end(void);
__asm__(
".text\n_angular_step:\n"
" push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n"
" mov $_bike,%esi\n mov _angular_input+124,%eax\n mov %eax,0x10(%esp)\n movl $0,0x24(%esp)\n"
" mov $_angular_input+76,%ebx\n lea 0x2d0(%esp),%edx\n"
" mov (%ebx),%eax\n mov %eax,(%edx)\n mov 4(%ebx),%eax\n mov %eax,4(%edx)\n mov 8(%ebx),%eax\n mov %eax,8(%edx)\n"
" mov $_angular_input+88,%ebx\n lea 0x360(%esp),%edx\n"
" mov (%ebx),%eax\n mov %eax,(%edx)\n mov 4(%ebx),%eax\n mov %eax,4(%edx)\n mov 8(%ebx),%eax\n mov %eax,8(%edx)\n"
" mov $0x200aaa55,%eax\n jmp *%eax\n"
"_angular_end:\n add $0x14,%esp\n"
" lea 0x3b4(%esp),%esi\n mov $_angular_output+12,%edi\n mov $3,%ecx\n rep movsl\n"
" lea 0x42c(%esp),%esi\n mov $6,%ecx\n rep movsl\n"
" add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n"
);
int main(int argc,char**argv) {
 if(argc!=4)return 2;
 map_image(argv[1]);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 uint8_t*p=(void*)0x200aaf02;p[0]=0xe9;int32_t jump=(intptr_t)angular_end-(intptr_t)(p+5);memcpy(p+1,&jump,4);FlushInstructionCache(GetCurrentProcess(),p,5);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open angular cases/results");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid count");
 for(uint32_t i=0;i<count;i++) {
  memset(bike,0,sizeof bike);memset(node,0,sizeof node);
  if(fread(angular_input,sizeof angular_input,1,in)!=1)fail("truncated input");
  memcpy(node+0xc4,angular_input,64);node[0x104]=1;*(void**)(bike+0x434)=node;
  memcpy(bike+0x534,angular_input+16,12);memcpy(bike+0x5f0,angular_input+25,24);
  *(uint32_t*)(bike+0x844)=(uint32_t)angular_input[32];
  angular_step();memcpy(angular_output,bike+0x534,12);
  if(fwrite(angular_output,sizeof angular_output,1,out)!=1)fail("write result");
 }
 if(fgetc(in)!=EOF)fail("trailing input");
 fclose(in);if(fclose(out))fail("close results");return 0;
}
