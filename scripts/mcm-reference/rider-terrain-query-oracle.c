// Complete original rider terrain query, transforms and terrain sampling.
#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char rider[0x3ac],before[0x3ac],proxy[0x438],transforms[12][0x114],terrain[0xa08],leaf[0x58],samples[289][16];
static const unsigned offsets[]={0xfc,0x100,0x104,0x10c,0x110,0x118,0x11c,0x120,0x128,0x12c,0x134};
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);
 *(FARPROC*)0x201278a8=GetProcAddress(LoadLibraryA("winmm.dll"),"timeGetTime");
 if(!*(FARPROC*)0x201278a8)fail("timer import");
 ((void (*)(void))0x20001720)();
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 unsigned short cw=0x027f;float settings[4],outputs[9];
 while(fread(rider,sizeof rider,1,in)==1){
  if(fread(transforms,sizeof transforms,1,in)!=1||fread(settings,sizeof settings,1,in)!=1||fread(samples,sizeof samples,1,in)!=1||fread(outputs,sizeof outputs,1,in)!=1)fail("case");
  memset(terrain,0,sizeof terrain);memset(leaf,0,sizeof leaf);
  memcpy(terrain+0x40,settings,4);memcpy(terrain+0xa04,settings+1,4);memcpy(leaf+0xc,settings+2,8);
  *(void**)(leaf+0x50)=samples;*(void**)(terrain+0x44)=leaf;
  *(void**)(rider+0x38)=terrain;*(void**)(rider+0x158)=proxy;*(void**)(proxy+0x434)=transforms[11];
  for(unsigned i=0;i<11;i++)*(void**)(rider+offsets[i])=transforms[i];
  memcpy(before,rider,sizeof rider);__asm__ volatile("fninit; fldcw %0"::"m"(cw));
  uint32_t result=((int (__attribute__((thiscall)) *)(void*,float*,float*,float*))0x2000bb40)(rider,outputs,outputs+3,outputs+6);
  if(fwrite(before,sizeof before,1,out)!=1||fwrite(rider,sizeof rider,1,out)!=1||fwrite(transforms,sizeof transforms,1,out)!=1||fwrite(outputs,sizeof outputs,1,out)!=1||fwrite(&result,4,1,out)!=1)fail("output");
 }
 if(ferror(in)||fclose(out))fail("finish");return 0;
}
