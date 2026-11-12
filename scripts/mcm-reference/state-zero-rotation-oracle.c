#define main unused_helper_main
#include "oracle.c"
#undef main
float zero_rotation_input[58];uint32_t zero_rotation_output[38];
void run_zero_rotation(void);void zero_rotation_exit(void);
unsigned char control_component[4],control_node[0x114],control_engine[0x164];
unsigned char rotation_node[0x114];
void setup_zero_rotation(unsigned char*s){
 float*v=zero_rotation_input;
 *(uint32_t*)(s+0x3c)=(uint32_t)v[0];*(uint32_t*)(s+0x40)=(uint32_t)v[1];*(uint32_t*)(bike+0x4bc)=(uint32_t)v[2];
 memcpy(s+0x10,v+3,4);memcpy(bike+0x6ec,v+4,4);memcpy(bike+0x6f4,v+5,4);*(uint32_t*)(bike+0x820)=(uint32_t)v[6];
 memcpy(bike+0x730,v+7,4);*(uint32_t*)(bike+0x710)=(uint32_t)v[8];memcpy(bike+0x594,v+9,4);*(uint32_t*)(bike+0xc68)=(uint32_t)v[10];
 memcpy(bike+0x5e4,v+11,4);*(uint32_t*)(bike+0x6fc)=(uint32_t)v[12];memcpy(control_engine+0x160,v+13,4);*(void**)(bike+0x8f0)=control_engine;
 memcpy(bike+0x510,v+14,12);memcpy(bike+0x6a4,v+17,4);memcpy(control_node+0xe4,v+18,12);*(void**)control_component=control_node;*(void**)(bike+0x8d8)=control_component;
 memcpy(bike+0x540,v+21,12);memcpy(bike+0x54c,v+24,12);memcpy(s+0x318,v+27,12);memcpy(bike+0x534,v+30,12);
 memset(rotation_node,0,sizeof rotation_node);memcpy(rotation_node+0x84,v+33,64);*(uint32_t*)(rotation_node+0x104)=1;*(void**)(bike+0x434)=rotation_node;
 memcpy(bike+0x66c,v+49,12);memcpy(bike+0xc6c,v+52,16);memcpy(bike+0x4d8,v+56,4);memcpy(s+0x48,v+57,4);*(uint32_t*)(s+0x94)=0;

}
void copy_zero_rotation(unsigned char*s){memcpy(zero_rotation_output,s+0x318,12);memcpy(zero_rotation_output+3,bike+0x540,24);memcpy(zero_rotation_output+9,bike+0x510,12);memcpy(zero_rotation_output+12,bike+0x6a4,4);memcpy(zero_rotation_output+13,bike+0x534,12);memcpy(zero_rotation_output+16,rotation_node+0x84,64);memcpy(zero_rotation_output+32,bike+0xc6c,16);memcpy(zero_rotation_output+36,s+0x94,4);memcpy(zero_rotation_output+37,rotation_node+0x104,4);}
__asm__(".text\n_run_zero_rotation:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup_zero_rotation\n add $4,%esp\n mov $_bike,%esi\n lea 0x510(%esi),%ebx\n lea 0x54c(%esi),%edi\n mov $0x200abb30,%eax\n jmp *%eax\n_zero_rotation_exit:\n mov %esp,%eax\n push %eax\n call _copy_zero_rotation\n add $4,%esp\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);const uint32_t exits[]={0x200ac17b,0x200ac64a,0x200ac1f7};
 for(int j=0;j<3;j++){unsigned char*p=(void*)(uintptr_t)exits[j];p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)zero_rotation_exit-exits[j]-5;}
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__cdecl *)(void))0x20001720)();((void (__cdecl *)(void))0x20001640)();memset((void*)0x20125290,0,12);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(zero_rotation_input,sizeof zero_rotation_input,1,in)!=1)fail("input");
  memset(bike,0,sizeof bike);run_zero_rotation();if(fwrite(zero_rotation_output,sizeof zero_rotation_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
