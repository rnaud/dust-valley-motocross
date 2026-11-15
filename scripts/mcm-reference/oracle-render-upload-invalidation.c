// Execute the intact pinned command-33 handler with recording backend callbacks.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
static uint32_t device[0x1300/4],cs[2],vtable[7],contexts[8][24],pointers[8],output[12];
static void record(void*dev,uint32_t start,uint32_t count,uint32_t slot){
 if(dev!=device)ExitProcess(10);
 output[0]++;output[1]=slot;output[2]=start;output[3]=count;
}
static void vertex(void*dev,uint32_t start,uint32_t count){record(dev,start,count,0x14);}
static void pixel(void*dev,uint32_t start,uint32_t count){record(dev,start,count,0x18);}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 uint8_t*base=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!base)return 3;
 const uint8_t guard[]={0x55,0x89,0xe5,0x57,0x56,0x53,0x83,0xec,0x0c};
 if(memcmp(base+0x1b4d60,guard,sizeof guard))return 4;
 typedef void(*handler_fn)(void*,uint32_t*);handler_fn handler=(handler_fn)(base+0x1b4d60);
 vtable[5]=(uintptr_t)vertex;vtable[6]=(uintptr_t)pixel;device[4]=(uintptr_t)vtable;
 device[0x12f4/4]=(uintptr_t)pointers;cs[1]=(uintptr_t)device;
 for(unsigned i=0;i<8;i++)pointers[i]=(uintptr_t)contexts[i];
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 5;
 uint32_t input[14];size_t n;unsigned cases=0;
 while((n=fread(input,1,sizeof input,in))==sizeof input){
  if(input[0]!=33||input[5]>8)return 6;
  memset(output,0,sizeof output);device[0x12f8/4]=input[5];
  for(unsigned i=0;i<8;i++)contexts[i][23]=input[6+i];
  handler(cs,input);
  for(unsigned i=0;i<8;i++)output[4+i]=contexts[i][23];
  if(fwrite(output,1,sizeof output,out)!=sizeof output)return 7;
  cases++;
 }
 fprintf(stderr,"cases=%u\n",cases);int bad=n!=0||ferror(in);fclose(in);return fclose(out)||bad?8:0;
}
