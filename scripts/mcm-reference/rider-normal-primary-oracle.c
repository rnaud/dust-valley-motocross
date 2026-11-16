#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char rider[0x3ac],object[0x110],other_object[0x110],bike_object[0x110],other[0xcc8],proxy[0x438],node[0x114],manager[0x3988];
uint32_t grid_calls,static_calls;
static void __attribute__((thiscall)) grid(void*self){(void)self;grid_calls++;}
static void __attribute__((thiscall)) response(void*self,int type,void*o){if(self!=bike||type!=2||o!=object)fail("static args");static_calls++;}
static void patch(uint32_t a,void*t){unsigned char*p=(void*)(uintptr_t)a;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)t-a-5;FlushInstructionCache(GetCurrentProcess(),p,5);}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);((void (__cdecl *)(void))0x20001640)();((void (__cdecl *)(void))0x20001720)();
 HMODULE winmm=LoadLibraryA("winmm.dll");if(!winmm)fail("winmm");*(void**)0x201278a8=(void*)GetProcAddress(winmm,"timeGetTime");if(!*(void**)0x201278a8)fail("clock");
 patch(0x2002a550,grid);patch(0x2009d900,response);
 unsigned short cw=0x027f;__asm__ volatile("fninit; fldcw %0"::"m"(cw));
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;if(fread(&count,4,1,in)!=1)fail("count");
 if(fwrite((void*)0x200e21a4,24,1,out)!=1||fwrite((void*)0x200ede98,12,1,out)!=1)fail("constants");
 for(uint32_t k=0;k<count;k++){
  uint32_t v[61],r[86],n=0;if(fread(v,sizeof v,1,in)!=1)fail("input");
  memset(rider,0,sizeof rider);memset(object,0,sizeof object);memset(node,0,sizeof node);memset(manager,0,sizeof manager);memset(bike,0,sizeof bike);grid_calls=static_calls=0;
  *(void**)(rider+0x34)=object;*(void**)(rider+0x15c)=bike;*(void**)(rider+0x158)=proxy;*(void**)(proxy+0x434)=node;*(void**)(bike+0xc88)=bike_object;
  *(uint32_t*)object=1;*(uint32_t*)bike_object=0;*(void**)(object+0x98)=manager;*(void**)(object+0x88)=other_object;*(uint32_t*)(other_object+0x104)=v[0];*(void**)(other_object+0x94)=other;
  *(uint32_t*)(rider+0x140)=v[1];*(uint32_t*)(rider+0x154)=v[2];*(uint32_t*)(bike+0x844)=v[3];
  memcpy(node+0x84,v+4,64);memcpy(rider+0xb8,v+4,64);memcpy(object+0x1c,v+20,64);
  memcpy(rider+0xa0,v+36,12);memcpy(rider+0xac,v+39,12);memcpy(rider+0xf8,v+42,4);
  memcpy(rider+0x70,v+43,12);memcpy(rider+0x58,v+43,12);memcpy(rider+0x7c,v+46,12);memcpy(rider+0x64,v+46,12);
  memcpy(object+0xcc,v+49,12);memcpy(object+0xd8,v+52,12);memcpy(object+0xe4,v+55,12);memcpy(other+0x510,v+58,12);
  ((void (__cdecl *)(void*))0x2000b9e0)(rider);
  #define COPY(p,size) do{memcpy(r+n,p,size);n+=(size)/4;}while(0)
  COPY(rider+0x140,4);COPY(rider+0x138,4);COPY(rider+0x154,4);COPY(rider+0xb8,64);COPY(rider+0x58,12);COPY(rider+0x64,12);
  COPY(node+0x84,64);COPY(node+0xc4,64);COPY(node+0x104,4);COPY(object+0x64,12);COPY(object+0x70,12);COPY(object+0x5c,8);COPY(object+0x1c,64);
  COPY(manager+0xf8+4,4);COPY(manager+0xf8+240,4);r[n++]=grid_calls;r[n++]=static_calls;
  if(n!=86||fwrite(r,sizeof r,1,out)!=1)fail("output");
 }if(fclose(out))fail("close");return 0;
}
