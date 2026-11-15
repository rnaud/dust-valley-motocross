#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
uint32_t binding_cs[0x200/4],binding_command[3],binding_entry,binding_callback_esp,binding_fn,binding_base,binding_out[11];
void binding_call(void);void binding_callback(void);
void binding_record(uint32_t device,uint32_t state){
 if(device!=0x12345678||binding_out[0]>=3)ExitProcess(10);
 uint32_t at=2+binding_out[0]++*3,ret=(uintptr_t)__builtin_return_address(0);
 binding_out[at]=state;binding_out[at+1]=ret>=binding_base&&ret<binding_base+0x300000?ret-binding_base:0;
 binding_out[at+2]=binding_callback_esp-binding_entry;
}
__asm__(".text\n_binding_call:\n push %ebp\n push %ebx\n push %esi\n push %edi\n push $_binding_command\n push $_binding_cs\n lea -4(%esp),%eax\n mov %eax,_binding_entry\n call *_binding_fn\n add $8,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n_binding_callback:\n mov %esp,_binding_callback_esp\n jmp _binding_record\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;
 uint8_t*b=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!b)return 3;
 const uint8_t handler[]={0x55,0x89,0xe5,0x56,0x53},callback[]={0x55,0x89,0xe5,0x57,0x56};
 if(memcmp(b+0x1b5d50,handler,5)||memcmp(b+0x612e0,callback,5))return 4;
 DWORD old;if(!VirtualProtect(b+0x612e0,5,PAGE_EXECUTE_READWRITE,&old))return 5;
 b[0x612e0]=0xe9;*(uint32_t*)(b+0x612e1)=(uintptr_t)binding_callback-(uintptr_t)(b+0x612e5);
 FlushInstructionCache(GetCurrentProcess(),b+0x612e0,5);binding_base=(uintptr_t)b;binding_fn=(uintptr_t)(b+0x1b5d50);binding_cs[1]=0x12345678;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 6;
 uint32_t a[3];size_t n;unsigned cases=0;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  if(a[0]>5)return 7;
  binding_cs[0x1c0/4+a[0]]=a[1];binding_command[1]=a[0];binding_command[2]=a[2];memset(binding_out,0,sizeof binding_out);
  binding_call();binding_out[1]=binding_cs[0x1c0/4+a[0]];
  if(fwrite(binding_out,1,sizeof binding_out,out)!=sizeof binding_out)return 8;
  cases++;
 }
 fprintf(stderr,"cases=%u\n",cases);int bad=n!=0||ferror(in);fclose(in);return fclose(out)||bad?9:0;
}
