#define MCM_COURSE_NO_MAIN
#include "terrain-course-oracle.c"
unsigned char probe_bike[0xcc8],component_node[0x114],bike_node[0x114];
void*component_pointer=component_node;
uint32_t probe_output[23],probe_selector;
void run_probes(void);void probe_exit(void);
void copy_probes(unsigned char*s){
 memcpy(probe_output,s+0x36c,12);memcpy(probe_output+3,s+0x2a0,12);memcpy(probe_output+6,s+0x4b0,12);memcpy(probe_output+9,s+0xbc,4);
 memcpy(probe_output+10,s+0x3e4,12);memcpy(probe_output+13,s+0x2c4,12);memcpy(probe_output+16,s+0x6d8,12);memcpy(probe_output+19,s+0x194,4);
 memcpy(probe_output+20,s+0x1c,4);memcpy(probe_output+21,s+0x30,4);memcpy(probe_output+22,s+0x2c,4);
}
__asm__(".text\n_run_probes:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov $_probe_bike,%esi\n mov _probe_selector,%eax\n mov %eax,0x1c(%esp)\n mov $0x200a6a25,%eax\n jmp *%eax\n_probe_exit:\n mov %esp,%eax\n push %eax\n call _copy_probes\n add $4,%esp\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
int main(int argc,char**argv){
 if(argc!=5)return 2;
 map_image(argv[1]);
 patch(0x200be4e0,fread);patch(0x200be400,fseek);patch(0x200be910,allocate);
 vtable[4]=child;vtable[6]=renderer;
 patch(0x200a6c01,probe_exit);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__cdecl *)(void))0x20001640)();((void (__cdecl *)(void))0x20001720)();((void (__cdecl *)(void))0x20012910)();
 FILE*trn=fopen(argv[2],"rb"),*in=fopen(argv[3],"rb"),*out=fopen(argv[4],"wb");if(!trn||!in||!out)fail("open");
 uint32_t h[4];if(fread(h,16,1,in)!=1||h[0]>100000)fail("header");
 void**banks=allocate(h[0]*4);for(uint32_t i=0;i<h[0];i++){banks[i]=allocate(4624);if(fread(banks[i],4624,1,in)!=1)fail("bank");}
 *(void**)(owner+0x9fc)=banks;memcpy(owner+0x40,h+1,4);memcpy(owner+0xa04,h+2,4);
 if(fseek(trn,h[3],SEEK_SET))fail("root seek");
 *(void**)(owner+0x44)=construct(trn,NULL);
 uint32_t count;if(fread(&count,4,1,in)!=1||count>100000)fail("query count");
 for(uint32_t i=0;i<count;i++){
  float values[41];uint32_t selector;
  if(fread(values,sizeof values,1,in)!=1||fread(&selector,4,1,in)!=1)fail("probe input");
  memset(probe_bike,0,sizeof probe_bike);memset(component_node,0,sizeof component_node);memset(bike_node,0,sizeof bike_node);
  memcpy(component_node+0x84,values,64);memcpy(bike_node+0x84,values+16,64);memcpy(probe_bike+0x630,values+32,36);
  *(void**)(probe_bike+0x8ec)=&component_pointer;*(void**)(probe_bike+0x434)=bike_node;*(void**)(probe_bike+0x8f4)=owner;
  probe_selector=selector;run_probes();
  if(fwrite(probe_output,sizeof probe_output,1,out)!=1)fail("probe output");
 }
 if(fclose(out))fail("close");
 return 0;
}
