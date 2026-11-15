// Controlled capture setup: read the current chase target, or replace an
// expected bike pointer with another validated bike. Restore it after capture.
// Usage: select-camera-target PID CAMERA [EXPECTED_TARGET NEW_TARGET]
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
static int readword(HANDLE p,DWORD a,DWORD*v){SIZE_T n;return ReadProcessMemory(p,(void*)(uintptr_t)a,v,4,&n)&&n==4;}
int main(int argc,char**argv){
 if(argc!=3&&argc!=5)return 2;DWORD pid=strtoul(argv[1],0,0),camera=strtoul(argv[2],0,0),target,mode,vt;
 HANDLE p=OpenProcess(PROCESS_QUERY_INFORMATION|PROCESS_VM_READ|(argc==5?(PROCESS_VM_WRITE|PROCESS_VM_OPERATION):0),FALSE,pid);if(!p)return 3;
 BOOL attached;if(!CheckRemoteDebuggerPresent(p,&attached)||attached||!readword(p,camera+0x1ec,&target)||!readword(p,camera+0x1f4,&mode)||!readword(p,target,&vt)||vt!=0x4d9a94)return 4;
 printf("camera=%08lx target=%08lx mode=%lu debugger=0\n",camera,target,mode);
 if(argc==5){DWORD expected=strtoul(argv[3],0,0),next=strtoul(argv[4],0,0),actual;SIZE_T n;
  if(target!=expected||!readword(p,next,&vt)||vt!=0x4d9a94)return 5;
  if(!WriteProcessMemory(p,(void*)(uintptr_t)(camera+0x1ec),&next,4,&n)||n!=4||!readword(p,camera+0x1ec,&actual)||actual!=next)return 6;
  printf("target_changed=%08lx->%08lx verified=1\n",target,actual);
 }
 CloseHandle(p);return 0;
}
