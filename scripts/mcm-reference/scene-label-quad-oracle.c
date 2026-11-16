#define main unused_helper_main
#include "oracle.c"
#undef main
#define BASE 0x21000000u
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);if(VirtualAlloc((void*)BASE,0x4000,MEM_RESERVE|MEM_COMMIT,PAGE_READWRITE)!=(void*)BASE)fail("arena");
 if(memcmp((void*)0x20029e70,"\x83\xec\x2c",3))fail("guard");
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");uint32_t a[77];size_t n;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  memset((void*)BASE,0,0x4000);memcpy((void*)BASE,a,0x11c);
  *(uint32_t*)(BASE+0x1c)=BASE+0x400;*(uint32_t*)(BASE+0x42c)=BASE+0x1000;*(uint32_t*)(BASE+0x30)=BASE+0x2000;
  memcpy((void*)(BASE+0x1178),a+71,16);memcpy((void*)(BASE+0x2038),a+75,8);
  ((void(__attribute__((thiscall))*)(void*,void*))0x20029e70)((void*)BASE,(void*)(BASE+0xc0));
  *(uint32_t*)(BASE+0x1c)=a[7];*(uint32_t*)(BASE+0x30)=a[12];
  if(fwrite((void*)BASE,0x11c,1,out)!=1)fail("write");
 }
 if(n||ferror(in)||fclose(out))fail("finish");return 0;
}
