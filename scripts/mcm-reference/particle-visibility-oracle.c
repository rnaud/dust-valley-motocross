// Execute original culling region 43b4b5..43b582 with explicit projected inputs.
// The sole code patch returns at the stage boundary, before sorting/drawing.
#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char pool[0x2004],scene[0x30],camera[0x1bc],particle[0x48],projected[0x20];
__attribute__((naked)) static void run_stage(void* p){
 __asm__ volatile("push %ebp; push %ebx; push %esi; push %edi; sub $0x80,%esp; mov 0x94(%esp),%esi; xor %edi,%edi; mov $0x2003b4b5,%eax; call *%eax; add $0x80,%esp; pop %edi; pop %esi; pop %ebx; pop %ebp; ret");
}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);*(unsigned char*)0x2003b582=0xc3;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 unsigned char input[0x74];unsigned short cw=0x027f;
 while(fread(input,sizeof input,1,in)==1){
  memcpy(particle,input,0x48);memcpy(projected,input+0x48,0x20);
  memcpy(camera+0x16c,input+0x68,4);memcpy(camera+0x1b4,input+0x6c,8);
  *(void**)(scene+0x2c)=camera;*(void**)(pool+0x1c)=scene;*(unsigned*)(pool+0x30)=1;
  *(void**)(pool+0x44)=particle;*(void**)(particle+0x44)=projected;
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));run_stage(pool);
  if(*(unsigned*)(pool+0x34)&&*(void**)(pool+0xfe4)!=particle)fail("accepted identity");
  memcpy(particle+0x44,input+0x44,4);
  if(fwrite(particle,sizeof particle,1,out)!=1||fwrite(pool+0x34,4,1,out)!=1)fail("output");
 }
 if(ferror(in)||fclose(out))fail("finish");return 0;
}
