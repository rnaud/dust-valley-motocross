#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char marker[0xa4],shape[0x400],owner[0x40],camera[0x200];
static uint32_t markerVtable[12],shapeVtable[12],calls[3];
static int __attribute__((thiscall)) draw(void*self){calls[0]++;return 0;}
static int __attribute__((thiscall)) load(void*self){calls[1]++;return 0;}
static int __attribute__((thiscall)) alternate(void*self){calls[2]++;return 0;}
static void patch(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)target-address-5;FlushInstructionCache(GetCurrentProcess(),p,5);}
static void put(unsigned char*p,unsigned o,uint32_t v){memcpy(p+o,&v,4);}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);
 if(memcmp((void*)0x20046220,"\x81\xec\x98\x00\x00\x00",6)||memcmp((void*)0x20075560,"\x8b\x41\x70",3))fail("guards");
 patch(0x20045870,draw);patch(0x20044ab0,load);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[53],r[9];size_t n;unsigned count=0;
 shapeVtable[1]=(uintptr_t)alternate;markerVtable[9]=0x20046220;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset(marker,0,sizeof marker);memset(shape,0,sizeof shape);memset(calls,0,sizeof calls);
  memcpy(shape+0x84,a,64);memcpy(camera+0xb0,a+16,64);memcpy(shape+0x134,a+32,24);memcpy(camera+0x178,a+38,16);
  put(marker,0x70,a[42]);put(marker,0x34,a[43]);put(marker,0x14,(uintptr_t)(shape+0x14c));
  put(shape,0,(uintptr_t)shapeVtable);put(shape,0x14c,(uintptr_t)markerVtable);put(shape,0x16c,a[44]);
  put(shape,0x12c,a[45]);put(shape,0x18c,a[46]);put(shape,0x190,a[47]);put(shape,0x180,a[48]);
  memcpy(shape+0x240,a+49,16);put(shape,0x130,1);put(shape,0x168,(uintptr_t)owner);put(owner,0x2c,(uintptr_t)camera);
  memset((void*)0x2011ede0,0,256);unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
  r[0]=((int (__attribute__((thiscall)) *)(void*))0x20075560)(marker);
  memcpy(r+1,shape+0x180,4);memcpy(r+2,shape+0x240,16);memcpy(r+6,calls,12);
  if(fwrite(r,sizeof r,1,out)!=1)fail("write");count++;
 }
 if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",count);return 0;
}
