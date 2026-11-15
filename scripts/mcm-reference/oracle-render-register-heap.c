// Intact command33 -> actual backend callbacks -> actual register heap helper.
// No code patches or callback stubs. All pointers refer to controlled storage.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
typedef struct {uint32_t nodes,present,positions,next;} Heap;
static uint32_t vn[514],vp[256],vi[256],pn[450],pp[224],pi[224];
static uint32_t device[0x1300/4],backend[20],vtable[7],cs[2],contexts[3][24],pointers[3];
static void reset(void){
 memset(vn,0,sizeof vn);memset(vp,0,sizeof vp);memset(vi,0,sizeof vi);
 memset(pn,0,sizeof pn);memset(pp,0,sizeof pp);memset(pi,0,sizeof pi);
 Heap v={(uintptr_t)vn,(uintptr_t)vp,(uintptr_t)vi,1},p={(uintptr_t)pn,(uintptr_t)pp,(uintptr_t)pi,1};
 memcpy(backend+10,&v,sizeof v);memcpy(backend+14,&p,sizeof p);
}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 uint8_t*base=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!base)return 3;
 const uint8_t guard[]={0x55,0x89,0xe5,0x57,0x56,0x53,0x83,0xec};
 const uint8_t leaf[]={0x55,0x66,0x0f,0x6e,0xc9,0x66,0x0f,0x6e,0xc2};
 if(memcmp(base+0x1b4d60,guard,sizeof guard)||memcmp(base+0xf2f20,guard,sizeof guard)||memcmp(base+0xf2f70,guard,sizeof guard)||memcmp(base+0x144e40,leaf,sizeof leaf))return 4;
 typedef void(*handler_fn)(void*,uint32_t*);handler_fn handler=(handler_fn)(base+0x1b4d60);
 vtable[5]=(uintptr_t)(base+0xf2f70);vtable[6]=(uintptr_t)(base+0xf2f20);
 device[4]=(uintptr_t)vtable;device[5]=(uintptr_t)backend;device[0x12f4/4]=(uintptr_t)pointers;cs[1]=(uintptr_t)device;
 for(unsigned i=0;i<3;i++)pointers[i]=(uintptr_t)contexts[i];
 reset();
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 5;
 uint32_t a[10],command[5],result[1929];size_t n;unsigned cases=0;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  if(a[1]>7||a[6]>3)return 6;
  uint32_t start=a[2],end=a[2]+a[3],capacity=a[1]==0||a[1]==6?256:224;
  if(a[1]>=6){start=a[2]>>4;end=(a[2]+a[3]+16)>>4;}
  if((a[1]<2||a[1]>=6)&&start<end&&end>capacity)return 7;
  if(a[0])reset();
  backend[19]=a[5];device[0x12f8/4]=a[6];
  for(unsigned i=0;i<3;i++)contexts[i][23]=a[7+i];
  command[0]=33;memcpy(command+1,a+1,16);handler(cs,command);
  uint32_t*cursor=result;*cursor++=backend[13];*cursor++=backend[17];
  #define COPY(x) memcpy(cursor,x,sizeof x);cursor+=sizeof x/4
  COPY(vn);COPY(vp);COPY(vi);COPY(pn);COPY(pp);COPY(pi);
  for(unsigned i=0;i<3;i++)*cursor++=contexts[i][23];
  if(cursor-result!=1929||fwrite(result,1,sizeof result,out)!=sizeof result)return 8;
  cases++;
 }
 fprintf(stderr,"cases=%u\n",cases);int bad=n!=0||ferror(in);fclose(in);return fclose(out)||bad?9:0;
}
