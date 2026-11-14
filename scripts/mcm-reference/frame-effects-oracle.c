// Original complete effects slice, with occlusion disabled in world settings.
// No effect helpers are substituted. Live captures separately cover real queries.
#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char effects_stack[0xc00];
static unsigned char engine[0x16c],body[0x114],owner[0x4c],world[0x71c],settings[0x24],event_state[0x1f8];
static unsigned char emitters[0x588],before[0xcc8];
void effects_slice(void);void effects_exit(void);
__asm__(".text\n_effects_slice:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov %esp,%edi\n mov $_effects_stack,%esi\n mov $0x300,%ecx\n rep movsl\n mov $_bike,%esi\n mov $0x200ac95a,%eax\n jmp *%eax\n_effects_exit:\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);
 unsigned char*exit=(void*)0x200acfd8;
 if(memcmp(exit,"\x8d\x86\x10\x05\x00\x00",6))fail("effects exit");
 exit[0]=0xe9;*(uint32_t*)(exit+1)=(uint32_t)(uintptr_t)effects_exit-(uint32_t)(uintptr_t)exit-5;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 unsigned short cw=0x027f;uint32_t flags[3];
 while(fread(bike,sizeof bike,1,in)==1){
  if(fread(engine,sizeof engine,1,in)!=1||fread(body+0x84,64,1,in)!=1||fread(emitters,sizeof emitters,1,in)!=1||fread(effects_stack,sizeof effects_stack,1,in)!=1||fread(flags,sizeof flags,1,in)!=1)fail("case");
  memcpy(body+0xc4,body+0x84,64);*(uint32_t*)(body+0x104)=1;
  *(void**)(world+0x718)=(void*)(uintptr_t)flags[0];*(uint32_t*)(settings+0x20)=flags[1];*(uint32_t*)(event_state+0x1f4)=flags[2];
  *(void**)(owner+0x44)=event_state;*(void**)(owner+0x48)=settings;*(void**)0x200e4fb4=world;
  put32(0x434,(uint32_t)(uintptr_t)body);put32(0x8f0,(uint32_t)(uintptr_t)engine);put32(0xc84,(uint32_t)(uintptr_t)owner);put32(0xca8,1);
  put32(0xc94,(uint32_t)(uintptr_t)emitters);put32(0xc98,(uint32_t)(uintptr_t)(emitters+0x84));put32(0xca0,(uint32_t)(uintptr_t)(emitters+0x108));
  memcpy(before,bike,sizeof bike);__asm__ volatile("fninit; fldcw %0"::"m"(cw));effects_slice();
  if(fwrite(before,sizeof before,1,out)!=1||fwrite(bike,sizeof bike,1,out)!=1||fwrite(emitters,sizeof emitters,1,out)!=1||fwrite(body+0x84,64,1,out)!=1)fail("output");
 }
 if(ferror(in)||fclose(out))fail("finish");
 return 0;
}
