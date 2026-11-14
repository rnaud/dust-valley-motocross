#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char hud_owner[0x104],hud_world[0x6f8];
uint32_t hud_delta,refresh_calls;
void hud_phase(void);void hud_exit(void);void hud_refresh(void);
__asm__(".text\n_hud_phase:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0x28,%esp\n mov _hud_delta,%eax\n mov %eax,0x24(%esp)\n mov $_hud_owner,%esi\n push $0x20023b63\n ret\n_hud_exit:\n add $0x28,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n_hud_refresh:\n incl _refresh_calls\n ret\n");
static void redirect(uint32_t a,void*target){unsigned char*p=(void*)(uintptr_t)a;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)target-a-5;FlushInstructionCache(GetCurrentProcess(),p,5);}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);redirect(0x20023bc9,hud_exit);redirect(0x20023a10,hud_refresh);
 *(void**)0x200e4fb4=hud_world;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t args[6];
 while(fread(args,sizeof args,1,in)==1){
  if(!args[5]||args[5]>10000)fail("steps");
  memcpy(hud_owner+0x100,args,4);*(uint32_t*)0x200e2ef4=args[1];*(uint32_t*)0x200e2ef8=args[2];hud_delta=args[3];memcpy(hud_world+0x6f4,args+4,4);
  for(uint32_t step=0;step<args[5];step++){
   unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));refresh_calls=0;hud_phase();
   uint32_t result[4];memcpy(result,hud_owner+0x100,4);result[1]=*(uint32_t*)0x200e2ef4;result[2]=*(uint32_t*)0x200e2ef8;result[3]=refresh_calls;
   if(fwrite(result,sizeof result,1,out)!=1)fail("output");
  }
 }
 if(ferror(in)||fclose(out))fail("finish");
 return 0;
}
