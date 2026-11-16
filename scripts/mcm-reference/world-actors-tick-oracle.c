#define main unused_helper_main
#include "oracle.c"
#undef main
static uint32_t input[29],output[261],count;
static volatile uint32_t scratch __attribute__((used));
static unsigned char actor[0x18cc],world[0x1330],view[0x1f0],bikes[8][0xc34],marker[0x24];
static void*ai[3],*remote[4];
#define U(P,O) (*(uint32_t*)((P)+(O)))
static unsigned id(void*p){for(unsigned i=0;i<8;i++)if(p==bikes[i])return i+1;fail("bike");return 0;}
static void logop(unsigned op,unsigned a,unsigned b,unsigned c){if(count>=64)fail("log");uint32_t*p=output+5+count++*4;p[0]=op;p[1]=a;p[2]=b;p[3]=c;}
static void __attribute__((thiscall)) select_target(void*p,unsigned v){if(p!=actor)fail("actor");logop(1,v,0,0);}
static void __attribute__((thiscall)) refresh(void*p){logop(2,id(p),0,0);}
static void __attribute__((thiscall)) physics(void*p,unsigned dt){logop(3,id(p),dt,0);if(input[28]&&p==bikes[0])U(actor,0x84)=1;}
static void __attribute__((thiscall)) presentation(void*p,unsigned dt){logop(4,id(p),dt,0);}
static unsigned __attribute__((thiscall)) identity(void*p){logop(5,(unsigned)p,input[11],0);return input[11];}
static void __attribute__((thiscall)) remote_tick(void*p,unsigned dt){logop(6,id(p),dt,0);}
static void __attribute__((thiscall)) race(void*p,unsigned dt){logop(7,id(p),dt,0);}
static void race_world(void*p){if(p!=actor)fail("race world");logop(8,0,0,0);}
static void __attribute__((thiscall)) mark(void*p,unsigned*v){if(p!=marker)fail("marker");logop(9,v[0],v[1],v[2]);}
static int __attribute__((thiscall)) children(void*p,unsigned dt){if(p!=actor)fail("children");logop(10,dt,0,0);return 0;}
static void patch(unsigned address,void*target){unsigned char*p=(void*)address;p[0]=0xe9;*(uint32_t*)(p+1)=(unsigned)target-address-5;}
static int __attribute__((naked,thiscall)) invoke(void*p,unsigned dt){__asm__("mov 4(%esp),%eax; mov _scratch,%edx; mov %edx,-24(%esp); push %eax; mov $0x200590b0,%edx; call *%edx; ret $4");}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);
 patch(0x200593d0,select_target);patch(0x200b6750,refresh);patch(0x200a52c0,physics);patch(0x200b2240,presentation);patch(0x200963d0,identity);patch(0x200b2e30,remote_tick);patch(0x2006c1f0,race);patch(0x2006c000,race_world);patch(0x20075390,mark);patch(0x20020760,children);*(void**)0x200e4fb4=world;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 while(fread(input,sizeof input,1,in)==1){
  if((int16_t)input[8]>3||(int)input[9]>4)fail("count");memset(output,0,sizeof output);memset(actor,0,sizeof actor);memset(world,0,sizeof world);count=0;scratch=input[19];
  U(world,0x614)=input[1];U(world,0x132c)=input[2];U(world,0x734)=input[4];*(uint16_t*)(world+0x107a)=input[8];U(world,0x314)=input[9];U(world,0x318)=input[10];*(uint16_t*)(world+0x1072)=input[12];
  U(actor,0x30)=(unsigned)bikes[0];U(actor,0x34)=(unsigned)remote;U(actor,0x38)=(unsigned)ai;U(actor,0x44)=(unsigned)view;U(view,0x1ec)=(unsigned)bikes[0];U(bikes[0],0xc30)=input[3];
  U(actor,0x80)=input[5];U(actor,0x7c)=input[6];U(actor,0x84)=input[7];U(actor,0x18c8)=input[13];U(actor,0x6c)=input[14]?(unsigned)marker:0;U(marker,0x20)=input[15];
  for(unsigned i=0;i<3;i++){ai[i]=bikes[1+i];U(bikes[0],0x504+i*4)=input[16+i];}
  for(unsigned i=0;i<4;i++){remote[i]=input[24+i]?bikes[4+i]:NULL;U(world,0xd00+i*40)=input[20+i];}
  output[0]=invoke(actor,input[0]);output[1]=U(actor,0x80);output[2]=U(actor,0x7c);output[3]=U(actor,0x84);output[4]=count;
  if(fwrite(output,sizeof output,1,out)!=1)fail("output");
 }if(ferror(in)||fclose(out))fail("finish");return 0;
}
