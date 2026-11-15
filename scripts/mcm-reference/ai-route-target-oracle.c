// Intact original 0x46d707..0x46dac1, mode 0; harness supplies its bike/route memory.
// Start after race adjustments; stop before distance/lateral-error and steering work.
// No live debugger. Inputs: count, target/reference/nearest indices, XYZ, heading,
// BB8, C3C, then 32 XYZ nodes. Outputs: target/next node IDs, index, C3C, two headings, gap.
#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char ai_bike[0xcc8];
static uint32_t nodes[32][11],table[32],observed[7];
static unsigned char settings[0x1080];
volatile uint32_t target,nearest_node,nearest_index,heading_bits;
void nearest_start(void*);void nearest_end(void);
__asm__(".text\n_nearest_start:\n push %ebx\n push %esi\n push %edi\n push %ebp\n sub $0xa8,%esp\n mov 0xbc(%esp),%edi\n mov 0xb00(%edi),%ecx\n mov _target,%ebx\n mov _nearest_node,%eax\n mov %eax,0x30(%esp)\n mov _nearest_index,%eax\n mov %eax,0x90(%esp)\n mov _heading_bits,%eax\n mov %eax,0x50(%esp)\n push $0x2006d707\n ret\n_nearest_end:\n mov %ebx,_observed\n mov %ebp,_observed+4\n mov 0xafc(%edi),%eax\n mov %eax,_observed+8\n mov 0xc3c(%edi),%eax\n mov %eax,_observed+12\n mov 0x4c(%esp),%eax\n mov %eax,_observed+16\n mov 0x28(%esp),%eax\n mov %eax,_observed+20\n mov 0x3c(%esp),%eax\n mov %eax,_observed+24\n add $0xa8,%esp\n pop %ebp\n pop %edi\n pop %esi\n pop %ebx\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);*(uint32_t*)0x200e4fb4=(uint32_t)(uintptr_t)settings;
 if(memcmp((void*)0x2006d707,"\x8b\x84\x24\x90\x00\x00\x00",7)||memcmp((void*)0x2006dac1,"\xd9\x43\x08",3))fail("AI target guards");
 unsigned char*p=(void*)0x2006dac1;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)nearest_end-(uint32_t)(uintptr_t)p-5;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 uint32_t input[106];size_t n;unsigned cases=0;unsigned short cw=0x027f;
 while((n=fread(input,1,sizeof input,in))==sizeof input){
  if(!input[0]||input[0]>32)fail("route length");memset(ai_bike,0,sizeof ai_bike);memset(nodes,0,sizeof nodes);
  if(input[1]>=input[0]||input[3]>=input[0])fail("index");
  for(unsigned i=0;i<input[0];i++){memcpy(nodes[i],input+10+i*3,12);nodes[i][10]=i+1<input[0]?(uint32_t)(uintptr_t)nodes[i+1]:0;table[i]=(uint32_t)(uintptr_t)nodes[i];}
  *(uint32_t*)(ai_bike+0xaf0)=(uint32_t)(uintptr_t)nodes;*(uint32_t*)(ai_bike+0xaf4)=(uint32_t)(uintptr_t)table;*(uint32_t*)(ai_bike+0xb00)=input[0];
  *(uint32_t*)(ai_bike+0xafc)=input[1];*(uint32_t*)(ai_bike+0xc08)=input[2];memcpy(ai_bike+0x4f8,input+4,12);
  *(uint32_t*)(ai_bike+0xbb8)=input[8];*(uint32_t*)(ai_bike+0xc3c)=input[9];
  target=table[input[1]];nearest_node=table[input[3]];nearest_index=input[3];heading_bits=input[7];
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));nearest_start(ai_bike);
  for(unsigned i=0;i<2;i++)if(observed[i])observed[i]=(observed[i]-(uint32_t)(uintptr_t)nodes)/sizeof nodes[0]+1;
  if(fwrite(observed,sizeof observed,1,out)!=1)fail("write");cases++;
 }
 if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",cases);return 0;
}
