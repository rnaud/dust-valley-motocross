// Execute the native measured-line decision and stores. Exit before each
// subsequent layout branch; no font APIs or observed scratch outputs supplied.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
uint32_t hud_saved_esp,hud_entry,hud_frame,hud_count,hud_branch;
unsigned char hud_storage[0x1000];
void hud_run(void);void hud_draw(void);void hud_ellipsis(void);void hud_overflow(void);
__asm__(".text\n_hud_run:\n push %ebp\n push %ebx\n push %esi\n push %edi\n mov %esp,_hud_saved_esp\n mov _hud_frame,%ebp\n mov _hud_count,%ebx\n jmp *_hud_entry\n_hud_draw:\n movl $0,_hud_branch\n jmp hud_done\n_hud_ellipsis:\n movl $1,_hud_branch\n jmp hud_done\n_hud_overflow:\n movl $2,_hud_branch\nhud_done:\n mov _hud_saved_esp,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
static int redirect(uint8_t*p,const uint8_t*guard,size_t n,void*fn){
 if(memcmp(p,guard,n))return 0;
 DWORD old;if(!VirtualProtect(p,5,PAGE_EXECUTE_READWRITE,&old))return 0;
 p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)fn-(uintptr_t)(p+5);return FlushInstructionCache(GetCurrentProcess(),p,5);
}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 uint8_t*b=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!b)return 3;
 const uint8_t entry[]={0x8b,0xb5,0xa0,0xf7,0xff,0xff},draw[]={0xe9,0xcd,0xf6,0xff,0xff},ellipsis[]={0x8b,0x85,0x20,0xf7,0xff,0xff};
 // The overflow boundary is guarded separately against the pinned instruction.
 const uint8_t overflow[]={0xf6,0x85,0x5c,0xf7,0xff,0xff};
 if(memcmp(b+0x2240d,entry,6)||!redirect(b+0x22f8e,draw,5,hud_draw)||!redirect(b+0x22ac8,ellipsis,6,hud_ellipsis)||!redirect(b+0x22d70,overflow,6,hud_overflow))return 4;
 hud_entry=(uintptr_t)(b+0x2240d);hud_frame=(uintptr_t)(hud_storage+0x900);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 5;
 uint32_t a[7],result[5];unsigned offsets[]={0x8ac,0x89c,0x87c,0x8b8};size_t n;unsigned cases=0;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  *(uint32_t*)(hud_frame-0x860)=a[0];hud_count=a[1];*(uint32_t*)(hud_frame-0x8a4)=a[2];
  for(unsigned i=0;i<4;i++)*(uint32_t*)(hud_frame-offsets[i])=a[3+i];
  hud_run();result[0]=hud_branch;for(unsigned i=0;i<4;i++)result[i+1]=*(uint32_t*)(hud_frame-offsets[i]);
  if(fwrite(result,1,sizeof result,out)!=sizeof result)return 6;
  cases++;
 }
 fprintf(stderr,"cases=%u\n",cases);int bad=n!=0||ferror(in);fclose(in);return fclose(out)||bad?7:0;
}
