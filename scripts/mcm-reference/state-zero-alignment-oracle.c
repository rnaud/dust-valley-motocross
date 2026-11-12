#define main unused_helper_main
#include "oracle.c"
#undef main
float zero_alignment_input[57];uint32_t zero_alignment_output[32];
void run_zero_alignment(void);void zero_alignment_exit(void);
unsigned char alignment_node[0x114],alignment_component[0x48];
void setup_zero_alignment(unsigned char*s){
 float*v=zero_alignment_input;memset(alignment_node,0,sizeof alignment_node);
 memcpy(alignment_node+0x84,v,64);memcpy(alignment_node+0xc4,v,64);*(uint32_t*)(alignment_node+0x104)=(uint32_t)v[56];*(void**)(bike+0x434)=alignment_node;
 memcpy(bike+0x654,v+16,12);memcpy(bike+0x534,v+19,12);memcpy(bike+0x540,v+22,12);memcpy(bike+0x624,v+25,12);memcpy(s+0x420,v+28,12);
 *(uint32_t*)(s+0x58)=(uint32_t)v[31];*(uint32_t*)(s+0x34)=(uint32_t)v[32];memcpy(s+0x90,v+33,4);memcpy(s+0x78,v+34,4);memcpy(s+0x74,v+35,4);memcpy(s+0x2e8,v+36,12);
 memcpy(alignment_component+0x44,v+39,4);*(void**)(bike+0x8ec)=alignment_component;
 const unsigned offsets[]={0x6b0,0x6a8,0x6ac,0x6d8};for(int j=0;j<4;j++)memcpy(bike+offsets[j],v+40+j,4);
 memcpy(s+0x54,v+44,4);memcpy(s+0x4c,v+45,4);memcpy(bike+0x83c,v+46,4);memcpy(bike+0x4f0,v+47,4);memcpy(bike+0x4d8,v+48,4);memcpy(bike+0x840,v+49,4);memcpy(s+0x48,v+50,4);memcpy(s+0x10,v+51,4);*(uint32_t*)(s+0x24)=(uint32_t)v[52];memcpy(s+0x45c,v+53,12);
}
void copy_zero_alignment(unsigned char*s){
 memcpy(zero_alignment_output,alignment_node+0x84,64);memcpy(zero_alignment_output+16,bike+0x534,12);memcpy(zero_alignment_output+19,bike+0x540,12);memcpy(zero_alignment_output+22,bike+0x624,12);memcpy(zero_alignment_output+25,s+0x420,12);
 memcpy(zero_alignment_output+28,bike+0x6b0,4);memcpy(zero_alignment_output+29,bike+0x6a8,8);memcpy(zero_alignment_output+31,alignment_node+0x104,4);
}
__asm__(".text\n_run_zero_alignment:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup_zero_alignment\n add $4,%esp\n mov $_bike,%esi\n lea 0x510(%esi),%ebx\n lea 0x54c(%esi),%edi\n mov $0x200ac1f7,%eax\n jmp *%eax\n_zero_alignment_exit:\n mov %esp,%eax\n push %eax\n call _copy_zero_alignment\n add $4,%esp\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);const uint32_t exits[]={0x200ac5c5};
 for(int j=0;j<1;j++){unsigned char*p=(void*)(uintptr_t)exits[j];p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)zero_alignment_exit-exits[j]-5;}
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__cdecl *)(void))0x20001720)();((void (__cdecl *)(void))0x20001640)();memset((void*)0x20125290,0,12);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(zero_alignment_input,sizeof zero_alignment_input,1,in)!=1)fail("input");
  memset(bike,0,sizeof bike);run_zero_alignment();if(fwrite(zero_alignment_output,sizeof zero_alignment_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
