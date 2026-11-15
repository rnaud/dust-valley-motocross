#define main unused_helper_main
#include "oracle.c"
#undef main
uint32_t trick_thread[6],trick_calls;
void trick_random(void);
__asm__(".text\n_trick_random:\n incl _trick_calls\n mov $_trick_thread,%eax\n mov $0x200bf195,%edx\n jmp *%edx\n");
int main(int argc,char**argv){if(argc!=4)return 2;map_image(argv[1]);if(memcmp((void*)0x2009d6a0,"\x83\xec\x1c\x53\x56\x57",6)||memcmp((void*)0x200bf190,"\xe8\xcb\x33\x00\x00",5))fail("guards");unsigned char*p=(void*)0x200bf190;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)trick_random-0x200bf195;FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t w[6],o[5];unsigned count=0;size_t n;unsigned short cw=0x027f;typedef uint32_t(__attribute__((thiscall))*Fn)(void*,uint32_t*,float,uint32_t);
while((n=fread(w,1,sizeof w,in))==sizeof w){memset(bike,0,sizeof bike);trick_thread[5]=w[0];trick_calls=0;put32(0x614,w[3]);put32(0x81c,w[4]);o[1]=w[5];float t;memcpy(&t,w+1,4);__asm__ volatile("fninit; fldcw %0"::"m"(cw));o[0]=((Fn)0x2009d6a0)(bike,o+1,t,w[2]);o[2]=get32(0x81c);o[3]=trick_thread[5];o[4]=trick_calls;if(fwrite(o,sizeof o,1,out)!=1)fail("write");count++;}if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",count);return 0;}
