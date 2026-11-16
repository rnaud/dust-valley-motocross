// Original 427230 with scripted RNG and audio boundary callbacks.
#define main unused_helper_main
#include "oracle.c"
#undef main
static unsigned char manager[0x128],sounds[6][0x180];
static uint32_t input[17],output[265],count,draw;
static void logop(unsigned op,unsigned id,unsigned a,unsigned b){if(count==64)fail("commands");unsigned*p=output+9+count++*4;p[0]=op;p[1]=id;p[2]=a;p[3]=b;}
static unsigned id(void*p){for(unsigned i=0;i<6;i++)if(p==sounds[i])return i;fail("identity");return 0;}
static int __attribute__((thiscall)) stop(void*p,unsigned reset){unsigned n=id(p);logop(1,n,reset,0);output[1]&=~(1u<<n);if(reset)output[2+n]=0;return 1;}
static int __attribute__((thiscall)) playing(void*p){unsigned n=id(p),v=(output[1]>>n)&1;logop(5,n,v,0);return v;}
static int __attribute__((thiscall)) seek(void*p,unsigned v){unsigned n=id(p);output[2+n]=v;logop(3,n,v,0);return 1;}
static int __attribute__((thiscall)) volume(void*p,unsigned v){logop(9,id(p),v,0);return 1;}
static void __attribute__((stdcall)) play(void*p,unsigned menu,unsigned restart,unsigned loop){unsigned n=id(p);if(menu||restart)fail("play gate");output[1]|=1u<<n;logop(2,n,loop,0);}
static int random_value(void){if(draw==8)fail("draws");unsigned v=input[3+draw++];logop(6,0,v,0);return v;}
static void patch(unsigned address,void*target){unsigned char*p=(void*)address;p[0]=0xe9;*(uint32_t*)(p+1)=(unsigned)target-address-5;}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);
 patch(0x20002ad0,stop);patch(0x20002c20,playing);patch(0x20002f70,seek);patch(0x20002db0,volume);patch(0x20026af0,play);patch(0x200bf190,random_value);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");unsigned short cw=0x027f;
 while(fread(input,sizeof input,1,in)==1){
  memset(output,0,sizeof output);count=draw=0;output[1]=input[2];
  for(unsigned i=0;i<6;i++){*(void**)(manager+0x80+i*4)=sounds[i];*(unsigned*)(sounds[i]+0x174)=input[11+i];}
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));output[0]=((int (__attribute__((thiscall)) *)(void*,float,int))0x20027230)(manager,value(input[0]),input[1]);output[8]=count;
  if(fwrite(output,sizeof output,1,out)!=1)fail("write");
 }if(ferror(in)||fclose(out))fail("finish");return 0;
}
