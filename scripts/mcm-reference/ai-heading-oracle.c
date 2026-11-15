#define main unused_helper_main
#include "oracle.c"
#undef main
uint32_t heading_stack[42],heading_entry,heading_result;
void heading_start(void);void override_end(void);void airborne_end(void);
__asm__(".text\n_heading_start:\n push %ebx\n push %esi\n push %edi\n push %ebp\n sub $0xa8,%esp\n mov %esp,%edi\n mov $_heading_stack,%esi\n mov $42,%ecx\n cld\n rep movsl\n mov $_bike,%edi\n jmp *_heading_entry\n_override_end:\n mov 0x4c(%esp),%eax\n jmp 1f\n_airborne_end:\n mov 0x2c(%esp),%eax\n1: mov %eax,_heading_result\n add $0xa8,%esp\n pop %ebp\n pop %edi\n pop %esi\n pop %ebx\n ret\n");
static void patch(uint32_t addr,void*target,const char*guard){unsigned char*p=(void*)(uintptr_t)addr;if(memcmp(p,guard,2))fail("heading guard");p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)target-addr-5;}
int main(int argc,char**argv){if(argc!=4)return 2;map_image(argv[1]);patch(0x2006df48,override_end,"\x8b\x87");patch(0x2006eb14,airborne_end,"\x33\xf6");if(memcmp((void*)0x2006dec6,"\x8b\x87\xfc\x0b\x00\x00",6)||memcmp((void*)0x2006e9f0,"\x8b\x44\x24\x10",4))fail("entry guards");FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t w[13];size_t n;unsigned count=0;unsigned short cw=0x027f;
while((n=fread(w,1,sizeof w,in))==sizeof w){if(w[0]>1)fail("mode");heading_entry=w[0]?0x2006e9f0:0x2006dec6;memset(bike,0,sizeof bike);memset(heading_stack,0,sizeof heading_stack);put32(0xbfc,w[1]);heading_stack[0x10/4]=w[2];heading_stack[0x8c/4]=w[3];heading_stack[0x88/4]=w[4];heading_stack[0x28/4]=w[5];heading_stack[0x4c/4]=w[6];heading_stack[0x50/4]=w[7];heading_stack[0x34/4]=w[8];put32(0x510,w[9]);put32(0x518,w[10]);put32(0x4c0,w[11]);put32(0x4c8,w[12]);__asm__ volatile("fninit; fldcw %0"::"m"(cw));heading_start();if(fwrite(&heading_result,4,1,out)!=1)fail("write");count++;}
if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",count);return 0;}
