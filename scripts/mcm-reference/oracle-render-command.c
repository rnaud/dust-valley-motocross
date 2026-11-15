// Execute pinned command construction and cleanup decision blocks in isolation.
// The DLL is mapped without imports. Exits are redirected before external calls.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
uint32_t command_input[13],command_output[16],command_bytes[14];
void *build_target,*cleanup_target;
void build_run(void);void build_exit(void);void cleanup_run(void);void skip_exit(void);void free_exit(void);
__asm__(".text\n_build_run:\n push %ebx\n push %esi\n push %edi\n sub $0x50,%esp\n mov _command_input,%eax\n mov %eax,0x4c(%esp)\n mov _command_input+4,%eax\n mov %eax,0x48(%esp)\n mov _command_input+44,%eax\n mov %eax,0x40(%esp)\n mov _command_input+48,%eax\n mov %eax,0x44(%esp)\n mov $_command_input+8,%esi\n mov $_command_input+32,%edi\n mov $_command_bytes,%eax\n jmp *_build_target\n_build_exit:\n add $0x50,%esp\n pop %edi\n pop %esi\n pop %ebx\n ret\n_cleanup_run:\n push %ebx\n mov $_command_bytes,%ebx\n jmp *_cleanup_target\n_skip_exit:\n movl $0,_command_output+56\n movl $0,_command_output+60\n pop %ebx\n ret\n_free_exit:\n movl $1,_command_output+56\n mov %eax,_command_output+60\n pop %ebx\n ret\n");
static int redirect(uint8_t*at,const uint8_t*guard,size_t size,void*target){
 if(memcmp(at,guard,size))return 0;
 DWORD old;if(!VirtualProtect(at,5,PAGE_EXECUTE_READWRITE,&old))return 0;
 at[0]=0xe9;*(uint32_t*)(at+1)=(uintptr_t)target-(uintptr_t)(at+5);
 return FlushInstructionCache(GetCurrentProcess(),at,5);
}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 uint8_t*base=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!base)return 3;
 const uint8_t build[]={0x8b,0x4c,0x24,0x4c},cleanup[]={0xf6,0x43,0x2c,0x04};
 if(memcmp(base+0x1ca1d8,build,4)||memcmp(base+0x1b63d9,cleanup,4))return 4;
 const uint8_t stop[]={0x8b,0x03},skip[]={0x83,0xc4,0x20},log[]={0xf6,0x05},freed[]={0x89,0x45,0x08};
 if(!redirect(base+0x1ca22b,stop,2,build_exit)||!redirect(base+0x1b63ef,skip,3,skip_exit)||!redirect(base+0x1b63e6,log,2,skip_exit)||!redirect(base+0x1b6463,freed,3,free_exit))return 5;
 build_target=base+0x1ca1d8;cleanup_target=base+0x1b63d9;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 6;
 unsigned count=0;size_t n;
 while((n=fread(command_input,1,sizeof command_input,in))==sizeof command_input){
  memset(command_bytes,0xa5,sizeof command_bytes);build_run();memcpy(command_output,command_bytes,sizeof command_bytes);cleanup_run();
  if(fwrite(command_output,1,sizeof command_output,out)!=sizeof command_output)return 7;
  count++;
 }
 fprintf(stderr,"cases=%u\n",count);int bad=n!=0||ferror(in);fclose(in);return fclose(out)||bad?8:0;
}
