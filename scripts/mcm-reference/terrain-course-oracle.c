// Original 0x48a2f0 parses and recursively follows on-disk tile offsets.
// Host stdio/allocation and child construction replace runtime services;
// renderer-only virtual initialization is omitted. Physics queries run intact.
#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char owner[0xa08];
static void *vtable[7];
static unsigned char *nodes[20000];static uint32_t offsets[20000],node_count;
static void patch(uint32_t at,void*fn){unsigned char*p=(void*)(uintptr_t)at;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)fn-at-5;}
static void* __cdecl allocate(size_t n){void*p=calloc(1,n);if(!p)fail("allocate");return p;}
static void __attribute__((thiscall)) renderer(void*self,FILE*file){(void)self;(void)file;}
static void* construct(FILE*file,void*parent);
static void* __attribute__((thiscall)) child(void*self,FILE*file,void*unused,void*parent){(void)self;(void)unused;return construct(file,parent);}
static void* construct(FILE*file,void*parent){
 if(node_count>=20000)fail("node limit");
 unsigned char*n=allocate(0x210);uint32_t index=node_count;nodes[node_count]=n;offsets[node_count++]=(uint32_t)ftell(file);
 *(void**)n=vtable;*(void**)(n+0x58)=parent;*(void**)(n+0x5c)=owner;
 ((void* (__attribute__((thiscall)) *)(void*,FILE*,void*,void*))0x2008a2f0)(n,file,(void*)1,parent);
 *(uint32_t*)(n+0x1b8)=index;return n;
}

#ifndef MCM_COURSE_NO_MAIN
static uint32_t node_offset(void*p){if(!p)return 0;uint32_t i=*(uint32_t*)((unsigned char*)p+0x1b8);if(i<node_count&&nodes[i]==p)return offsets[i];fail("unknown child");return 0;}
int main(int argc,char**argv){
 if(argc!=5)return 2;
 map_image(argv[1]);
 patch(0x200be4e0,fread);patch(0x200be400,fseek);patch(0x200be910,allocate);
 vtable[4]=child;vtable[6]=renderer;
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 ((void (__cdecl *)(void))0x20001640)();((void (__cdecl *)(void))0x20001720)();((void (__cdecl *)(void))0x20012910)();
 FILE*trn=fopen(argv[2],"rb"),*in=fopen(argv[3],"rb"),*out=fopen(argv[4],"wb");if(!trn||!in||!out)fail("open");
 uint32_t h[4];if(fread(h,16,1,in)!=1||h[0]>100000)fail("header");
 void**banks=allocate(h[0]*4);for(uint32_t i=0;i<h[0];i++){banks[i]=allocate(4624);if(fread(banks[i],4624,1,in)!=1)fail("bank");}
 *(void**)(owner+0x9fc)=banks;memcpy(owner+0x40,h+1,4);memcpy(owner+0xa04,h+2,4);
 if(fseek(trn,h[3],SEEK_SET))fail("root seek");
 *(void**)(owner+0x44)=construct(trn,NULL);
 if(fwrite(&node_count,4,1,out)!=1)fail("count output");
 for(uint32_t i=0;i<node_count;i++){
  unsigned char*n=nodes[i];uint32_t record[262]={offsets[i]};
  memcpy(record+1,n+0xc,8);memcpy(record+3,n+0x20,8);memcpy(record+5,n+0x3c,4);
  void**children=*(void***)(n+0x54);if(children)for(int j=0;j<256;j++)record[6+j]=node_offset(children[j]);
  if(fwrite(record,sizeof record,1,out)!=1)fail("node output");
 }
 uint32_t count;if(fread(&count,4,1,in)!=1||count>100000)fail("query count");
 for(uint32_t i=0;i<count;i++){
  float point[3],normal[3]={1,2,3};uint32_t mode;
  if(fread(point,12,1,in)!=1||fread(&mode,4,1,in)!=1)fail("query");
  ((void (__attribute__((thiscall)) *)(void*,float*,float*,int))0x20011340)(owner,point,normal,mode);
  if(fwrite(point,12,1,out)!=1||fwrite(normal,12,1,out)!=1)fail("query output");
 }
 if(fclose(out))fail("close");
 return 0;
}

#endif
