#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char settings[0x107c],context[0x18c0],others[4][0xcc8],terrain[0xa08],nodes[3][0x58],samples[289*16];
unsigned char target_manager[0x8c],targets[2][0x34],target_nodes[2][0x114];
void*primary[8],*secondary[8],*children[2][256];
float*selection_values;float position[3],forward[3];
void setup_selection(unsigned char*s){*(int*)(s+0x8c)=(int)selection_values[114];memcpy(s+0x378,position,12);memcpy(s+0x2f4,forward,12);}
void copy_selection(unsigned char*s){memcpy(position,s+0x378,12);memcpy(forward,s+0x2f4,12);}
void run_selection(void);void selection_exit(void);
__asm__(".text\n_run_selection:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%eax\n push %eax\n call _setup_selection\n add $4,%esp\n mov $_bike,%esi\n mov $0x200a5eb4,%eax\n jmp *%eax\n_selection_exit:\n mov %esp,%eax\n push %eax\n call _copy_selection\n add $4,%esp\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);unsigned char*exit_patch=(void*)0x200a62eb;exit_patch[0]=0xe9;*(uint32_t*)(exit_patch+1)=(uintptr_t)selection_exit-0x200a62eb-5;((void (__cdecl *)(void))0x2009d620)();((void (__cdecl *)(void))0x2009d650)();((void (__cdecl *)(void))0x20012910)();((void (__cdecl *)(void))0x20001640)();((void (__cdecl *)(void))0x20001720)();((void (__cdecl *)(void))0x2009d680)();
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  uint32_t v[936],r[906];if(fread(v,sizeof v,1,in)!=1)fail("input");float*g=(float*)(v+818);
  memcpy(bike,v,sizeof bike);memset(settings,0,sizeof settings);memset(context,0,sizeof context);memset(others,0,sizeof others);memset(primary,0,sizeof primary);memset(secondary,0,sizeof secondary);
  *(void**)0x200e4fb4=settings;*(short*)(settings+0x1072)=(short)g[0];*(short*)(settings+0x1070)=(short)g[1];*(int*)(settings+0x314)=(int)g[2];*(short*)(settings+0x107a)=(short)g[3];*(int*)(settings+0x614)=(int)g[4];
  put32(0xbb8,(int)g[5]);put32(0x88c,(int)g[6]);put32(0xc84,(uintptr_t)context);put32(0x8f4,(uintptr_t)terrain);memcpy(bike+0x4f8,g+14,12);memcpy(bike+0xbc0,g+17,12);memcpy(context+0x18bc,g+20,4);
  for(int j=0;j<4;j++){memcpy(others[j]+0x4f8,g+21+j*4,12);*(int*)(others[j]+0xc30)=(int)g[24+j*4];}
  primary[0]=bike;primary[1]=others[0];primary[2]=others[1];for(int j=0;j<4;j++)secondary[j]=others[(int)g[2]==1?j:j+2<4?j+2:0];
  *(void**)(context+0x30)=bike;*(void**)(context+0x34)=primary;*(void**)(context+0x38)=secondary;
  memset(terrain,0,sizeof terrain);memset(nodes,0,sizeof nodes);memset(children,0,sizeof children);memcpy(nodes[0]+0xc,g+38,8);*(void**)(nodes[0]+0x50)=samples;
  for(int j=0;j<289;j++){uint16_t h=(uint16_t)((int)g[37]+j*137);memcpy(samples+j*16+2,&h,2);}
  for(int j=1;j<3;j++){*(int*)(nodes[j]+0x20)=j;*(void**)(nodes[j]+0x54)=children[j-1];for(int k=0;k<256;k++)children[j-1][k]=nodes[j-1];}
  *(void**)(terrain+0x44)=nodes[2];memcpy(terrain+0xa04,g+40,4);memcpy(terrain+0x40,g+41,4);
  memcpy(bike+0x898,g+42,12);memset(target_manager,0,sizeof target_manager);memset(targets,0,sizeof targets);memset(target_nodes,0,sizeof target_nodes);
  *(void**)(settings+0x600)=g[45]?target_manager:NULL;*(int*)(target_manager+0x88)=(int)g[46];
  for(int j=0;j<2;j++){*(void**)(target_manager+0x80+j*4)=targets[j];*(void**)(targets[j]+0x30)=target_nodes[j];memcpy(target_nodes[j]+0x84,g+47+j*33,128);*(int*)(target_nodes[j]+0x104)=(int)g[79+j*33];}
  if(g[113]){*(void**)(target_nodes[1]+0x108)=target_nodes[0];*(void**)(target_nodes[0]+0x10c)=target_nodes[1];}
  memcpy(position,g+8,12);memcpy(forward,g+11,12);
  selection_values=g;put32(0x614,(int)g[115]);put32(0xc08,(int)g[116]);put32(0xbe4,(int)g[117]);run_selection();
  put32(0xc84,v[0xc84/4]);put32(0x8f4,v[0x8f4/4]);memcpy(r,bike,sizeof bike);memcpy(r+818,position,12);memcpy(r+821,forward,12);
  for(int j=0;j<4;j++){memcpy(r+824+j*4,others[j]+0x4f8,12);memcpy(r+827+j*4,others[j]+0xc30,4);}
  for(int j=0;j<2;j++){memcpy(r+840+j*33,target_nodes[j]+0x84,128);memcpy(r+872+j*33,target_nodes[j]+0x104,4);}
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
