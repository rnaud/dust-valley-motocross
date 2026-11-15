// Execute intact ec5e0; replace external mapping/buffer/GL helpers only.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
uint32_t sampler_entry,sampler_args[4];
static uint8_t context[0x600],backend[0x80],gl[0x3000];
static uint32_t shader[4],buffer[5],input[31],output[129],map[16],current;
static char name[64];
static void event(uint32_t kind,uint32_t a,uint32_t b,uint32_t c){unsigned i=output[0]++;if(i>=32)ExitProcess(20);uint32_t*v=output+1+i*4;v[0]=kind;v[1]=a;v[2]=b;v[3]=c;}
static uint32_t *get_map(void*c,void*s,uint32_t*first,uint32_t*count){if(c!=context||s!=((input[0]&2)?NULL:shader))ExitProcess(21);*first=input[4];*count=input[5];event(1,s?shader[0]:0xffffffff,*first,*count);return(input[0]&4)?map:NULL;}
static void *acquire(void*p){if(p!=backend+0x18)ExitProcess(22);event(2,0,0,0);return buffer;}
static void format(void*b,const char*f,const char*p,uint32_t i){if(b!=buffer||strcmp(f,"%s_sampler%u"))ExitProcess(23);const char*names[]={"ps","vs","gs","hs","ds","cs","unknown"};unsigned k;for(k=0;k<7&&strcmp(names[k],p);k++);if(k==7)ExitProcess(24);current=i;snprintf(name,sizeof name,"%s_sampler%u",p,i);event(3,k,i,0);}
static uint32_t __stdcall query(uint32_t program,const char*n){if(n!=name||program!=input[3])ExitProcess(25);uint32_t v=input[23+current];event(4,program,current,v);if(input[0]&8)*(uint32_t*)(gl+0x4c)^=0xffffffff;if(input[0]&16)map[input[4]+current]=0;return v;}
static void __stdcall bind_sampler(uint32_t location,uint32_t unit){event(5,location,unit,0);}
static void release(void*p,void*b){if(p!=backend+0x18||b!=buffer)ExitProcess(26);event(6,0,0,0);}
void sampler_run(void);
__asm__(".text\n_sampler_run:\n push %ebp\n push %ebx\n push %esi\n push %edi\n sub $4,%esp\n mov _sampler_args,%eax\n mov _sampler_args+4,%edx\n mov _sampler_args+8,%ecx\n mov _sampler_args+12,%ebx\n mov %ebx,(%esp)\n call *_sampler_entry\n add $4,%esp\n pop %edi\n pop %esi\n pop %ebx\n pop %ebp\n ret\n");
static int redirect(uint8_t*p,const uint8_t*g,size_t n,void*f){DWORD old;if(memcmp(p,g,n)||!VirtualProtect(p,5,PAGE_EXECUTE_READWRITE,&old))return 0;p[0]=0xe9;*(uint32_t*)(p+1)=(uintptr_t)f-(uintptr_t)(p+5);return FlushInstructionCache(GetCurrentProcess(),p,5);}
int main(int argc,char**argv){
 if(argc!=4)return 2;uint8_t*b=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!b)return 3;
 const BYTE entry[]={0x55,0x89,0xe5,0x57,0x56,0x53,0x83,0xec,0x40};
 const BYTE mapping[]={0x55,0x89,0xe5,0x83,0xec,0x14},fmt[]={0x55,0x89,0xe5,0x57,0x56};
 // Pool helper guards are checked against the pinned implementation.
 const BYTE pool_get[]={0x55,0x89,0xe5,0x83,0xec,0x18},pool_put[]={0x55,0x89,0xe5,0x8b,0x45,0x0c};
 if(memcmp(b+0xec5e0,entry,sizeof entry)||!redirect(b+0x1a43e0,mapping,sizeof mapping,get_map)||!redirect(b+0x138260,fmt,sizeof fmt,format)||!redirect(b+0x137fd0,pool_get,sizeof pool_get,acquire)||!redirect(b+0x138190,pool_put,sizeof pool_put,release))return 4;
 DWORD old;if(!VirtualProtect(b+0x2161d0,0x11,PAGE_READWRITE,&old))return 5;b[0x2161d0]=0;b[0x2161e0]=0;
 *(uintptr_t*)(context+0x3fc)=(uintptr_t)gl;*(uintptr_t*)(gl+0x1904)=(uintptr_t)query;*(uintptr_t*)(gl+0x2c18)=(uintptr_t)bind_sampler;buffer[2]=(uintptr_t)name;
 sampler_entry=(uintptr_t)(b+0xec5e0);sampler_args[0]=(uintptr_t)context;sampler_args[1]=(uintptr_t)backend;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 6;size_t n;unsigned cases=0;
 while((n=fread(input,1,sizeof input,in))==sizeof input){if(input[4]>7||input[5]>8)return 7;memset(output,0,sizeof output);memcpy(map,input+7,sizeof map);shader[0]=input[2];*(uint32_t*)(gl+0x1dc)=input[0]&1;*(uint32_t*)(gl+4)=input[1];*(uint32_t*)(gl+0x4c)=input[6];sampler_args[2]=input[3];sampler_args[3]=(input[0]&2)?0:(uintptr_t)shader;sampler_run();if(fwrite(output,1,sizeof output,out)!=sizeof output)return 8;cases++;}
 fprintf(stderr,"cases=%u\n",cases);int bad=n||ferror(in);fclose(in);return fclose(out)||bad?9:0;
}
