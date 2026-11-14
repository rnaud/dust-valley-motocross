#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char world[0x1330],pool[0x2004],particles[1000][0x48];
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 uint32_t args[6],order[1000];unsigned short cw=0x027f;
 while(fread(args,sizeof args,1,in)==1){
  if(fread(order,sizeof order,1,in)!=1||fread(particles,sizeof particles,1,in)!=1)fail("case");
  memset(pool,0,sizeof pool);memset(world,0,sizeof world);
  for(unsigned i=0;i<1000;i++){if(order[i]>=1000)fail("index");*(void**)(pool+0x44+4*i)=particles[order[i]];}
  *(uint32_t*)(pool+0x30)=args[2];memcpy(pool+0x1ff8,args+3,12);
  *(uint32_t*)(world+0x132c)=args[1];*(void**)0x200e4fb4=world;
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));
  ((int (__attribute__((thiscall)) *)(void*,float))0x2003b200)(pool,value(args[0]));
  for(unsigned i=0;i<1000;i++)order[i]=((unsigned char*)*(void**)(pool+0x44+4*i)-(unsigned char*)particles)/0x48;
  if(fwrite(pool+0x30,4,1,out)!=1||fwrite(order,sizeof order,1,out)!=1||fwrite(particles,sizeof particles,1,out)!=1)fail("output");
 }
 if(ferror(in)||fclose(out))fail("finish");
 return 0;
}
