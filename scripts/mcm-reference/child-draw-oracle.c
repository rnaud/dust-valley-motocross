#define main unused_helper_main
#include "oracle.c"
#undef main
static uint8_t children[4][0x30];static uint32_t flags[4],output[18];
static unsigned index_of(void*p){unsigned i=((uint8_t*)p-&children[0][0])/0x30;if(i>=4)fail("callback node");return i;}
static void record(unsigned kind,unsigned i){unsigned n=output[1]++;if(n>=8)fail("callback overflow");output[2+n*2]=kind;output[3+n*2]=i;}
static int __thiscall unlink_child(void*p){record(1,index_of(p));return 0;}
static int __thiscall destroy_child(void*p){record(2,index_of(p));return 0;}
static int __thiscall draw_child(void*p){unsigned i=index_of(p);record(3,i);return !!(flags[i]&4);}
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);
 const uint8_t entry[]={0x56,0x57,0x8b,0x71,0x14},unlink[]={0x8b,0x41,0x0c,0x85,0xc0};
 if(memcmp((void*)0x200206c0,entry,5)||memcmp((void*)0x200205e0,unlink,5))return 3;
 uint8_t*p=(void*)0x200205e0;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)unlink_child-0x200205e5;
 FlushInstructionCache(GetCurrentProcess(),p,5);
 void*vtable[10]={0};vtable[2]=destroy_child;vtable[9]=draw_child;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 uint32_t a[5];size_t n;unsigned cases=0;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  if(a[0]>4)return 4;uint8_t parent[0x30]={0};memset(children,0,sizeof children);memset(output,0,sizeof output);
  *(void**)(parent+0x14)=a[0]?children[0]:NULL;
  for(unsigned i=0;i<a[0];i++){flags[i]=a[i+1];*(void**)children[i]=vtable;*(void**)(children[i]+0x10)=i+1<a[0]?children[i+1]:NULL;*(uint32_t*)(children[i]+0x20)=!!(flags[i]&2);*(uint32_t*)(children[i]+0x2c)=!!(flags[i]&1);}
  output[0]=((int(__thiscall*)(void*))0x200206c0)(parent);
  if(fwrite(output,1,sizeof output,out)!=sizeof output)fail("write");cases++;
 }
 fprintf(stderr,"cases=%u\n",cases);int bad=n!=0||ferror(in);fclose(in);return fclose(out)||bad?7:0;
}
