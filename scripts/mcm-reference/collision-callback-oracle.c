#define main unused_helper_main
#include "oracle.c"
#undef main
unsigned char other[0xcc8],object[0x110],other_object[0x110],rider_interface[0x160],game[0x800],tag[0x100],player[0x40],context[0x50],timer[0x100];
uint32_t calls[16],used;
uint32_t id(void*p){return p==bike?1:p==other?2:0;}
void __attribute__((thiscall)) response(void*self,int type,void*obj){calls[used++]=1;calls[used++]=id(self);calls[used++]=type;calls[used++]=obj==object;}
void __attribute__((thiscall)) reset(void*self){calls[used++]=2;calls[used++]=self==timer;calls[used++]=id(*(void**)(tag+0x80));calls[used++]=0;}
void __attribute__((thiscall)) notify(void*self,void*target,int flag){calls[used++]=3;calls[used++]=id(self);calls[used++]=id(target);calls[used++]=flag;}
void patch(uint32_t address,void*target){unsigned char*p=(void*)(uintptr_t)address;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)(uintptr_t)target-address-5;FlushInstructionCache(GetCurrentProcess(),p,5);}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 map_image(argv[1]);patch(0x2009d900,response);patch(0x20026b90,reset);patch(0x200b1d30,notify);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t count;if(fread(&count,4,1,in)!=1||count>1000000)fail("count");
 for(uint32_t i=0;i<count;i++){
  uint32_t v[11],r[23]={0};if(fread(v,sizeof v,1,in)!=1)fail("input");
  memset(bike,0,sizeof bike);memset(other,0,sizeof other);memset(game,0,sizeof game);memset(tag,0,sizeof tag);memset(calls,0,sizeof calls);used=0;
  unsigned char*op=v[10]?bike:other;
  *(int*)(bike+0x8ac)=v[2];*(int*)(bike+0x618)=v[3];*(int*)(bike+0x844)=v[4];*(int*)(bike+0x8a8)=v[5];*(float*)(bike+0x888)=1.25f;
  if(op!=bike)*(int*)(op+0x8ac)=v[6];
  *(float*)(other+0x888)=2.5f;
  *(void**)(bike+0xc88)=object;*(void**)(object+0x88)=other_object;*(int*)(other_object+0x104)=v[1];*(void**)(other_object+0x94)=v[1]==1?rider_interface:op;*(void**)(rider_interface+0x15c)=op;
  *(void**)0x200e4fb4=game;*(void**)(game+0x608)=v[7]?tag:NULL;*(void**)(tag+0x3c)=player;*(void**)(player+0x30)=v[8]?bike:other;*(void**)(tag+0x80)=v[9]==1?bike:v[9]==2?other:NULL;
  *(void**)(bike+0xc84)=context;*(void**)(context+0x3c)=timer;
  typedef void (__cdecl *Callback)(void*);((Callback)(v[0]?0x2009e610:0x2009e490))(bike);
  r[0]=*(int*)(bike+0x8ac);r[1]=*(int*)(bike+0x8a8);memcpy(r+2,bike+0x888,4);r[3]=*(int*)(other+0x8ac);memcpy(r+4,other+0x888,4);r[5]=id(*(void**)(tag+0x80));r[6]=used;memcpy(r+7,calls,sizeof calls);
  if(fwrite(r,sizeof r,1,out)!=1)fail("output");
 }
 if(fclose(out))fail("close");
 return 0;
}
