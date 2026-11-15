// Execute intact state-upload selection/argument/command code. Resource creation,
// resource updating and command-stream allocation/submission are boundary stubs.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
static uint32_t input[9],output[26],device[0x1400/4],adapter[32],cs[2],vtable[2];
static void* allocate_command(void*stream,uint32_t size,uint32_t queue){(void)stream;(void)queue;if(size!=20)ExitProcess(10);return output+12;}
static void submit_command(void*stream,uint32_t queue){(void)stream;(void)queue;output[17]++;}
static void update_resource(void*stream,uint32_t resource,uint32_t subresource,uint32_t*box,uint32_t source,uint32_t row,uint32_t slice){(void)stream;output[0]++;output[1]=resource;output[2]=subresource;output[3]=source;output[4]=row;output[5]=slice;memcpy(output+6,box,24);}
static int32_t create_resource(void*dev,uint32_t*description,uint32_t a,uint32_t b,void*c,uint32_t*resource){(void)dev;(void)a;(void)b;(void)c;output[18]++;memcpy(output+19,description,24);if((int32_t)input[7]>=0)*resource=input[6];return(int32_t)input[7];}
static int redirect(uint8_t*at,const uint8_t*guard,size_t n,void*target){if(memcmp(at,guard,n))return 0;DWORD old;if(!VirtualProtect(at,5,PAGE_EXECUTE_READWRITE,&old))return 0;at[0]=0xe9;*(uint32_t*)(at+1)=(uintptr_t)target-(uintptr_t)(at+5);return FlushInstructionCache(GetCurrentProcess(),at,5);}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 uint8_t*base=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!base)return 3;
 const uint8_t entry[]={0x55,0x89,0xe5,0x57,0x56},update[]={0x8d,0x4c,0x24,0x04},create[]={0x55,0x89,0xe5,0x57,0x56};
 if(memcmp(base+0x1c6e00,entry,5)||!redirect(base+0x1c56c0,update,4,update_resource)||!redirect(base+0x199120,create,5,create_resource))return 4;
 *(uint32_t*)(base+0x216108)=0;
 vtable[0]=(uintptr_t)allocate_command;vtable[1]=(uintptr_t)submit_command;cs[0]=(uintptr_t)vtable;cs[1]=(uintptr_t)device;
 typedef void(*upload_fn)(void*,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t);upload_fn upload=(upload_fn)(base+0x1c6e00);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 5;size_t n;unsigned count=0;
 while((n=fread(input,1,sizeof input,in))==sizeof input){
  if(input[0]>=8)return 6;
  memset(device,0,sizeof device);memset(adapter,0,sizeof adapter);memset(output,0,sizeof output);
  device[3]=(uintptr_t)adapter;((uint8_t*)adapter)[0x5a]=(uint8_t)input[8];device[0x12d4/4+input[0]]=input[5];
  upload(cs,input[0],input[1],input[2],input[3],input[4]);output[25]=device[0x12d4/4+input[0]];
  if(fwrite(output,1,sizeof output,out)!=sizeof output)return 7;
  count++;
 }
 fprintf(stderr,"cases=%u\n",count);int bad=n!=0||ferror(in);fclose(in);return fclose(out)||bad?8:0;
}
