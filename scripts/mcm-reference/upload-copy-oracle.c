// Execute intact Wine host-copy branch and actual CRT memcpy. No live hooks.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
uint32_t copy_entry,copy_args[6],copy_saved;
uint8_t resource[0x400],source[256],destination[256];
uint32_t src_desc[2],dst_desc[2],ranges[16];
void copy_run(void);
__asm__(".text\n_copy_run:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0x20,%esp\n mov _copy_args,%eax\n mov %eax,(%esp)\n mov _copy_args+4,%eax\n mov %eax,4(%esp)\n mov _copy_args+8,%eax\n mov %eax,8(%esp)\n mov _copy_args+12,%eax\n mov %eax,12(%esp)\n mov _copy_args+16,%eax\n mov %eax,16(%esp)\n mov _copy_args+20,%eax\n mov %eax,20(%esp)\n movl $0x12345678,-0x50(%esp)\n call *_copy_entry\n mov -0x50(%esp),%eax\n mov %eax,_copy_saved\n add $0x20,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char **argv){
 if(argc!=4)return 2;uint8_t*b=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!b)return 3;
 const uint8_t entry[]={0x55,0x89,0xe5,0x57,0x56,0x53,0x83,0xec,0x30};
 if(memcmp(b+0x1a2480,entry,sizeof entry))return 4;
 HMODULE crt=LoadLibraryA("ucrtbase.dll");void*copy=GetProcAddress(crt,"memcpy");DWORD old;
 if(!copy||!VirtualProtect(b+0x2e3694,4,PAGE_READWRITE,&old))return 5;
 *(uintptr_t*)(b+0x2e3694)=(uintptr_t)copy;copy_entry=(uintptr_t)(b+0x1a2480);
 src_desc[1]=(uintptr_t)source;dst_desc[1]=(uintptr_t)destination;
 copy_args[0]=(uintptr_t)resource;copy_args[1]=(uintptr_t)dst_desc;copy_args[2]=(uintptr_t)src_desc;copy_args[4]=(uintptr_t)ranges;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 6;
 uint32_t a[3];size_t n;unsigned cases=0;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  if(a[0]>8||a[1]>16)return 7;copy_args[3]=a[0];copy_args[5]=a[2];
  for(unsigned i=0;i<256;i++){source[i]=(uint8_t)(i*17+cases);destination[i]=0xcc;}
  for(unsigned i=0;i<8;i++){ranges[2*i]=i*24;ranges[2*i+1]=a[1];}
  copy_run();uint32_t saved=a[0]?copy_saved==(uintptr_t)dst_desc:copy_saved==0x12345678;
  if(fwrite(&saved,4,1,out)!=1||fwrite(destination,1,256,out)!=256)return 8;cases++;
 }
 fprintf(stderr,"cases=%u\n",cases);int bad=n||ferror(in);fclose(in);return fclose(out)||bad?9:0;
}
