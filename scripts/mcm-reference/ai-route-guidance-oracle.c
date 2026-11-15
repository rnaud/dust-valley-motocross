// Original 0x46dac1..0x46dec6, mode 0 guidance. No live debugger.
#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char ai_bike[0xcc8],settings[0x1080];
uint32_t nodes[5][11],observed[6];
volatile uint32_t heading_bits,inverse_bits;
void nearest_start(void*);void nearest_end(void);
__asm__(".text\n_nearest_start:\n push %ebx\n push %esi\n push %edi\n push %ebp\n sub $0xa8,%esp\n mov 0xbc(%esp),%edi\n mov $_nodes,%ebx\n mov $_nodes+44,%ebp\n movl $_nodes+88,0x30(%esp)\n movl $_nodes+132,0x2c(%esp)\n movl $_nodes+176,0x5c(%esp)\n mov _heading_bits,%eax\n mov %eax,0x50(%esp)\n mov _inverse_bits,%eax\n mov %eax,0x98(%esp)\n push $0x2006dac1\n ret\n_nearest_end:\n mov 0x60(%esp),%eax\n mov %eax,_observed+0\n mov 0x14(%esp),%eax\n mov %eax,_observed+4\n mov 0x1c(%esp),%eax\n mov %eax,_observed+8\n mov 0x4c(%esp),%eax\n mov %eax,_observed+12\n mov 0x54(%esp),%eax\n mov %eax,_observed+16\n mov 0x88(%esp),%eax\n mov %eax,_observed+20\n add $0xa8,%esp\n pop %ebp\n pop %edi\n pop %esi\n pop %ebx\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);((void(*)(void))0x20001640)();((void(*)(void))0x20001720)();*(uint32_t*)0x200e4fb4=(uint32_t)(uintptr_t)settings;
 if(memcmp((void*)0x2006dac1,"\xd9\x43\x08",3)||memcmp((void*)0x2006dec6,"\x8b\x87\xfc\x0b\x00\x00",6))fail("AI guidance guards");
 unsigned char*p=(void*)0x2006dec6;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)nearest_end-(uint32_t)(uintptr_t)p-5;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 uint32_t input[60];size_t n;unsigned cases=0;unsigned short cw=0x027f;
 while((n=fread(input,1,sizeof input,in))==sizeof input){
  memset(ai_bike,0,sizeof ai_bike);memcpy(nodes,input+5,sizeof nodes);
  *(uint32_t*)(ai_bike+0x4f8)=input[0];*(uint32_t*)(ai_bike+0x500)=input[1];heading_bits=input[2];*(uint32_t*)0x200e7238=input[3];inverse_bits=input[4];
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));nearest_start(ai_bike);

  if(fwrite(observed,sizeof observed,1,out)!=1)fail("write");cases++;
 }
 if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",cases);return 0;
}
