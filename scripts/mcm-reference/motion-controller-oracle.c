#define main unused_helper_main
#include "oracle.c"
#undef main
float motion_controller_input[152];uint32_t motion_controller_output[104];
void run_motion_controller(void);void motion_controller_exit(void);
unsigned char motion_controller_node[0x114],motion_controller_component[0x48],motion_controller_controller[0x174];
unsigned char wheel_components[2][0x50],wheel_nodes[2][0x114],rotation_engine[0x164];
unsigned char handoff_other[0xcc8];
void setup_motion_controller(unsigned char*s){
 float*v=motion_controller_input;
 memcpy(s+0x294,v,12);memcpy(s+0x2ac,v+3,12);memcpy(s+0x2b8,v+6,12);
 memcpy(s+0x3c0,v+9,12);memcpy(s+0x3fc,v+12,12);
 memset(motion_controller_node,0,sizeof motion_controller_node);memcpy(motion_controller_node+0xc4,v+15,64);memcpy(motion_controller_node+0x84,v+15,64);*(uint32_t*)(motion_controller_node+0x104)=1;
 *(void**)(bike+0x434)=motion_controller_node;memcpy(bike+0x6ec,v+31,4);memcpy(bike+0x8bc,v+32,4);
 memcpy(s+0x354,v+33,12);memcpy(bike+0x4dc,v+36,4);memcpy(bike+0x534,v+37,12);
 *(uint32_t*)(bike+0x614)=(uint32_t)v[40];/* input[41] reserved; front flag below is shared by both blocks. */
 memcpy(motion_controller_component+0x44,v+42,4);*(void**)(bike+0x8ec)=motion_controller_component;
 memcpy(bike+0x5f0,v+43,24);memcpy(s+0x10,v+49,4);*(uint32_t*)(bike+0x844)=(uint32_t)v[50];
 memcpy(s+0x360,v+51,12);memcpy(bike+0x654,v+54,12);
 *(uint32_t*)(s+0x24)=(uint32_t)v[57];*(uint32_t*)(s+0x34)=(uint32_t)v[58];
 *(uint32_t*)(s+0x18)=(uint32_t)v[59];*(uint32_t*)(s+0x14)=(uint32_t)v[60];*(uint32_t*)(s+0x58)=(uint32_t)v[61];
 memcpy(bike+0x4d8,v+62,4);memcpy(bike+0x560,v+63,4);
 *(uint32_t*)(motion_controller_controller+0x170)=(uint32_t)v[64];*(uint32_t*)(motion_controller_controller+0x140)=(uint32_t)v[65];*(void**)(bike+0x874)=motion_controller_controller;
 const unsigned offsets[]={0x894,0x6ac,0x590,0x594,0x6a4,0x5d8,0x4f4};
 for(int j=0;j<7;j++)memcpy(bike+offsets[j],v+66+j,4);
 *(uint32_t*)(s+0x4c)=0;
 memcpy(bike+0x55c,v+73,4);memcpy(bike+0x4f8,v+74,12);memcpy(bike+0x510,v+77,12);
 *(uint32_t*)(bike+0x61c)=(uint32_t)v[80];memcpy(bike+0x738,v+81,4);memcpy(s+0xcc,v+82,4);memcpy(s+0xc8,v+83,4);
 memcpy(bike+0x584,v+84,12);memcpy(s+0x4ec,v+87,12);memcpy(s+0x90,v+90,4);memcpy(s+0x44,v+91,4);memcpy(s+0x54,v+92,4);
 memcpy(bike+0x5dc,v+93,4);memcpy(s+0x68,v+94,4);memcpy(bike+0x4f0,v+95,4);memcpy(bike+0x8cc,v+96,4);memcpy(bike+0x6d8,v+97,12);

 memset(wheel_components,0,sizeof wheel_components);memset(wheel_nodes,0,sizeof wheel_nodes);memset(rotation_engine,0,sizeof rotation_engine);
 for(int j=0;j<2;j++){
  memcpy(wheel_nodes[j]+0x84,v+100+j*16,64);*(uint32_t*)(wheel_nodes[j]+0x104)=1;
  *(void**)wheel_components[j]=wheel_nodes[j];memcpy(wheel_components[j]+0x48,v+132+j*2,8);
  *(void**)(bike+0x8dc+j*4)=wheel_components[j];
 }
 memcpy(bike+0x5e4,v+136,4);memcpy(rotation_engine+0x160,v+137,4);*(void**)(bike+0x8f0)=rotation_engine;
 *(uint32_t*)(bike+0x620)=(uint32_t)v[138];memcpy(s+0x50,v+139,4);

 *(uint32_t*)(motion_controller_controller+0x13c)=(uint32_t)v[140];*(uint32_t*)(bike+0x8b4)=(uint32_t)v[141];
 memset(handoff_other,0,sizeof handoff_other);memcpy(handoff_other+0x510,v+143,12);*(void**)(bike+0x8b0)=v[142]!=0?handoff_other:NULL;
 memcpy(motion_controller_controller+0x70,v+146,24);

}
void copy_motion_controller(unsigned char*s){
 memcpy(motion_controller_output,s+0x294,12);memcpy(motion_controller_output+3,s+0x2d0,12);
 memcpy(motion_controller_output+6,bike+0x534,12);memcpy(motion_controller_output+9,s+0x3b4,12);
 memcpy(motion_controller_output+12,s+0x42c,24);memcpy(motion_controller_output+18,bike+0x8bc,4);
 memcpy(motion_controller_output+19,bike+0x660,12);memcpy(motion_controller_output+22,motion_controller_node+0x84,64);memcpy(motion_controller_output+38,bike+0x6ac,4);memcpy(motion_controller_output+39,s+0x58,4);
 memcpy(motion_controller_output+40,bike+0x4f8,12);memcpy(motion_controller_output+43,bike+0x510,12);memcpy(motion_controller_output+46,bike+0x6a4,4);
 memcpy(motion_controller_output+47,bike+0x51c,12);memcpy(motion_controller_output+50,s+0x4e0,12);memcpy(motion_controller_output+53,bike+0x540,12);
 memcpy(motion_controller_output+56,bike+0x6d8,12);memcpy(motion_controller_output+59,s+0x78,4);

 memcpy(motion_controller_output+60,wheel_nodes[0]+0x84,64);memcpy(motion_controller_output+76,wheel_nodes[1]+0x84,64);
 memcpy(motion_controller_output+92,wheel_components[0]+0x4c,4);memcpy(motion_controller_output+93,wheel_components[1]+0x4c,4);
 memcpy(motion_controller_output+94,s+0xa0,4);memcpy(motion_controller_output+95,motion_controller_node+0x104,4);
 memcpy(motion_controller_output+96,wheel_nodes[0]+0x104,4);memcpy(motion_controller_output+97,wheel_nodes[1]+0x104,4);

 memcpy(motion_controller_output+98,motion_controller_controller+0x70,24);

}
__asm__(".text\n_run_motion_controller:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup_motion_controller\n add $4,%esp\n mov $_bike,%esi\n lea 0x540(%esi),%ebx\n lea 0x54c(%esi),%edi\n mov $0x200aa77d,%eax\n jmp *%eax\n_motion_controller_exit:\n mov %esp,%eax\n push %eax\n call _copy_motion_controller\n add $4,%esp\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);
 const uint32_t exits[]={0x200ab99f,0x200abb30};for(int j=0;j<2;j++){unsigned char*p=(void*)(uintptr_t)exits[j];p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)motion_controller_exit - exits[j] - 5;}
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__cdecl *)(void))0x2009d620)();((void (__cdecl *)(void))0x2009d680)();((void (__cdecl *)(void))0x20001720)();((void (__cdecl *)(void))0x20001640)();memset((void*)0x20125290,0,12);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;
 if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  if(fread(motion_controller_input,sizeof motion_controller_input,1,in)!=1)fail("input");
  memset(bike,0,sizeof bike);run_motion_controller();if(fwrite(motion_controller_output,sizeof motion_controller_output,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
