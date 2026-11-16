// Original 426be0 normal-riding policy, with explicit audio/input device boundaries.
// Commands and complete manager bytes are evidence; this is not audio playback.
#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char manager[0x128],engine[0x160],world[0x1330];
static uint32_t args[7],mask,cursors[6],count,commands[64][4];
static void logop(unsigned op,unsigned id,unsigned a,unsigned b){if(count==64)fail("commands");commands[count][0]=op;commands[count][1]=id;commands[count][2]=a;commands[count++][3]=b;}
static unsigned id(void*p){unsigned n=(unsigned)p;if(n<1||n>6)fail("sound identity");return n-1;}
static int __attribute__((thiscall)) stop(void*p,unsigned reset){unsigned n=id(p);logop(1,n,reset,0);mask&=~(1u<<n);if(reset)cursors[n]=0;return 1;}
static int __attribute__((thiscall)) playing(void*p){unsigned n=id(p),v=(mask>>n)&1;logop(5,n,v,0);return v;}
static int __attribute__((thiscall)) position(void*p,unsigned*a,unsigned*b){unsigned n=id(p);*a=cursors[n];*b=0;logop(4,n,*a,0);return 1;}
static int __attribute__((thiscall)) seek(void*p,unsigned value){unsigned n=id(p);logop(3,n,value,0);cursors[n]=value;return 1;}
static void __attribute__((stdcall)) play(void*p,unsigned menu,unsigned restart,unsigned loop){unsigned n=id(p);if(menu||restart)fail("unsupported play gate");logop(2,n,loop,0);mask|=1u<<n;}
static int __attribute__((thiscall)) throttle(void*p,unsigned action,unsigned option){(void)p;logop(7,action,option,args[1]);return args[1];}
static int __attribute__((thiscall)) skid(void*p,unsigned action,unsigned option){(void)p;logop(8,action,option,args[2]);return args[2];}
static int random_value(void){logop(6,0,args[3],0);return args[3];}
static void patch(unsigned address,void*target){unsigned char*p=(void*)address;p[0]=0xe9;*(uint32_t*)(p+1)=(unsigned)target-address-5;}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);
 patch(0x20002ad0,stop);patch(0x20002c20,playing);patch(0x20002f10,position);patch(0x20002f70,seek);patch(0x20026af0,play);patch(0x200a4ab0,throttle);patch(0x20054f70,skid);patch(0x200bf190,random_value);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");unsigned short cw=0x027f;
 while(fread(manager,sizeof manager,1,in)==1){
  if(fread(bike,sizeof bike,1,in)!=1||fread(engine,sizeof engine,1,in)!=1||fread(args,sizeof args,1,in)!=1)fail("case");
  if(*(unsigned*)(bike+0x844))fail("crash policy needs additional device boundaries");
  unsigned saved=*(unsigned*)(manager+0x30);*(void**)(manager+0x30)=bike;*(void**)(bike+0x8f0)=engine;*(void**)0x200e4fb4=world;*(unsigned*)0x200ee5f4=args[4];
  mask=args[5];for(int j=0;j<6;j++)cursors[j]=args[6];count=0;memset(commands,0,sizeof commands);
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));((int (__attribute__((thiscall)) *)(void*,float))0x20026be0)(manager,value(args[0]));*(unsigned*)(manager+0x30)=saved;
  if(fwrite(manager,sizeof manager,1,out)!=1||fwrite(&mask,4,1,out)!=1||fwrite(cursors,sizeof cursors,1,out)!=1||fwrite(&count,4,1,out)!=1||fwrite(commands,sizeof commands,1,out)!=1)fail("output");
 }
 if(ferror(in)||fclose(out))fail("finish");return 0;
}
