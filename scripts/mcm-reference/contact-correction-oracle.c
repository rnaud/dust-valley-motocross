/* Original inertia/damping/integration block. Contact correction flag is clear. */
#define main unused_helper_main
#include "oracle.c"
#undef main
float angular_input[47],angular_output[4];
static unsigned char node[0x114],controller[0x174],component[0x48];
void angular_step(void);void angular_end(void);
__asm__(
".text\n_angular_step:\n"
" push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n"
" mov $_bike,%esi\n mov _angular_input+184,%eax\n mov %eax,0x10(%esp)\n"
" mov _angular_input+116,%eax\n mov %eax,0x24(%esp)\n"
" mov _angular_input+120,%eax\n mov %eax,0x34(%esp)\n"
" mov _angular_input+124,%eax\n mov %eax,0x18(%esp)\n"
" mov _angular_input+128,%eax\n mov %eax,0x14(%esp)\n"
" mov _angular_input+132,%eax\n mov %eax,0x58(%esp)\n"
" mov $_angular_input+76,%ebx\n lea 0x2d0(%esp),%edx\n"
" mov (%ebx),%eax\n mov %eax,(%edx)\n mov 4(%ebx),%eax\n mov %eax,4(%edx)\n mov 8(%ebx),%eax\n mov %eax,8(%edx)\n"
" mov $0x200aaa55,%eax\n jmp *%eax\n"
"_angular_end:\n"
" lea 0x3b4(%esp),%esi\n mov $_angular_output,%edi\n mov $3,%ecx\n rep movsl\n"
" mov 0x58(%esp),%eax\n mov %eax,_angular_output+12\n"
" add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n"
);
int main(int argc,char**argv) {
 if(argc!=4)return 2;
 map_image(argv[1]);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 uint8_t*p=(void*)0x200aaded;p[0]=0xe9;int32_t jump=(intptr_t)angular_end-(intptr_t)(p+5);memcpy(p+1,&jump,4);FlushInstructionCache(GetCurrentProcess(),p,5);
 ((void (__cdecl *)(void))0x2009d620)();
 ((void (__cdecl *)(void))0x2009d680)();
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open angular cases/results");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("invalid count");
 for(uint32_t i=0;i<count;i++) {
  memset(bike,0,sizeof bike);memset(node,0,sizeof node);
  if(fread(angular_input,sizeof angular_input,1,in)!=1)fail("truncated input");
  memcpy(node+0x84,angular_input,64);*(void**)(bike+0x434)=node;
  memcpy(bike+0x654,angular_input+16,12);memcpy(bike+0x5f0,angular_input+22,24);
  *(uint32_t*)(bike+0x844)=(uint32_t)angular_input[28];
  memcpy(bike+0x4d8,angular_input+34,4);memcpy(bike+0x560,angular_input+35,4);
  *(uint32_t*)(controller+0x170)=(uint32_t)angular_input[36];*(uint32_t*)(controller+0x140)=(uint32_t)angular_input[37];
  *(void**)(bike+0x874)=controller;*(void**)(bike+0x8ec)=component;memcpy(component+0x44,angular_input+38,4);
  const unsigned offsets[]={0x894,0x6ac,0x590,0x594,0x6a4,0x5d8,0x4f4};
  for(int j=0;j<7;j++)memcpy(bike+offsets[j],angular_input+39+j,4);
  for(int j=29;j<=33;j++){uint32_t v=(uint32_t)angular_input[j];memcpy(angular_input+j,&v,4);}
  angular_step();
  if(fwrite(node+0x84,64,1,out)!=1||fwrite(angular_output,12,1,out)!=1||fwrite(bike+0x6ac,4,1,out)!=1||fwrite(angular_output+3,4,1,out)!=1)fail("write result");
 }
 if(fgetc(in)!=EOF)fail("trailing input");
 fclose(in);if(fclose(out))fail("close results");return 0;
}
