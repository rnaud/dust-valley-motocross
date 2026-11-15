// Intact temporary map/unmap routines with only malloc replaced by a controlled
// boundary result. Returned pointers are never dereferenced by these branches.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
static uint32_t allocation_pointer,allocation_size;
static void* allocation_stub(uint32_t size){allocation_size=size;return(void*)(uintptr_t)allocation_pointer;}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 uint8_t*base=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!base)return 3;
 const uint8_t map_guard[]={0x55,0x89,0xe5,0x57,0x56},unmap_guard[]={0x55,0x89,0xe5,0x56,0x53};
 if(memcmp(base+0x1b6840,map_guard,5)||memcmp(base+0x1b7ab0,unmap_guard,5))return 4;
 DWORD old;if(!VirtualProtect(base+0x2e3688,4,PAGE_READWRITE,&old))return 5;
 *(uintptr_t*)(base+0x2e3688)=(uintptr_t)allocation_stub;
 *(uint32_t*)(base+0x216360)=0;*(uint32_t*)(base+0x216108)=0;*(uint32_t*)(base+0x2160f8)=0;
 typedef uint32_t(*map_fn)(void*,void*,uint32_t,uint32_t*,uint32_t*,uint32_t);
 typedef uint32_t(*unmap_fn)(void*,void*,uint32_t,uint32_t*,uint32_t*);
 map_fn map=(map_fn)(base+0x1b6840);unmap_fn unmap=(unmap_fn)(base+0x1b7ab0);
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 6;
 uint32_t input[49],output[33],resource[40];size_t n;unsigned count=0;
 while((n=fread(input,1,sizeof input,in))==sizeof input){
  memset(resource,0,sizeof resource);resource[0x1c/4]=(uintptr_t)input;memcpy(resource+0x68/4,input+40,36);memset(output,0xa5,sizeof output);
  allocation_pointer=input[39];allocation_size=0;
  output[12]=map(NULL,resource,0,output,input+33,0x40000000);output[13]=allocation_size;memcpy(output+3,resource+0x68/4,36);
  output[14]=output[12]?unmap(NULL,resource,0,output+18,output+15):0;
  memcpy(output+24,resource+0x68/4,36);
  if(fwrite(output,1,sizeof output,out)!=sizeof output)return 7;
  count++;
 }
 fprintf(stderr,"cases=%u\n",count);int bad=n!=0||ferror(in);fclose(in);return fclose(out)||bad?8:0;
}
