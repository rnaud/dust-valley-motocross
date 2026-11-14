// Original grid refresh on a captured shared graph in an isolated process.
#define main unused_helper_main
#include "oracle.c"
#undef main
#ifndef LIVE_COLLISION_SETUP
#define LIVE_COLLISION_SETUP() ((void)0)
#define LIVE_COLLISION_UPDATE(m,o) ((void (__attribute__((thiscall)) *)(void*))0x2002a550)(o)
#define LIVE_COLLISION_STOP() 0
#define LIVE_COLLISION_HEADER(out) ((void)0)
#endif
static uint32_t pages[10000],page_count;
static void reserve_page(uint32_t page){
 for(uint32_t i=0;i<page_count;i++)if(pages[i]==page)return;
 if(page_count==10000||VirtualAlloc((void*)(uintptr_t)page,0x10000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)(uintptr_t)page){fprintf(stderr,"captured page %08lx\n",(unsigned long)page);fail("reserve captured page");}
 pages[page_count++]=page;
}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);((void (__cdecl *)(void))0x20001720)();LIVE_COLLISION_SETUP();
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t manager,count;
 if(fread(&manager,4,1,in)!=1||fread(&count,4,1,in)!=1||!count||count>4096)fail("header");
 uint32_t*addresses=calloc(count,4),*sizes=calloc(count,4);if(!addresses||!sizes)fail("alloc");
 for(uint32_t i=0;i<count;i++){
  if(fread(addresses+i,4,1,in)!=1||fread(sizes+i,4,1,in)!=1||!sizes[i]||sizes[i]>1048576||addresses[i]<0x10000||addresses[i]+sizes[i]<addresses[i])fail("block");
  // The captured enable flag belongs to the relocated original image, not
  // the exact-address heap graph. Never reserve its old image page.
  if(addresses[i]==0x508270){if(sizes[i]!=4)fail("world tag gate size");addresses[i]+=0x1fc00000;}
  else if(addresses[i]==0x4e4fb4){if(sizes[i]!=4)fail("world pointer size");addresses[i]+=0x1fc00000;}
  else if(addresses[i]==0x4e21a4||addresses[i]==0x4ede98){if(sizes[i]!=(addresses[i]==0x4e21a4?24u:12u))fail("rider global size");addresses[i]+=0x1fc00000;}
  else if(addresses[i]==0x4e3754){if((sizes[i]!=4&&sizes[i]!=8))fail("enable flag size");addresses[i]=0x200e3754;}
  else for(uint32_t p=addresses[i]&0xffff0000;p<=((addresses[i]+sizes[i]-1)&0xffff0000);p+=0x10000)reserve_page(p);
  if(fread((void*)(uintptr_t)addresses[i],sizes[i],1,in)!=1)fail("bytes");
 }
 // The captured world singleton lives inside the original image. Its pointer
 // must follow that image in the oracle, then be normalized for raw comparison.
 if(*(uint32_t*)0x200e4fb4==0x507c68)*(uint32_t*)0x200e4fb4=0x20107c68;
 if(fgetc(in)!=EOF)fail("trailing input");
 unsigned char*m=(void*)(uintptr_t)manager;uint32_t objects=*(uint32_t*)(m+4);if(!objects||objects>60)fail("objects");
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 for(uint32_t i=0;i<objects;i++){
  unsigned char*object=*(void**)(m+8+i*4);if(*(uint32_t*)object!=i||*(uint32_t*)(object+0xf4)>1||*(uint32_t*)(object+0x90)!=4)fail("unsupported object");
  LIVE_COLLISION_UPDATE(m,object);
  if(LIVE_COLLISION_STOP())break;
 }
 if(*(uint32_t*)0x200e4fb4==0x20107c68)*(uint32_t*)0x200e4fb4=0x507c68;
 LIVE_COLLISION_HEADER(out);
 for(uint32_t i=0;i<count;i++)if(fwrite((void*)(uintptr_t)addresses[i],sizes[i],1,out)!=1)fail("output");
 if(fclose(out))fail("close");
 return 0;
}
