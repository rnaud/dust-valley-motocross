#define MCM_COURSE_NO_MAIN
#include "terrain-course-oracle.c"
uint32_t landing_stack[42],landing_output[2];
void landing_start(void);void landing_end(void);
__asm__(".text\n_landing_start:\n push %ebx\n push %esi\n push %edi\n push %ebp\n sub $0xc0,%esp\n mov %esp,%edi\n mov $_landing_stack,%esi\n mov $42,%ecx\n cld\n rep movsl\n mov $_bike,%edi\n push $0x2006f824\n ret\n_landing_end:\n mov 0xb64(%edi),%eax\n mov %eax,_landing_output\n mov 0xb68(%edi),%eax\n mov %eax,_landing_output+4\n add $0xc0,%esp\n pop %ebp\n pop %edi\n pop %esi\n pop %ebx\n ret\n");
int main(int argc,char**argv){if(argc!=5)return 2;map_image(argv[1]);
 patch(0x200be4e0,fread);patch(0x200be400,fseek);patch(0x200be910,allocate);vtable[4]=child;vtable[6]=renderer;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));((void(*)(void))0x20001640)();((void(*)(void))0x20001720)();((void(*)(void))0x20012910)();
 if(memcmp((void*)0x2006f824,"\x8b\x87\xbc\x04\x00\x00",6)||memcmp((void*)0x2006f911,"\x8b\x87\x90\x05\x00\x00",6))fail("landing guards");patch(0x2006f911,landing_end);
 FILE*trn=fopen(argv[2],"rb"),*in=fopen(argv[3],"rb"),*out=fopen(argv[4],"wb");if(!trn||!in||!out)fail("open");uint32_t h[4];if(fread(h,16,1,in)!=1||h[0]>100000)fail("header");void**banks=allocate(h[0]*4);for(uint32_t i=0;i<h[0];i++){banks[i]=allocate(4624);if(fread(banks[i],4624,1,in)!=1)fail("banks");}*(void**)(owner+0x9fc)=banks;memcpy(owner+0x40,h+1,4);memcpy(owner+0xa04,h+2,4);if(fseek(trn,h[3],SEEK_SET))fail("seek");*(void**)(owner+0x44)=construct(trn,NULL);
 uint32_t w[11],offsets[]={0x4bc,0xb64,0xb68,0x6c8,0x514,0x510,0x518,0x4f8,0x500,0x4c0,0x4c8};size_t n;unsigned count=0;
 while((n=fread(w,1,sizeof w,in))==sizeof w){memset(bike,0,sizeof bike);memset(landing_stack,0,sizeof landing_stack);for(unsigned i=0;i<11;i++)put32(offsets[i],w[i]);put32(0x8f4,(uint32_t)(uintptr_t)owner);__asm__ volatile("fninit; fldcw %0"::"m"(cw));landing_start();if(fwrite(landing_output,sizeof landing_output,1,out)!=1)fail("write");count++;}
 if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",count);return 0;}
