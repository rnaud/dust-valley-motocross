// Intact original 0x46d3c2..0x46d535; harness supplies its bike/route memory.
// Stop before race adjustments and subsequent controller work. No live debugger.
#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char ai_bike[0xcc8];
static uint32_t nodes[32][11],table[32],observed[8];
void nearest_start(void*);void nearest_end(void);
__asm__(".text\n_nearest_start:\n push %ebx\n push %esi\n push %edi\n push %ebp\n sub $0xa8,%esp\n mov 0xbc(%esp),%edi\n mov 0xb00(%edi),%ecx\n push $0x2006d3c2\n ret\n_nearest_end:\n mov 0x30(%esp),%eax\n mov %eax,_observed\n mov 0x90(%esp),%eax\n mov %eax,_observed+4\n mov 0x5c(%esp),%eax\n mov %eax,_observed+8\n mov 0x2c(%esp),%eax\n mov %eax,_observed+12\n mov 0x98(%esp),%eax\n mov %eax,_observed+16\n mov 0x8c(%esp),%eax\n mov %eax,_observed+20\n mov 0x10(%esp),%eax\n mov %eax,_observed+24\n mov 0x84(%esp),%eax\n mov %eax,_observed+28\n add $0xa8,%esp\n pop %ebp\n pop %edi\n pop %esi\n pop %ebx\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);((void(*)(void))0x20001720)();
 if(memcmp((void*)0x2006d3c2,"\x8b\x97\xf0\x0a\x00\x00",6)||memcmp((void*)0x2006d535,"\x8b\x84\x24\x80\x00\x00\x00",7))fail("AI route guards");
 unsigned char*p=(void*)0x2006d535;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)nearest_end-(uint32_t)(uintptr_t)p-5;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 uint32_t input[131];size_t n;unsigned cases=0;unsigned short cw=0x027f;
 while((n=fread(input,1,sizeof input,in))==sizeof input){
  if(!input[0]||input[0]>32)fail("route length");memset(ai_bike,0,sizeof ai_bike);memset(nodes,0,sizeof nodes);
  for(unsigned i=0;i<input[0];i++){nodes[i][0]=input[3+i*4];nodes[i][2]=input[4+i*4];nodes[i][3]=input[5+i*4];nodes[i][4]=input[6+i*4];table[i]=(uint32_t)(uintptr_t)nodes[i];nodes[i][10]=i+1<input[0]?(uint32_t)(uintptr_t)nodes[i+1]:0;}
  *(uint32_t*)(ai_bike+0xaf4)=(uint32_t)(uintptr_t)table;*(uint32_t*)(ai_bike+0xb00)=input[0];
  *(uint32_t*)(ai_bike+0xaf0)=input[0]?(uint32_t)(uintptr_t)nodes:0;memcpy(ai_bike+0x4f8,input+1,4);memcpy(ai_bike+0x500,input+2,4);
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));nearest_start(ai_bike);
  for(unsigned i=0;i<4;i++)if(i!=1&&observed[i])observed[i]=(observed[i]-(uint32_t)(uintptr_t)nodes)/sizeof nodes[0]+1;
  if(fwrite(observed,sizeof observed,1,out)!=1)fail("write");cases++;
 }
 if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",cases);return 0;
}
