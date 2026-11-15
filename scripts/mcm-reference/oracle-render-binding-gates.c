// Execute original gate instructions; record producer calls and stop at the
// constant-buffer or generated-shader boundary. No live process is modified.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
uint32_t gate_saved,gate_entry,gate_base,gate_frame[4],gate_out[8];
uint8_t gate_state[0x1400],gate_device[16],gate_adapter[0x60],gate_decl[32];
void gate_run(void);void gate_done(void);void gate_pixel(void);void gate_vertex(void);
void gate_record(uint32_t cs,uint32_t slot,uint32_t value){
 if(cs!=0x12345678||gate_out[1]>=2)ExitProcess(10);
 uint32_t at=2+gate_out[1]++*3;
 gate_out[at]=slot;gate_out[at+1]=value;gate_out[at+2]=(uintptr_t)__builtin_return_address(0)-gate_base;
}
__asm__(".text\n_gate_run:\n push %ebp\n push %ebx\n push %esi\n push %edi\n mov %esp,_gate_saved\n sub $0x100,%esp\n movl $0x12345678,0x48(%esp)\n mov $_gate_frame,%ebp\n mov $_gate_adapter,%edx\n movzbl 0x5a(%edx),%eax\n jmp *_gate_entry\n_gate_done:\n movl $0,_gate_out\n jmp gate_exit\n_gate_pixel:\n movl $1,_gate_out\n jmp gate_exit\n_gate_vertex:\n movl $2,_gate_out\ngate_exit:\n mov _gate_saved,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
static int redirect(uint8_t*p,const uint8_t*g,size_t n,void*f){
 DWORD old;if(memcmp(p,g,n)||!VirtualProtect(p,5,PAGE_EXECUTE_READWRITE,&old))return 0;
 p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)f-(uintptr_t)(p+5);return FlushInstructionCache(GetCurrentProcess(),p,5);
}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 uint8_t*b=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!b)return 3;
 const uint8_t entry[]={0x8b,0x7d,0x0c,0x0f,0xb6,0x8f,0x08,0x01,0x00,0x00};
 const uint8_t done[]={0x83,0xe0,0x20,0x84,0xc0},generated[]={0x8d,0xbc,0x24,0xa0,0x00,0x00,0x00},producer[]={0x55,0x89,0xe5,0x56,0x53};
 if(memcmp(b+0x1c0398,entry,sizeof entry)||!redirect(b+0x1c03e3,done,5,gate_done)||!redirect(b+0x1c0506,generated,7,gate_pixel)||!redirect(b+0x1c144b,generated,7,gate_vertex)||!redirect(b+0x1c5050,producer,5,gate_record))return 4;
 gate_base=(uintptr_t)b;gate_entry=(uintptr_t)(b+0x1c0398);gate_frame[2]=(uintptr_t)gate_device;gate_frame[3]=(uintptr_t)gate_state;*(uint32_t*)(gate_device+12)=(uintptr_t)gate_adapter;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 5;
 uint32_t a[6];size_t n;unsigned cases=0;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  gate_state[0x108]=a[0];gate_adapter[0x5a]=a[1];*(uint32_t*)(gate_state+0x25c)=a[2];*(uint32_t*)(gate_state+0x13a0)=a[3];*(uint32_t*)(gate_state+0x10c)=a[4]?(uintptr_t)gate_decl:0;gate_decl[0x18]=a[5];
  memset(gate_out,0,sizeof gate_out);gate_run();if(fwrite(gate_out,1,sizeof gate_out,out)!=sizeof gate_out)return 6;cases++;
 }
 fprintf(stderr,"cases=%u\n",cases);int bad=n!=0||ferror(in);fclose(in);return fclose(out)||bad?7:0;
}
