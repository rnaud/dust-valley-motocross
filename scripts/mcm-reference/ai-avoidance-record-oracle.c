// Executes all three intact pair-preparation regions; never attaches to the game.
#define main unused_helper_main
#include "oracle.c"
#undef main
uint8_t other_bike[0xcc8];
uint32_t other_pointer,observed[5],entry;
void pair_start(void);void pair_end(void);void player_end(void);
__asm__(".text\n_pair_start:\n push %ebx\n push %esi\n push %edi\n push %ebp\n sub $0xa8,%esp\n mov $_bike,%edi\n mov $_other_bike,%esi\n mov $_other_pointer,%ebp\n mov $_observed,%ebx\n mov _observed+8,%eax\n mov %eax,0x1c(%esp)\n mov _observed+16,%eax\n mov %eax,0x24(%esp)\n cmpl $0x2006e214,_entry\n jne 1f\n mov $_observed,%esi\n1: jmp *_entry\n_player_end:\n mov 0x14(%esp),%eax\n mov %eax,_observed\n mov 0x18(%esp),%eax\n mov %eax,_observed+4\n mov 0x1c(%esp),%eax\n mov %eax,_observed+8\n mov 0x20(%esp),%eax\n mov %eax,_observed+12\n mov 0x24(%esp),%eax\n mov %eax,_observed+16\n_pair_end:\n add $0xa8,%esp\n pop %ebp\n pop %edi\n pop %esi\n pop %ebx\n ret\n");
static void patch(uint32_t address,void*target,const char*guard){
 unsigned char*p=(void*)(uintptr_t)address;if(memcmp(p,guard,3))fail("avoidance guard");p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)target-address-5;
}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);((void(*)(void))0x20001640)();
 patch(0x2006e060,player_end,"\x6a\x14\xa1");patch(0x2006e1ac,pair_end,"\x83\xc3\x14");patch(0x2006e317,pair_end,"\x83\xc6\x14");
 if(memcmp((void*)0x2006df56,"\xd9\x86\xfc",3)||memcmp((void*)0x2006e0a9,"\x8b\x45\x00",3)||memcmp((void*)0x2006e214,"\x8b\x45\x00",3))fail("entry guards");
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 uint32_t input[16];size_t n;unsigned count=0;unsigned short cw=0x027f;
 other_pointer=(uint32_t)(uintptr_t)other_bike;
 while((n=fread(input,1,sizeof input,in))==sizeof input){
  if(input[0]>2)fail("kind");entry=input[0]==0?0x2006df56:input[0]==1?0x2006e0a9:0x2006e214;
  memcpy(bike+0x4f8,input+1,12);memcpy(bike+0x510,input+4,12);memcpy(other_bike+0x4f8,input+7,12);memcpy(other_bike+0x510,input+10,12);memcpy(bike+0xb54,input+13,4);
  observed[2]=input[14];observed[4]=input[15];__asm__ volatile("fninit; fldcw %0"::"m"(cw));pair_start();
  if(fwrite(observed,sizeof observed,1,out)!=1)fail("write");count++;
 }
 if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",count);return 0;
}
