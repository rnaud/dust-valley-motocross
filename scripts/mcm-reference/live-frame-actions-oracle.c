// Execute original positive logical action queries with captured device mappings.
// Exact-address pages exist only in this isolated oracle process.
#define main unused_helper_main
#include "oracle.c"
#undef main
static uint32_t pages[10000],page_count;
static void reserve_page(uint32_t page){
 for(uint32_t i=0;i<page_count;i++)if(pages[i]==page)return;
 if(page_count==10000||VirtualAlloc((void*)(uintptr_t)page,0x10000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)(uintptr_t)page){fprintf(stderr,"captured page: %08lx\n",(unsigned long)page);fail("reserve captured page");}
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
 if(*(uint32_t*)b!=0x4d9a94)fail("bike type");
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 void*controller=*(void**)(b+0x6e4);
 for(unsigned action=4;action<=9;action++){
  uint32_t result=controller?((int (__attribute__((thiscall)) *)(void*,uint32_t,uint32_t))0x20054f70)(controller,action,0):0;
  if(fwrite(&result,4,1,out)!=1)fail("result");
 }
 for(uint32_t i=0;i<count;i++)if(fwrite((void*)(uintptr_t)addresses[i],sizes[i],1,out)!=1)fail("output");
 if(fclose(out))fail("close");
 return 0;
}
