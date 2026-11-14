#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char chase_camera[0x240],chase_frame[0xd0];uint32_t chase_filters[6][4];
void chase_phase(void);void chase_exit(void);
__asm__(".text\n_chase_phase:\n push %ebp\n push %ebx\n push %esi\n push %edi\n mov $_chase_camera,%esi\n mov $_chase_frame+0xc0,%ebp\n push $0x2007d477\n ret\n_chase_exit:\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);
 unsigned char*p=(void*)0x2007d606;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)chase_exit-(uint32_t)(uintptr_t)p-5;FlushInstructionCache(GetCurrentProcess(),p,5);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t args[32];
 const unsigned target_offsets[6]={0x74,0x78,0x7c,0x8c,0x90,0x94};
 while(fread(args,sizeof args,1,in)==1){
  if(!args[31]||args[31]>10000)fail("steps");
  memset(chase_camera,0,sizeof chase_camera);memset(chase_frame,0,sizeof chase_frame);memcpy(chase_filters,args,96);
  for(unsigned i=0;i<6;i++){*(void**)(chase_camera+0x210+4*i)=chase_filters[i];memcpy(chase_frame+target_offsets[i],args+24+i,4);}memcpy(chase_frame+0xc8,args+30,4);
  for(uint32_t step=0;step<args[31];step++){
   unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));chase_phase();
   uint32_t result[30];memcpy(result,chase_filters,96);memcpy(result+24,chase_camera+0x22c,12);memcpy(result+27,chase_frame+0x44,12);
   if(fwrite(result,sizeof result,1,out)!=1)fail("output");
  }
 }
 if(ferror(in)||fclose(out))fail("finish");
 return 0;
}
