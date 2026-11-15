#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
uint8_t device[0x12d4],state[0x1b0];uint32_t context[3],flags,output[14];
static void event(uint32_t v){output[1+output[0]++]=v;}
void fake_lock(void){event(1);if(flags&4)*(uint32_t*)(state+0x190)^=1;if(flags&8)*(uint32_t*)(device+0x12d0)=0;}
void fake_unlock(void){event(3);}
void fake_emit(uint32_t cs,uint32_t a,uint32_t b,uint32_t c,uint32_t d,uint32_t e,uint32_t f,uint32_t g,uint32_t indexed){
 if(cs!=(uintptr_t)context)ExitProcess(11);event(2);uint32_t args[]={a,b,c,d,e,f,g,indexed};memcpy(output+4,args,sizeof args);
 if(flags&16)*(uint32_t*)(device+0x12d0)=(*(uint32_t*)(device+0x12d0)==(uintptr_t)context)?0:(uintptr_t)context;
}
static int redirect(uint8_t*p,const uint8_t*g,size_t n,void*f){DWORD old;if(memcmp(p,g,n)||!VirtualProtect(p,5,PAGE_EXECUTE_READWRITE,&old))return 0;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)f-(uintptr_t)(p+5);return FlushInstructionCache(GetCurrentProcess(),p,5);}
int main(int argc,char**argv){
 if(argc!=4)return 2;uint8_t*b=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!b)return 3;
 const uint8_t entry[]={0x55,0x89,0xe5,0x57,0x56,0x53,0x83,0xec,0x38};
 const uint8_t emit[]={0x55,0x89,0xe5,0x57,0x56};
 // Lock/unlock guard bytes are verified below against the pinned DLL.
 const uint8_t lock[]={0x55,0x89,0xe5,0x83,0xec,0x04},unlock[]={0x55,0x89,0xe5,0x83,0xec,0x04};
 if(memcmp(b+0x1c3ed0,entry,sizeof entry)||!redirect(b+0x1c44e0,emit,sizeof emit,fake_emit)||!redirect(b+0x1e16f0,lock,sizeof lock,fake_lock)||!redirect(b+0x1e1710,unlock,sizeof unlock,fake_unlock))return 4;
 DWORD old;if(!VirtualProtect(b+0x216148,1,PAGE_READWRITE,&old))return 5;b[0x216148]&=~8;
 context[1]=(uintptr_t)device;context[2]=(uintptr_t)state;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 6;
 uint32_t a[8];size_t n;unsigned cases=0;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  flags=a[0];*(uint32_t*)(device+0x12d0)=(flags&1)?(uintptr_t)context:0;*(uint32_t*)(state+0x190)=(flags>>1)&1;*(uint32_t*)(state+0x1a4)=a[1];*(uint32_t*)(state+0x1a8)=a[2];memset(output,0,sizeof output);
  ((void(__cdecl*)(void*,uint32_t,uint32_t,uint32_t,uint32_t,uint32_t))(b+0x1c3ed0))(context,a[3],a[4],a[5],a[6],a[7]);
  output[12]=*(uint32_t*)(device+0x12d0)==(uintptr_t)context;output[13]=*(uint32_t*)(state+0x190);
  if(fwrite(output,1,sizeof output,out)!=sizeof output)return 7;cases++;
 }
 fprintf(stderr,"cases=%u\n",cases);int bad=n||ferror(in);fclose(in);return fclose(out)||bad?8:0;
}
