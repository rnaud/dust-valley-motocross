#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);
 if(memcmp((void*)0x20094820,"\x8b\x41\x3c\x8b\x51\x38",6))fail("guard");
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 unsigned char owner[0x44];uint32_t input[3],result[4];size_t n;unsigned count=0;
 while((n=fread(input,1,sizeof input,in))==sizeof input){
  memset(owner,0,sizeof owner);memcpy(owner+0x38,input,sizeof input);
  result[3]=((uint32_t (__attribute__((thiscall)) *)(void*))0x20094820)(owner);memcpy(result,owner+0x38,12);
  if(fwrite(result,sizeof result,1,out)!=1)fail("write");count++;
 }
 if(n||ferror(in)||fclose(out))fail("finish");fprintf(stderr,"cases=%u\n",count);return 0;
}
