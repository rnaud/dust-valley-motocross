// Original 426be0 complete crash branch, with explicit audio/input device boundaries.
// Commands and complete manager bytes are evidence; this is not audio playback.
#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char manager[0x128],engine[0x160],world[0x1330];
static uint32_t args[7],extra[13],mask,cursors[19],count,commands[64][4];
static unsigned char sounds[19][0x180],rider[0x150],scene[0x30],listener[0x150];
static unsigned char group[0x1c];
static uint32_t buffers[5][2],vtable[10];
static unsigned offsets[19]={0x68,0x6c,0x70,0x74,0x78,0x7c,0x80,0x84,0x88,0x8c,0x90,0x94,0x9c,0xa0,0xa4,0xa8,0xac,0xb0,0x60};
static void logop(unsigned op,unsigned id,unsigned a,unsigned b){if(count==64)fail("commands");commands[count][0]=op;commands[count][1]=id;commands[count][2]=a;commands[count++][3]=b;}
static unsigned id(void*p){for(unsigned i=0;i<19;i++)if(p==sounds[i])return i;fail("sound identity");return 0;}
static int __attribute__((stdcall)) groupstatus(uint32_t*p,unsigned*out){unsigned n=p[1];*out=(mask>>n)&1;logop(10,n,*out,0);return 0;}
static int __attribute__((thiscall)) volume(void*p,unsigned v){logop(9,id(p),v,0);return 1;}
static int __attribute__((thiscall)) stop(void*p,unsigned reset){unsigned n=id(p);logop(1,n,reset,0);mask&=~(1u<<n);if(reset)cursors[n]=0;return 1;}
static int __attribute__((thiscall)) playing(void*p){unsigned n=id(p),v=(mask>>n)&1;logop(5,n,v,0);return v;}
static int __attribute__((thiscall)) position(void*p,unsigned*a,unsigned*b){unsigned n=id(p);*a=cursors[n];*b=0;logop(4,n,*a,0);return 1;}
static int __attribute__((thiscall)) seek(void*p,unsigned value){unsigned n=id(p);logop(3,n,value,0);cursors[n]=value;return 1;}
static int __attribute__((thiscall)) play(void*p,unsigned reserved,unsigned loop){unsigned n=id(p);if(reserved)fail("reserved");logop(2,n,loop,0);mask|=1u<<n;return 1;}
static int __attribute__((thiscall)) throttle(void*p,unsigned action,unsigned option){(void)p;logop(7,action,option,args[1]);return args[1];}
static int __attribute__((thiscall)) skid(void*p,unsigned action,unsigned option){(void)p;logop(8,action,option,args[2]);return args[2];}
static int random_value(void){logop(6,0,args[3],0);return args[3];}
static void patch(unsigned address,void*target){unsigned char*p=(void*)address;p[0]=0xe9;*(uint32_t*)(p+1)=(unsigned)target-address-5;}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);
 patch(0x20002ad0,stop);patch(0x20002c20,playing);patch(0x20002f10,position);patch(0x20002f70,seek);patch(0x20002860,play);patch(0x200a4ab0,throttle);patch(0x20054f70,skid);patch(0x200bf190,random_value);
 patch(0x20002db0,volume);((void(*)(void))0x20001640)();
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");unsigned short cw=0x027f;
 while(fread(manager,sizeof manager,1,in)==1){
  if(fread(bike,sizeof bike,1,in)!=1||fread(engine,sizeof engine,1,in)!=1||fread(args,sizeof args,1,in)!=1)fail("case");
  if(fread(extra,sizeof extra,1,in)!=1)fail("extra");
  if(!*(unsigned*)(bike+0x844))fail("expected crash");
  unsigned handles[19];for(unsigned j=0;j<19;j++){handles[j]=*(unsigned*)(manager+offsets[j]);*(void**)(manager+offsets[j])=sounds[j];}
  for(unsigned j=0;j<6;j++)*(unsigned*)(sounds[6+j]+0x174)=extra[4+j];
  unsigned sceneToken=*(unsigned*)(manager+0x1c);*(void**)(manager+0x1c)=scene;*(void**)(scene+0x2c)=listener;memcpy(listener+0x144,extra+1,12);
  *(unsigned*)(rider+0x14c)=extra[0];*(void**)(bike+0x874)=rider;
  unsigned groupToken=*(unsigned*)(manager+0x44);*(void**)(manager+0x44)=group;memset(group,0,sizeof group);vtable[9]=(unsigned)groupstatus;
  for(unsigned j=0;j<5;j++){buffers[j][0]=(unsigned)vtable;buffers[j][1]=j;*(void**)(sounds[j]+0x40)=(extra[12]&(1u<<j))?buffers[j]:NULL;((void(__attribute__((thiscall))*)(void*,void*))0x20001c20)(group,sounds[j]);}
  *(unsigned*)(world+0x700)=extra[10];*(unsigned*)(world+0xe2c)=extra[11];
  unsigned saved=*(unsigned*)(manager+0x30);*(void**)(manager+0x30)=bike;*(void**)(bike+0x8f0)=engine;*(void**)0x200e4fb4=world;*(unsigned*)0x200ee5f4=args[4];
  mask=args[5];for(int j=0;j<19;j++)cursors[j]=args[6];count=0;memset(commands,0,sizeof commands);
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));((int (__attribute__((thiscall)) *)(void*,float))0x20026be0)(manager,value(args[0]));*(unsigned*)(manager+0x30)=saved;
  *(unsigned*)(manager+0x44)=groupToken;*(unsigned*)(manager+0x1c)=sceneToken;for(unsigned j=0;j<19;j++)*(unsigned*)(manager+offsets[j])=handles[j];
  if(fwrite(manager,sizeof manager,1,out)!=1||fwrite(&mask,4,1,out)!=1||fwrite(cursors,sizeof cursors,1,out)!=1||fwrite(&count,4,1,out)!=1||fwrite(commands,sizeof commands,1,out)!=1)fail("output");
 }
 if(ferror(in)||fclose(out))fail("finish");return 0;
}
