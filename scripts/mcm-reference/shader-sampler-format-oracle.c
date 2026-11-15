// Execute intact pinned Wine shader formatter and actual UCRT; no live hooks.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
uint32_t format_entry, format_alignment, format_caller, format_seed;
uint32_t format_args[4], format_scratch[512];
static uint8_t text[4096];
static uint32_t buffer[5];
void format_run(void);
// Capture the untouched post-return stack before C code or another call can
// reuse it. Alignments vary independently of the compiler's caller alignment.
__asm__(".text\n_format_run:\n"
 " push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0x20,%esp\n"
 " mov %esp,%ebp\n and $-16,%esp\n sub $0x10,%esp\n add _format_alignment,%esp\n"
 " mov %esp,_format_caller\n mov %esp,%edi\n mov $512,%ecx\n mov _format_seed,%eax\n"
 "1:\n sub $4,%edi\n mov %eax,(%edi)\n loop 1b\n"
 " mov _format_args,%eax\n mov %eax,(%esp)\n"
 " mov _format_args+4,%eax\n mov %eax,4(%esp)\n"
 " mov _format_args+8,%eax\n mov %eax,8(%esp)\n"
 " mov _format_args+12,%eax\n mov %eax,12(%esp)\n"
 " call *_format_entry\n"
 " lea -0x800(%esp),%esi\n mov $_format_scratch,%edi\n mov $512,%ecx\n cld\n rep movsl\n"
 " mov %ebp,%esp\n add $0x20,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char **argv) {
 if(argc!=4)return 2;
 uint8_t *b=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);
 uint8_t *crt=(void*)LoadLibraryA("ucrtbase.dll");
 if(!b||!crt)return 3;
 void *format=GetProcAddress((HMODULE)crt,"__stdio_common_vsprintf");
 const uint8_t entry[]={0x55,0x89,0xe5,0x57,0x56,0x53,0x83,0xec,0x0c};
 const uint8_t callback[]={0x55,0x89,0xe5,0x56,0x53,0x83,0xec,0x0c};
 const uint8_t parser[]={0x8d,0x4c,0x24,0x04,0x83,0xe4,0xf0};
 DWORD old;
 if(format!=crt+0x1f920||memcmp(b+0x138260,entry,sizeof entry)
    ||memcmp(crt+0x733c0,callback,sizeof callback)
    ||memcmp(crt+0x697c0,parser,sizeof parser)
    ||!VirtualProtect(b+0x2e35d0,4,PAGE_READWRITE,&old))return 4;
 *(uintptr_t*)(b+0x2e35d0)=(uintptr_t)format;
 format_entry=(uintptr_t)(b+0x138260);
 buffer[2]=(uintptr_t)text;buffer[3]=sizeof text;
 format_args[0]=(uintptr_t)buffer;format_args[1]=(uintptr_t)"%s_sampler%u";
 const char *prefixes[]={"ps","vs","unknown"};
 FILE *in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 5;
 uint32_t a[4];size_t n;unsigned cases=0;
 while((n=fread(a,1,sizeof a,in))==sizeof a) {
  if(a[0]>12||(a[0]&3)||a[1]>2)return 6;
  format_alignment=a[0];format_args[2]=(uintptr_t)prefixes[a[1]];
  format_args[3]=a[2];format_seed=a[3];memset(text,0,sizeof text);
  format_run();
  if(fwrite(&format_caller,4,1,out)!=1||fwrite(buffer+4,4,1,out)!=1
     ||fwrite(text,1,64,out)!=64||fwrite(format_scratch,1,sizeof format_scratch,out)!=sizeof format_scratch)return 7;
  cases++;
 }
 fprintf(stderr,"cases=%u\n",cases);int bad=n||ferror(in);fclose(in);return fclose(out)||bad?8:0;
}
