#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char other[0xcc8],rider[0x3ac],object[0x110],other_object[0x110],game[0x800],tag[0x100],player[0x40],context[0x50],timer[0x100];
uint32_t calls[16],used;
uint32_t id(void*p){return p==bike?1:p==other?2:0;}
void __attribute__((thiscall)) reset(void*self){calls[used++]=2;calls[used++]=self==timer;calls[used++]=id(*(void**)(tag+0x80));calls[used++]=0;}
void __attribute__((thiscall)) notify(void*self,void*target,int flag){calls[used++]=3;calls[used++]=id(self);calls[used++]=id(target);calls[used++]=flag;}
void patch(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)target-address-5;FlushInstructionCache(GetCurrentProcess(),p,5);}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);patch(0x20026b90,reset);patch(0x200b1d30,notify);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  uint32_t v[10],r[23]={0};if(fread(v,sizeof v,1,in)!=1)fail("input");
  memset(bike,0,sizeof bike);memset(other,0,sizeof other);memset(game,0,sizeof game);memset(tag,0,sizeof tag);memset(calls,0,sizeof calls);used=0;
  unsigned char*op=v[3]?bike:other;
  *(uint32_t*)(bike+0x8ac)=v[1];if(op!=bike)*(uint32_t*)(op+0x8ac)=v[2];
  *(float*)(bike+0x888)=1.25f;*(float*)(other+0x888)=2.5f;
  memcpy(bike+0x4fc,v+7,4);if(op!=bike)memcpy(other+0x4fc,v+8,4);
  *(void**)(bike+0x8b0)=v[9]?other:NULL;
  *(void**)(rider+0x34)=object;*(void**)(rider+0x15c)=bike;*(void**)(object+0x88)=other_object;*(uint32_t*)(other_object+0x104)=v[0];*(void**)(other_object+0x94)=op;
  *(void**)0x200e4fb4=game;*(void**)(game+0x608)=v[4]?tag:NULL;*(void**)(tag+0x3c)=player;*(void**)(player+0x30)=v[5]?bike:other;*(void**)(tag+0x80)=v[6]==1?bike:v[6]==2?other:NULL;
  *(void**)(bike+0xc84)=context;*(void**)(context+0x3c)=timer;
  ((void (__cdecl *)(void*))0x2000ba00)(rider);
  r[0]=*(uint32_t*)(bike+0x8ac);r[1]=id(*(void**)(bike+0x8b0));memcpy(r+2,bike+0x888,4);r[3]=*(uint32_t*)(other+0x8ac);memcpy(r+4,other+0x888,4);r[5]=id(*(void**)(tag+0x80));r[6]=used;memcpy(r+7,calls,sizeof calls);
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }if(fclose(out))fail("close");return 0;
}
