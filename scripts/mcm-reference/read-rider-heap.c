#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
static HANDLE process;
static int read_memory(DWORD address,void*out,size_t size){SIZE_T n;return ReadProcessMemory(process,(void*)(uintptr_t)address,out,size,&n)&&n==size;}
static int write_particle_hex(FILE*out,const BYTE*data,size_t n){for(size_t i=0;i<n;i++)fprintf(out,"%02x",data[i]);return !ferror(out);}
#include "capture-rider-heap.c"
int main(int argc,char**argv){
 if(argc!=4)return 2;DWORD pid=strtoul(argv[1],0,0),child=strtoul(argv[2],0,0);
 process=OpenProcess(PROCESS_VM_READ|PROCESS_QUERY_INFORMATION,FALSE,pid);if(!process)return 3;
 if(!DebugActiveProcess(pid)){CloseHandle(process);return 4;}DebugSetProcessKillOnExit(FALSE);
 DEBUG_EVENT event;int got=WaitForDebugEvent(&event,5000),ok=0;
 if(got){FILE*out=fopen(argv[3],"wx");if(out){ok=capture_rider_heap(out,child);if(fclose(out))ok=0;}ContinueDebugEvent(event.dwProcessId,event.dwThreadId,DBG_CONTINUE);}
 int detached=DebugActiveProcessStop(pid);CloseHandle(process);fprintf(stderr,"snapshot=%d detached=%d\n",ok,detached);return ok&&detached?0:5;
}
