#define main unused_helper_main
#include "oracle.c"
#undef main
#define BASE 0x21000000u
static uint32_t trace[64],used,input[16];
static void logword(uint32_t x){if(used==64)fail("trace overflow");trace[used++]=x;}
static uint32_t*word(uint32_t a){return (uint32_t*)(uintptr_t)a;}
static int __attribute__((thiscall)) query(void*self,int key,int flag){logword(1);logword((uint32_t)self);logword(key);logword(flag);return input[2];}
static void __attribute__((thiscall)) disable(void*self){logword(2);logword((uint32_t)self);logword(0x10);}
static void __attribute__((thiscall)) enable(void*self){logword(2);logword((uint32_t)self);logword(0x14);}
static void __attribute__((thiscall)) select_camera(void*self,void*camera){logword(3);logword((uint32_t)self);logword((uint32_t)camera);*word((uint32_t)self+0x2c)=(uint32_t)camera;}
static void __attribute__((thiscall)) copy_camera(void*self,void*source){logword(4);logword((uint32_t)self);logword((uint32_t)source);}
static void __attribute__((thiscall)) position(void*self,float*p,int a,int b){logword(5);logword((uint32_t)self);for(int i=0;i<3;i++)logword(bits(p[i]));logword(a);logword(b);}
static int __attribute__((thiscall)) children(void*self,float dt){logword(6);logword((uint32_t)self);logword(bits(dt));*word(BASE+0x1614)=input[9];*word(BASE+0x9038)=input[10];return 7;}
static void patch(uint32_t a,void*t){unsigned char*p=(void*)a;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)t-a-5;FlushInstructionCache(GetCurrentProcess(),p,5);}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);
 if(VirtualAlloc((void*)BASE,0xa000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)BASE)fail("arena");
 patch(0x20054f70,query);patch(0x20094e20,select_camera);patch(0x2007a020,copy_camera);patch(0x200400c0,position);patch(0x20020760,children);
 if(*word(0x200d85f0)!=bits(60)||*word(0x200d85f4)!=bits(1))fail("timer constants");
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");size_t n;unsigned count=0;unsigned short cw=0x027f;
 while((n=fread(input,1,sizeof input,in))==sizeof input){
  memset((void*)BASE,0,0xa000);memset(trace,0,sizeof trace);used=0;
  *word(0x200e4fb4)=BASE+0x1000;*word(BASE+0x1010)=BASE+0x2000;*word(BASE+0x1614)=input[0];*word(BASE+0x1618)=BASE+0x9000;
  *word(BASE+0x1c)=BASE+0x3000;*word(BASE+0x302c)=BASE+(input[11]?0x4000:0x5000);
  *word(BASE+0x38)=input[5]?BASE+0x7000:0;*word(BASE+0x40)=BASE+0x4000;*word(BASE+0x44)=BASE+0x5000;*word(BASE+0x54)=input[1];*word(BASE+0x68)=input[6];*word(BASE+0x6c)=input[7];
  *word(BASE+0x4000)=BASE+0x2000;*word(BASE+0x2010)=(uint32_t)disable;*word(BASE+0x2014)=(uint32_t)enable;
  *word(BASE+0x41cc)=BASE+0x6000;*word(BASE+0x6618)=input[3];*word(BASE+0x64bc)=input[4];
  *word(BASE+0x706c)=BASE+0x8000;*word(BASE+0x801c)=input[14];
  *word(BASE+0x4144)=input[12];*word(BASE+0x414c)=input[13];*word(BASE+0x5144)=bits(-17.25f);*word(BASE+0x514c)=bits(91.5f);
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));
  uint32_t result=((int (__attribute__((thiscall))*)(void*,float))0x20081310)((void*)BASE,value(input[8]));
  uint32_t output[6]={result,*word(BASE+0x54),*word(BASE+0x68),*word(BASE+0x6c),*word(BASE+0x302c),used};
  if(fwrite(output,sizeof output,1,out)!=1||fwrite(trace,sizeof trace,1,out)!=1)fail("write");count++;
 }
 if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",count);return 0;
}
