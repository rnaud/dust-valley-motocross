#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
int main(int argc,char**argv){
 if(argc!=6)return 2;
 DWORD pid=strtoul(argv[1],0,0),terrain=strtoul(argv[2],0,0),count=strtoul(argv[3],0,0);
 if(!pid||!terrain||!count||count>10000)return 2;
 HANDLE p=OpenProcess(PROCESS_VM_READ,FALSE,pid);SIZE_T got;DWORD header[2];
 if(!p||!ReadProcessMemory(p,(void*)(uintptr_t)(terrain+0x9f8),header,sizeof header,&got)||got!=sizeof header||header[0]!=count)return 3;
 FILE*out=fopen(argv[4],"wbx"),*meta=fopen(argv[5],"wx");if(!out||!meta)return 4;
 fprintf(meta,"terrain=%08lx count=%lu table=%08lx\n",terrain,count,header[1]);
 const DWORD sizes[3]={512,580,4624},offsets[3]={0x1210,0x1410,0};unsigned char bytes[4624];
 for(DWORD i=0;i<count;i++)for(unsigned k=0;k<3;k++){
  DWORD address;if(!ReadProcessMemory(p,(void*)(uintptr_t)(header[1]+4*i),&address,4,&got)||got!=4||!ReadProcessMemory(p,(void*)(uintptr_t)(address+offsets[k]),bytes,sizes[k],&got)||got!=sizes[k])return 5;
  if(fwrite(bytes,sizes[k],1,out)!=1)return 6;
 }
 int failed=fclose(out);failed|=fclose(meta);CloseHandle(p);return failed?7:0;
}
