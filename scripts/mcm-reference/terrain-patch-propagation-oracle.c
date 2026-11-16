#define main unused_helper_main
#include "oracle.c"
#undef main
#define BASE 0x21000000u
static uint32_t trace[1024],used;
static uint32_t*w(uint32_t p){return(uint32_t*)p;}
static void logword(uint32_t v){if(used==1024)fail("trace overflow");trace[used++]=v;}
static void __attribute__((thiscall)) notify(void*self,uint32_t x,uint32_t y,uint32_t active,uint32_t mask,uint32_t source){logword((uint32_t)self);logword(x);logword(y);logword(active);logword(mask);logword(source);}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);if(VirtualAlloc((void*)BASE,0x400000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)BASE)fail("arena");BYTE*p=(void*)0x2008dc30;p[0]=0xe9;*(uint32_t*)(p+1)=(uint32_t)notify-0x2008dc35;FlushInstructionCache(GetCurrentProcess(),0,0);
 for(uint32_t i=0;i<17;i++){*w(0x200e8490+i*4)=i*16;*w(0x200e84d8+i*4)=i*17;}
 for(uint32_t id=0;id<1281;id++)*w(BASE+id*0x400+0x50)=BASE+0x800000+id*0x2000;
 *w(BASE+0x20)=2;*w(BASE+0x54)=BASE+0x200000;
 for(uint32_t i=0;i<256;i++){
  uint32_t address=BASE+(i+1)*0x400,table=BASE+0x200400+i*0x400;*w(BASE+0x200000+i*4)=address;*w(address+0x20)=1;*w(address+0x54)=table;*w(address+0x58)=BASE;*w(address+0x30)=i;*w(address+0x28)=(i&15)*16;*w(address+0x2c)=(i>>4)*16;
  for(uint32_t j=0;j<4;j++){uint32_t index=(j&1?15:0)+(j&2?240:0),child=BASE+(257+i*4+j)*0x400;*w(table+index*4)=child;*w(child+0x58)=address;*w(child+0x30)=index;}
 }
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[8];size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  used=0;uint32_t source=0;if(a[6])source=*w(BASE+0x50)+((a[3]>>8)*17+(a[2]>>8))*16;
  if(a[0]){uint32_t child=BASE+(1+(a[1]&255))*0x400;((void(__attribute__((thiscall))*)(void*,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t))0x2008e1c0)((void*)BASE,child,a[2],a[3],a[4],a[5],source);}
  else ((void(__attribute__((thiscall))*)(void*,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t))0x2008de10)((void*)BASE,a[2],a[3],a[4],a[5],source,a[7]);
  if(fwrite(&used,4,1,out)!=1||fwrite(trace,4,used,out)!=used)fail("write");
 }if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
