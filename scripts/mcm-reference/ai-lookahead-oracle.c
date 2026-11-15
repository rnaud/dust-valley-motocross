#define MCM_COURSE_NO_MAIN
#include "terrain-course-oracle.c"
uint32_t look_stack[42],look_output[8],route_nodes[8][11],route_table[8];
unsigned char look_world[0x18c0];
void look_start(void);void look_end(void);
__asm__(".text\n_look_start:\n push %ebx\n push %esi\n push %edi\n push %ebp\n sub $0xa8,%esp\n mov %esp,%edi\n mov $_look_stack,%esi\n mov $42,%ecx\n cld\n rep movsl\n mov $_bike,%edi\n push $0x2006eb14\n ret\n_look_end:\n mov 0xb80(%edi),%eax\n mov %eax,_look_output\n mov 0xb84(%edi),%eax\n mov %eax,_look_output+4\n mov 0xb88(%edi),%eax\n mov %eax,_look_output+8\n mov 0x54(%esp),%eax\n mov %eax,_look_output+12\n mov 0x2c(%esp),%eax\n mov %eax,_look_output+16\n mov 0x4c(%esp),%eax\n mov %eax,_look_output+20\n mov 0x6c(%esp),%eax\n mov %eax,_look_output+24\n mov 0xb8c(%edi),%eax\n mov %eax,_look_output+28\n add $0xa8,%esp\n pop %ebp\n pop %edi\n pop %esi\n pop %ebx\n ret\n");
int main(int argc,char**argv){if(argc!=5)return 2;map_image(argv[1]);
 patch(0x200be4e0,fread);patch(0x200be400,fseek);patch(0x200be910,allocate);vtable[4]=child;vtable[6]=renderer;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));((void(*)(void))0x20001640)();((void(*)(void))0x20001720)();((void(*)(void))0x20012910)();
 if(memcmp((void*)0x2006eb14,"\x33\xf6",2)||memcmp((void*)0x2006f0a4,"\x8b\x87\xbc\x04\x00\x00",6))fail("lookahead guards");patch(0x2006f0a4,look_end);
 FILE*trn=fopen(argv[2],"rb"),*in=fopen(argv[3],"rb"),*out=fopen(argv[4],"wb");if(!trn||!in||!out)fail("open");uint32_t h[4];if(fread(h,16,1,in)!=1||h[0]>100000)fail("header");void**banks=allocate(h[0]*4);for(uint32_t i=0;i<h[0];i++){banks[i]=allocate(4624);if(fread(banks[i],4624,1,in)!=1)fail("banks");}*(void**)(owner+0x9fc)=banks;memcpy(owner+0x40,h+1,4);memcpy(owner+0xa04,h+2,4);if(fseek(trn,h[3],SEEK_SET))fail("seek");*(void**)(owner+0x44)=construct(trn,NULL);
 uint32_t w[112];size_t n;unsigned count=0;
 while((n=fread(w,1,sizeof w,in))==sizeof w){
  if(w[23]<5||w[23]>8||w[3]>=w[23]||w[4]>=w[23])fail("route count/index");memset(bike,0,sizeof bike);memset(look_stack,0,sizeof look_stack);memcpy(route_nodes,w+24,sizeof route_nodes);
  for(unsigned i=0;i<8;i++){route_table[i]=(uint32_t)(uintptr_t)route_nodes[i];unsigned link=route_nodes[i][10];if(link>w[23])fail("route link");route_nodes[i][10]=link?(uint32_t)(uintptr_t)route_nodes[link-1]:0;}
  put32(0xbb8,w[0]);put32(0x4bc,w[1]);put32(0xb48,w[2]);put32(0xafc,w[4]);put32(0xb00,w[23]);put32(0xaf0,route_table[0]);put32(0xaf4,(uint32_t)(uintptr_t)route_table);put32(0x8f4,(uint32_t)(uintptr_t)owner);
  look_stack[0x90/4]=w[3];look_stack[0x3c/4]=w[5];look_stack[0x40/4]=w[6];look_stack[0x94/4]=w[7];look_stack[0x74/4]=w[8];put32(0x4f8,w[9]);put32(0x500,w[10]);look_stack[0x50/4]=w[11];look_stack[0x4c/4]=w[12];look_stack[0x2c/4]=w[13];look_stack[0x54/4]=w[14];look_stack[0x6c/4]=w[15];put32(0xb8c,w[16]);memcpy(bike+0xb80,w+17,12);memcpy(look_world+0x18bc,w+20,4);look_stack[0x7c/4]=(uint32_t)(uintptr_t)look_world;*(uint32_t*)0x200e723c=w[21];*(uint32_t*)0x200e7238=w[22];
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));look_start();if(fwrite(look_output,sizeof look_output,1,out)!=1)fail("write");count++;
 }
 if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",count);return 0;
}
