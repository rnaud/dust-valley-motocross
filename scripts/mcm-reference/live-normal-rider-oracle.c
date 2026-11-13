// Execute the original normal frame-rider dispatch against captured memory.
// Exact-address pages exist only in this isolated oracle process.
#define main unused_helper_main
#include "oracle.c"
#undef main
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
  for(uint32_t p=addresses[i]&0xffff0000;p<=((addresses[i]+sizes[i]-1)&0xffff0000);p+=0x10000)reserve_page(p);
  if(fread((void*)(uintptr_t)addresses[i],sizes[i],1,in)!=1)fail("bytes");
 }
 unsigned char*b=(void*)(uintptr_t)owner;unsigned char*proxy=*(void**)(b+0xc8c);
 if(*(uint32_t*)b!=0x4d9a94||*(uint32_t*)proxy!=0x4d7b14||*(uint32_t*)(b+0x844)||*(uint32_t*)(b+0x710)||*(uint32_t*)(b+0xbfc)==2)fail("normal state");
 *(uint32_t*)b=0x200d9a94;*(uint32_t*)proxy=0x200d7b14;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 typedef void (__attribute__((thiscall)) *Update)(void*,float);((Update)0x200af710)(b,.02f);
 *(uint32_t*)b=0x4d9a94;*(uint32_t*)proxy=0x4d7b14;
 for(uint32_t i=0;i<count;i++)if(fwrite((void*)(uintptr_t)addresses[i],sizes[i],1,out)!=1)fail("output");
 if(fclose(out))fail("close");
 return 0;
}
