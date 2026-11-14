// Executes the complete original rider particle tick.
#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char emitter[0x618],world[0x1330],pool[0x2004],particles[1000][0x44];
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);
 ((void (*)(void))0x20001640)();
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 uint32_t args[3];unsigned short cw=0x027f;
 while(fread(emitter,sizeof emitter,1,in)==1){
  if(fread(args,sizeof args,1,in)!=1)fail("case");
  memset(particles,0xa5,sizeof particles);memset(pool,0,sizeof pool);
  for(unsigned i=0;i<1000;i++)*(void**)(pool+0x44+4*i)=particles[i];
  *(uint32_t*)(pool+0x30)=args[2];*(uint32_t*)(world+0x132c)=args[1];*(void**)0x200e4fb4=world;
  uint32_t originalPool;memcpy(&originalPool,emitter+0x34,4);
  if(originalPool)*(void**)(emitter+0x34)=pool;
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));
  ((int (__attribute__((thiscall)) *)(void*,float))0x2003a0c0)(emitter,value(args[0]));
  memcpy(emitter+0x34,&originalPool,4);
  if(fwrite(emitter,sizeof emitter,1,out)!=1||fwrite(pool+0x30,4,1,out)!=1||fwrite(particles,sizeof particles,1,out)!=1)fail("output");
 }
 if(ferror(in)||fclose(out))fail("finish");
 return 0;
}
