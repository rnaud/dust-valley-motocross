#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char chase_camera[0x254],chase_frame[0xd0],chase_bike[0x900],chase_rider[0x180];
void chase_phase(void);void chase_exit(void);
__asm__(".text\n_chase_phase:\n push %ebp\n push %ebx\n push %esi\n push %edi\n mov $_chase_camera,%esi\n mov $_chase_frame+0xc0,%ebp\n push $0x2007caf1\n ret\n_chase_exit:\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);
 HMODULE dll=LoadLibraryA("C:/windows/syswow64/d3drm.dll");if(!dll)fail("DLL");
 FARPROC rotate=GetProcAddress(dll,"D3DRMVectorRotate");if(!rotate)fail("export");*(FARPROC*)0x201278b8=rotate;
 unsigned char*p=(void*)0x2007d166;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)chase_exit-(uint32_t)(uintptr_t)p-5;FlushInstructionCache(GetCurrentProcess(),p,5);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t args[44],result[17];
 const unsigned offsets[5]={0x1d8,0x1cc,0x1e0,0x1e8,0x248};
 while(fread(args,sizeof args,1,in)==1){
  memset(chase_camera,0,sizeof chase_camera);memset(chase_frame,0,sizeof chase_frame);memset(chase_bike,0,sizeof chase_bike);memset(chase_rider,0,sizeof chase_rider);
  for(unsigned i=0;i<5;i++)memcpy(chase_camera+offsets[i],args+i,4);
  memcpy(chase_frame+0x5c,args+6,12);memcpy(chase_frame+0x1c,args+9,12);memcpy(chase_camera+0xb0,args+12,64);
  memcpy(chase_camera+0x180,args+28,8);memcpy(chase_camera+0x1b4,args+30,8);
  memcpy(chase_bike+0x890,args+32,4);memcpy(chase_bike+0x8a4,args+33,4);memcpy(chase_bike+0x8b4,args+34,4);
  memcpy(chase_rider+0x13c,args+35,8);*(void**)(chase_bike+0x874)=chase_rider;*(void**)(chase_camera+0x1ec)=chase_bike;
  memcpy((void*)0x2011ed80,args+37,12);memcpy((void*)0x2011edb0,args+40,12);memcpy(chase_frame+0xc8,args+43,4);
  unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));chase_phase();
  for(unsigned i=0;i<5;i++)memcpy(result+i,chase_camera+offsets[i],4);
  memcpy(result+5,chase_frame+0x74,12);memcpy(result+8,chase_frame+0x8c,12);memcpy(result+11,chase_frame+0x80,12);memcpy(result+14,(void*)0x2011edb0,12);
  if(fwrite(result,sizeof result,1,out)!=1)fail("output");
 }
 if(ferror(in)||fclose(out))fail("finish");return 0;
}
