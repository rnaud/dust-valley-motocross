#define main unused_helper_main
#include "oracle.c"
#undef main
uint32_t scan_stack[42],scan_output[5],scan_world[16],scan_first[4][5],scan_second[4][5],scan_first_ptr[4],scan_second_ptr[4],scan_nodes[4][11];
uint8_t scan_settings[0x1080],scan_others[8][4];
void scan_start(void);void scan_end(void);
__asm__(".text\n_scan_start:\n push %ebx\n push %esi\n push %edi\n push %ebp\n sub $0xa8,%esp\n mov %esp,%edi\n mov $_scan_stack,%esi\n mov $42,%ecx\n cld\n rep movsl\n mov $_bike,%edi\n mov $_scan_second,%ebx\n push $0x2006e340\n ret\n_scan_end:\n mov 0x10(%esp),%eax\n mov %eax,_scan_output\n mov 0x2c(%esp),%eax\n mov %eax,_scan_output+4\n mov 0x54(%esp),%eax\n mov %eax,_scan_output+8\n mov 0x68(%esp),%eax\n mov %eax,_scan_output+12\n mov 0xb48(%edi),%eax\n mov %eax,_scan_output+16\n add $0xa8,%esp\n pop %ebp\n pop %edi\n pop %esi\n pop %ebx\n ret\n");
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);
 if(memcmp((void*)0x2006e340,"\xc7\x87\x48\x0b\x00\x00\x00\x00\x00\x00",10)||memcmp((void*)0x2006e9c7,"\x85\xc9\x74\x0c",4))fail("scan guards");
 unsigned char*p=(void*)0x2006e9c7;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)scan_end-(uint32_t)(uintptr_t)p-5;
 *(uint32_t*)0x200e4fb4=(uint32_t)(uintptr_t)scan_settings;
 scan_world[0x38/4]=(uint32_t)(uintptr_t)scan_first_ptr;scan_world[0x34/4]=(uint32_t)(uintptr_t)scan_second_ptr;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t w[107];size_t n;unsigned count=0;unsigned short cw=0x027f;
 while((n=fread(w,1,sizeof w,in))==sizeof w){
  if(w[13]>4||w[14]>4)fail("counts");memset(scan_stack,0,sizeof scan_stack);memset(bike,0,sizeof bike);
  scan_stack[0x50/4]=w[0];scan_stack[0x4c/4]=w[1];scan_stack[0x54/4]=w[2];scan_stack[0x88/4]=w[3];scan_stack[0x8c/4]=w[4];scan_stack[0x40/4]=w[5];put32(0x4f8,w[6]);put32(0x500,w[7]);memcpy(scan_stack+0x14/4,w+8,20);
  scan_stack[0x44/4]=(uint32_t)(uintptr_t)scan_first;scan_stack[0x7c/4]=(uint32_t)(uintptr_t)scan_world;
  *(uint16_t*)(scan_settings+0x107a)=w[13];scan_settings[0x107e]=w[14];
  for(unsigned i=0;i<4;i++){scan_first_ptr[i]=(uint32_t)(uintptr_t)(w[15+i*6]?bike:scan_others[i]);memcpy(scan_first[i],w+16+i*6,20);scan_second_ptr[i]=(uint32_t)(uintptr_t)(w[39+i*6]?bike:scan_others[i+4]);memcpy(scan_second[i],w+40+i*6,20);}
  memcpy(scan_nodes,w+63,sizeof scan_nodes);put32(0xaf0,(uint32_t)(uintptr_t)scan_nodes);
  for(unsigned i=0;i<4;i++){unsigned link=scan_nodes[i][10];if(link>4)fail("node link");scan_nodes[i][10]=link?(uint32_t)(uintptr_t)scan_nodes[link-1]:0;}
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));scan_start();if(fwrite(scan_output,sizeof scan_output,1,out)!=1)fail("write");count++;
 }
 if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",count);return 0;
}
