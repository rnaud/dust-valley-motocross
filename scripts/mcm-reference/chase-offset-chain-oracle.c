#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char chase_camera[0x240],chase_frame[0xd0],chase_actor[0x958],chase_bike[0x500];uint32_t chase_filters[6][4];
void chase_phase(void);void chase_exit(void);
__asm__(".text\n_chase_phase:\n push %ebp\n push %ebx\n push %esi\n push %edi\n mov $_chase_camera,%esi\n mov $_chase_frame+0xc0,%ebp\n push $0x2007d166\n ret\n_chase_exit:\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
static unsigned allocations;
static void* __cdecl allocate_record(unsigned size){if(size!=16||allocations>=6)fail("unexpected allocation");return chase_filters[allocations++];}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);
 HMODULE dll=LoadLibraryA("C:/windows/syswow64/d3drm.dll");if(!dll)fail("DLL");
 FARPROC rotate=GetProcAddress(dll,"D3DRMVectorRotate");if(!rotate)fail("export");*(FARPROC*)0x201278b8=rotate;
 unsigned char*p=(void*)0x2007d606;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)chase_exit-(uint32_t)(uintptr_t)p-5;FlushInstructionCache(GetCurrentProcess(),p,5);
 unsigned char*q=(void*)0x200be910;q[0]=0xe9;*(uint32_t*)(q+1)=(uint32_t)(uintptr_t)allocate_record-(uint32_t)(uintptr_t)q-5;FlushInstructionCache(GetCurrentProcess(),q,5);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t args[26];
 while(fread(args,sizeof args,1,in)==1){
  memset(chase_camera,0,sizeof chase_camera);memset(chase_frame,0,sizeof chase_frame);memset(chase_actor,0,sizeof chase_actor);allocations=0;memset(chase_bike,0,sizeof chase_bike);
  float axis[3]={0,1,0};memcpy((void*)0x2011edb0,axis,12);*(void**)(chase_camera+0x1ec)=chase_bike;
  memcpy(chase_frame+0x5c,args,12);memcpy(chase_frame+0x80,args+3,12);memcpy(chase_frame+0x8c,args+6,12);memcpy(chase_frame+0xb0,args+9,4);memcpy(chase_camera+0x1d4,args+10,4);memcpy(chase_camera+0x1f4,args+11,4);memcpy(chase_actor+0x954,args+12,4);*(void**)(chase_camera+0x1f0)=chase_actor;
  for(unsigned i=0;i<6;i++)for(unsigned j=0;j<4;j++)chase_filters[i][j]=0x3f000000+0x10000*i+0x100*j;
  if(args[13])for(unsigned i=0;i<6;i++)*(void**)(chase_camera+0x210+i*4)=chase_filters[i];
  if(!args[15]||args[15]>10000)fail("steps");
  for(uint32_t step=0;step<args[15];step++){
  memcpy(chase_frame+0x5c,args,12);memcpy(chase_frame+0x80,args+3,12);memcpy(chase_frame+0x8c,args+6,12);memcpy(chase_frame+0xb0,args+9,4);memcpy(chase_frame+0xc8,args+14,4);
  memcpy(chase_frame+0x68,args+16,12);memcpy(chase_frame+0x98,args+19,4);memcpy(chase_bike+0x4ec,args+20,4);memcpy(chase_bike+0x4dc,args+21,4);memcpy(chase_frame+0x40,args+22,4);memcpy(chase_frame+0x74,args+23,12);
  unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));chase_phase();
  uint32_t result[40];memcpy(result,chase_frame+0x74,12);memcpy(result+3,chase_frame+0x8c,12);
  for(unsigned i=0;i<6;i++)memcpy(result+6+i*4,*(void**)(chase_camera+0x210+i*4),16);
  memcpy(result+30,chase_camera+0x22c,12);memcpy(result+33,chase_frame+0x44,12);result[36]=allocations;memcpy(result+37,(void*)0x2011edb0,12);if(fwrite(result,sizeof result,1,out)!=1)fail("output");
  }
 }
 if(ferror(in)||fclose(out))fail("finish");
 return 0;
}
