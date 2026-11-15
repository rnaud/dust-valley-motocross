// Execute pinned variant lookup paths; creation branches end at a sentinel.
// The comparator/scan and hit-return instructions remain intact.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
static uint8_t context[0x400],shader[0x30],entries[8*56];
static uint32_t table[3];
static int boundary(uint8_t*b,unsigned at,unsigned exit){
 DWORD old;if(!VirtualProtect(b+at,10,PAGE_EXECUTE_READWRITE,&old))return 0;
 b[at]=0xbb;*(uint32_t*)(b+at+1)=0xffffffff;b[at+5]=0xe9;*(int32_t*)(b+at+6)=(int32_t)(exit-at-10);return 1;
}
int main(int argc,char**argv){
 if(argc!=4)return 2;uint8_t*b=(void*)LoadLibraryExA(argv[1],NULL,DONT_RESOLVE_DLL_REFERENCES);if(!b)return 3;
 const uint8_t entry[]={0x55,0x89,0xe5,0x57,0x56,0x53,0x83,0xec};
 if(memcmp(b+0x725a0,entry,8)||memcmp(b+0x71020,entry,8))return 4;
 // Miss, empty and absent variant arrays all enter creation, outside scope.
 if(!boundary(b,0x72660,0x72b40)||!boundary(b,0x72ca0,0x72b40)||!boundary(b,0x72ce0,0x72b40)||!boundary(b,0x71098,0x71088)||!boundary(b,0x71bd8,0x71088)||!boundary(b,0x71c18,0x71088))return 5;
 DWORD old;if(!VirtualProtect(b+0x2e3690,4,PAGE_READWRITE,&old))return 6;
 *(void**)(b+0x2e3690)=(void*)GetProcAddress(LoadLibraryA("ucrtbase.dll"),"memcmp");if(!*(void**)(b+0x2e3690))return 6;
 FILE*in=fopen(argv[2],"rb"),*out=fopen(argv[3],"wb");if(!in||!out)return 7;
 // kind, mask, table-present, count, query[52], eight entries[56].
 uint32_t a[129];size_t n;unsigned cases=0;
 while((n=fread(a,1,sizeof a,in))==sizeof a){
  if((a[0]!=0&&a[0]!=4)||a[3]>8)return 8;
  memset(context,0,sizeof context);memset(shader,0,sizeof shader);memcpy(entries,a+17,sizeof entries);
  table[0]=(uintptr_t)entries;table[1]=a[3];table[2]=8;
  *(uint32_t*)(context+0x3f0)=a[1];*(uintptr_t*)(shader+0x28)=a[2]?(uintptr_t)table:0;
  // Pack vertex records to their native 28-byte stride.
  if(a[0]==0)for(unsigned j=0;j<8;j++)memmove(entries+j*28,(uint8_t*)(a+17)+j*56,28);
  uint32_t result=((uint32_t(__attribute__((regparm(3)))*)(void*,void*,void*,void*))(b+(a[0]==0?0x725a0:0x71020)))(context,NULL,shader,a+4);
  if(fwrite(&result,4,1,out)!=1)return 9;cases++;
 }
 fprintf(stderr,"cases=%u\n",cases);int bad=n||ferror(in);fclose(in);return fclose(out)||bad?10:0;
}
