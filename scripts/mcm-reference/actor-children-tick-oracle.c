#define main unused_helper_main
#include "oracle.c"
#undef main
static uint32_t input[35],output[304],count,vt[12],displayvt[12];
static unsigned char parent[0x30],nodes[6][0x30],world[0xe00],owner[8],device[0x114];
static uint32_t display;
#define U(P,O) (*(uint32_t*)((P)+(O)))
static unsigned token(void*p){if(!p)return 0;if(p==parent)return 7;for(unsigned i=0;i<6;i++)if(p==nodes[i])return i+1;fail("identity");return 0;}
static void logop(unsigned op,unsigned a,unsigned b,unsigned c){if(count>=64)fail("log");uint32_t*p=output+48+count++*4;p[0]=op;p[1]=a;p[2]=b;p[3]=c;}
static int __attribute__((thiscall)) update(unsigned char*p,unsigned dt){unsigned id=token(p),behavior=input[11+(id-1)*4+3];logop(1,id,dt,behavior);unsigned char*next=(void*)U(p,0x10);if(behavior==1&&next)U(next,0x2c)=1;if(behavior==2&&next)U(next,0x20)=0;if(behavior==3)U(world,0x35c)=0;return 0;}
static void __attribute__((thiscall)) destroy(void*p){logop(2,token(p),token((void*)U(parent,0x14)),0);}
static unsigned __attribute__((stdcall)) poll(void*p,unsigned zero,unsigned flag){if(p!=&display)fail("display");logop(3,zero,flag,input[10]);return input[10];}
static unsigned __attribute__((stdcall)) clock_read(void){logop(4,input[9],0,0);return input[9];}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);vt[2]=(unsigned)destroy;vt[11]=(unsigned)update;displayvt[11]=(unsigned)poll;display=(unsigned)displayvt;*(void**)0x201278a8=clock_read;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 while(fread(input,sizeof input,1,in)==1){
  if(input[0]>6)fail("count");memset(output,0,sizeof output);memset(parent,0,sizeof parent);memset(nodes,0,sizeof nodes);memset(world,0,sizeof world);count=0;
  U(parent,0x14)=input[0]?(unsigned)nodes[0]:0;U(parent,0x1c)=input[2]?(unsigned)owner:0;U(owner,0)=(unsigned)world;U(owner,4)=input[4]?(unsigned)device:0;U(device,0x110)=input[5];
  U(world,0xc)=(unsigned)&display;U(world,0x35c)=input[3];U(world,0xdb8)=input[6];U(world,0xdbc)=input[7];U(world,0xdc4)=input[8];
  for(unsigned i=0;i<6;i++){U(nodes[i],0)=(unsigned)vt;U(nodes[i],0xc)=i&&i<input[0]?(unsigned)nodes[i-1]:0;U(nodes[i],0x10)=i+1<input[0]?(unsigned)nodes[i+1]:0;U(nodes[i],0x18)=(unsigned)parent;U(nodes[i],0x20)=input[11+i*4];U(nodes[i],0x28)=input[12+i*4];U(nodes[i],0x2c)=input[13+i*4];}
  output[0]=((int(__attribute__((thiscall))*)(void*,unsigned))0x20020760)(parent,input[1]);output[1]=token((void*)U(parent,0x14));output[2]=U(world,0x35c);output[3]=U(world,0xdbc);output[4]=U(world,0xdc0);output[5]=U(world,0xdc4);
  for(unsigned i=0;i<6;i++){unsigned*p=output+6+i*6;p[0]=token((void*)U(nodes[i],0xc));p[1]=token((void*)U(nodes[i],0x10));p[2]=token((void*)U(nodes[i],0x18));p[3]=U(nodes[i],0x20);p[4]=U(nodes[i],0x28);p[5]=U(nodes[i],0x2c);}
  output[47]=count;if(fwrite(output,sizeof output,1,out)!=1)fail("output");
 }if(ferror(in)||fclose(out))fail("finish");return 0;
}
