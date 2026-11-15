#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
uint8_t viewport_state[0xae00],viewport_cs[16],viewport_device[64];
uint32_t viewport_input[6],viewport_output[16];
void *viewport_target;
void viewport_run(void);void viewport_exit(void);
__asm__(".text\n_viewport_run:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0x120,%esp\n lea 0x100(%esp),%ebp\n movl $_viewport_state,0xc(%ebp)\n movl $_viewport_cs,0x48(%esp)\n jmp *_viewport_target\n_viewport_exit:\n lea 0xa0(%esp),%esi\n mov $_viewport_output,%edi\n mov $16,%ecx\n rep movsl\n add $0x120,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char **argv){
 if(argc!=4)return 2;
 HMODULE module=LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);
 if(!module){fprintf(stderr,"load %lu\n",GetLastError());return 3;}
 uint8_t *base=(void*)module,*stop=base+0x1bf964;
 const uint8_t start[]={0x8b,0x45,0x0c},end[]={0x89,0x44,0x24,0x14};
 if(memcmp(base+0x1bddc6,start,3)||memcmp(stop,end,4))return 4;
 DWORD old;if(!VirtualProtect(stop,5,PAGE_EXECUTE_READWRITE,&old))return 5;
 stop[0]=0xe9;*(uint32_t*)(stop+1)=(uintptr_t)viewport_exit-(uintptr_t)(stop+5);
 FlushInstructionCache(GetCurrentProcess(),stop,5);viewport_target=base+0x1bddc6;
 *(uintptr_t*)(viewport_cs+8)=(uintptr_t)viewport_device;
 FILE *in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 6;
 unsigned count=0;
 while(fread(viewport_input,sizeof viewport_input,1,in)==1){
  memcpy(viewport_state+0xade4,viewport_input,16);memcpy(viewport_state+0x2300,viewport_input+4,4);memcpy(viewport_device+0x28,viewport_input+5,4);
  uint32_t mxcsr=0x1f80;__asm__ volatile("ldmxcsr %0"::"m"(mxcsr));viewport_run();
  if(fwrite(viewport_output,sizeof viewport_output,1,out)!=1)return 7;
  count++;
 }
 fprintf(stderr,"cases=%u\n",count);return ferror(in)||fclose(out)?8:0;
}
