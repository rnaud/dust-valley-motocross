#define main unused_helper_main
#include "oracle.c"
#undef main
float blend_input[13],blend_envelope[4];uint32_t blend_output[7];unsigned char blend_component[0x4c];
void run_blend(void);void blend_exit(void);
void setup_blend(unsigned char*s){
 float*v=blend_input;put32(0x820,(int)v[0]);memcpy(bike+0x6f4,v+1,4);memcpy(bike+0x730,v+2,4);memcpy(bike+0x708,v+3,4);memcpy(bike+0x704,v+4,4);memcpy(blend_envelope,v+5,16);put32(0x904,(uintptr_t)blend_envelope);memcpy(bike+0x8cc,v+9,4);memcpy(blend_component+0x44,v+10,8);put32(0x8ec,(uintptr_t)blend_component);memcpy(s+0xc8,v+12,4);
}
void copy_blend(void){memcpy(blend_output,bike+0x730,4);memcpy(blend_output+1,bike+0x708,4);memcpy(blend_output+2,bike+0x704,4);memcpy(blend_output+3,blend_envelope,16);}
__asm__(".text\n_run_blend:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup_blend\n add $4,%esp\n mov $_bike,%esi\n lea 0x820(%esi),%edi\n mov $0x200af185,%eax\n jmp *%eax\n_blend_exit:\n call _copy_blend\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);unsigned char*p=(void*)0x200af6f6;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)blend_exit-0x200af6f6-5;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(blend_input,sizeof blend_input,1,in)!=1)fail("input");
  memset(bike,0,sizeof bike);run_blend();if(fwrite(blend_output,sizeof blend_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
