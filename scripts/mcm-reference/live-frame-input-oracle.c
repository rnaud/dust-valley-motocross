// Original normal player-input slice with captured world/device inputs.
// Exact-address pages exist only in this isolated oracle process.
#define main unused_helper_main
#include "oracle.c"
#undef main
static uint32_t input_owner,input_analog;
void input_run(void),input_exit(void);
__asm__(".text\n_input_run:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $0xc00,%esp\n mov _input_owner,%esi\n push $0x200a5672\n ret\n_input_exit:\n mov 0xc4(%esp),%eax\n mov %eax,_input_analog\n add $0xc00,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
static uint32_t pages[10000],page_count;
static void reserve_page(uint32_t page){
 for(uint32_t i=0;i<page_count;i++)if(pages[i]==page)return;
 if(page_count==10000||VirtualAlloc((void*)(uintptr_t)page,0x10000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)(uintptr_t)page)fail("reserve captured page");
 pages[page_count++]=page;
}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void (__cdecl *)(void))0x20001720)();
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 uint32_t owner,count;if(fread(&owner,4,1,in)!=1||fread(&count,4,1,in)!=1||!count||count>100000)fail("header");
 uint32_t*addresses=calloc(count,4),*sizes=calloc(count,4);if(!addresses||!sizes)fail("alloc");
 for(uint32_t i=0;i<count;i++){
  if(fread(addresses+i,4,1,in)!=1||fread(sizes+i,4,1,in)!=1||!sizes[i]||sizes[i]>0xcc8||addresses[i]<0x10000||addresses[i]+sizes[i]<addresses[i])fail("block");
  if(addresses[i]==0x4e4fb4||addresses[i]==0x508cd8||addresses[i]==0x508f3c||addresses[i]==0x508f4c||addresses[i]==0x508f50||addresses[i]==0x508f64){if(sizes[i]!=4)fail("environment global size");addresses[i]+=0x1fc00000;}
  else for(uint32_t p=addresses[i]&0xffff0000;p<=((addresses[i]+sizes[i]-1)&0xffff0000);p+=0x10000)reserve_page(p);
  if(fread((void*)(uintptr_t)addresses[i],sizes[i],1,in)!=1)fail("bytes");
 }
 unsigned char*b=(void*)(uintptr_t)owner;
 if(*(uint32_t*)b!=0x4d9a94||*(uint32_t*)(b+0x844)||*(uint32_t*)(b+0x614)||*(uint32_t*)(b+0xc68))fail("unsupported reset state");
 if(*(uint32_t*)0x200e4fb4!=0x507c68)fail("world singleton");
 *(uint32_t*)0x200e4fb4=0x20107c68;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 unsigned char*exit=(void*)0x200a57c0;exit[0]=0xe9;*(uint32_t*)(exit+1)=(uintptr_t)input_exit-0x200a57c0-5;
 input_owner=owner;input_run();
 uint32_t result=input_analog;
 *(uint32_t*)0x200e4fb4=0x507c68;
 if(fwrite(&result,4,1,out)!=1)fail("result");
 for(uint32_t i=0;i<count;i++)if(fwrite((void*)(uintptr_t)addresses[i],sizes[i],1,out)!=1)fail("output");
 if(fclose(out))fail("close");
 return 0;
}
