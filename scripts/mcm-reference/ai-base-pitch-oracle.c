#define main unused_helper_main
#include "oracle.c"
#undef main
uint32_t pitch_stack[48],pitch_output;
void pitch_start(void);void pitch_end(void);
__asm__(".text\n_pitch_start:\n push %ebx\n push %esi\n push %edi\n push %ebp\n sub $0xc0,%esp\n mov %esp,%edi\n mov $_pitch_stack,%esi\n mov $48,%ecx\n cld\n rep movsl\n mov $_bike,%edi\n push $0x2006f69e\n ret\n_pitch_end:\n mov 0x6ec(%edi),%eax\n mov %eax,_pitch_output\n add $0xc0,%esp\n pop %ebp\n pop %edi\n pop %esi\n pop %ebx\n ret\n");
int main(int argc,char**argv){if(argc!=4)return 2;map_image(argv[1]);if(memcmp((void*)0x2006f69e,"\x8b\x87\xa4\x06\x00\x00",6)||memcmp((void*)0x2006f824,"\x8b\x87\xbc\x04\x00\x00",6))fail("guards");unsigned char*p=(void*)0x2006f824;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)pitch_end-0x2006f829;FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t w[3];unsigned count=0;size_t n;unsigned short cw=0x027f;while((n=fread(w,1,sizeof w,in))==sizeof w){memset(bike,0,sizeof bike);memset(pitch_stack,0,sizeof pitch_stack);put32(0x6a4,w[0]);put32(0x6ec,w[1]);pitch_stack[0xbc/4]=w[2];__asm__ volatile("fninit; fldcw %0"::"m"(cw));pitch_start();if(fwrite(&pitch_output,4,1,out)!=1)fail("write");count++;}if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",count);return 0;}
