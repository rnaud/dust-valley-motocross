// Executes both complete original sound distance/attenuation functions.
#define main unused_helper_main
#include "oracle.c"
#undef main
int main(int argc,char**argv){
 if(argc!=4)return 2;map_image(argv[1]);((void (*)(void))0x20001640)();
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)fail("open");
 uint32_t input[8],output[3];unsigned short cw=0x027f;
 while(fread(input,sizeof input,1,in)==1){
  __asm__ volatile("fninit; fldcw %0"::"m"(cw));
  float d=((float (__attribute__((stdcall)) *)(void*,void*))0x200276f0)(input,input+3);output[0]=bits(d);output[1]=input[6];output[2]=input[7];
  ((void (__attribute__((stdcall)) *)(void*,void*,void*,void*))0x20027760)(input,input+3,output+1,output+2);
  if(fwrite(output,sizeof output,1,out)!=1)fail("output");
 }
 if(ferror(in)||fclose(out))fail("finish");return 0;
}
