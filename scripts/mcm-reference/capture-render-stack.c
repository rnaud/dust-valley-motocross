// Read-only recursive rendering call-boundary stack observations apart from restored breakpoints.
// No input, timing, timer or bike state is overwritten. Pin/verify the retail
// executable hash before use. Context writes touch only EIP and trap flags.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static HANDLE process;
static DWORD addresses[]={0x467fc8,0x4206f6,0x4206f9,0x467fcb,0x4a54b6};
static BYTE instructions[][8]={{0xff,0x57,0x24},{0xff,0x50,0x24},{0x85,0xc0},{0x8b,0xce},{0xd9,0x86,0xc8,0x08,0x00,0x00}};
static unsigned lengths[]={3,3,2,2,6};
static const char*phases[]={"at-00467fc8","at-004206f6","at-004206f9","at-00467fcb"};
#define HOOK_COUNT 5
static int armed[HOOK_COUNT];
// If execution context cannot be restored, do not detach with live INT3/TF state.
static int fatal_stop(void){fprintf(stderr,"Unrecoverable debugger cleanup; stopping reference to avoid executing armed hooks\n");TerminateProcess(process,5);return 5;}
static int readmem(DWORD a,void*b,SIZE_T n){SIZE_T got;return ReadProcessMemory(process,(void*)(uintptr_t)a,b,n,&got)&&got==n;}
static int writebyte(DWORD a,BYTE b){SIZE_T n;return WriteProcessMemory(process,(void*)(uintptr_t)a,&b,1,&n)&&n==1&&FlushInstructionCache(process,(void*)(uintptr_t)a,1);}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 DWORD pid=strtoul(argv[1],0,0),limit=strtoul(argv[3],0,0);if(!pid||!limit||limit>10000)return 2;
 process=OpenProcess(PROCESS_ALL_ACCESS,FALSE,pid);if(!process)return 2;
 for(unsigned i=0;i<HOOK_COUNT;i++){BYTE b[8];if(!readmem(addresses[i],b,lengths[i])||memcmp(b,instructions[i],lengths[i])){fprintf(stderr,"Instruction guard failed %08lx\n",addresses[i]);CloseHandle(process);return 2;}}
 FILE*out=fopen(argv[2],"wx");if(!out){CloseHandle(process);return 2;}setbuf(out,NULL);
 if(!DebugActiveProcess(pid)){fclose(out);CloseHandle(process);return 2;}DebugSetProcessKillOnExit(FALSE);
 int installed=0,pending=-1,done=0;DWORD pending_thread=0,frame=0,scratch=0,start=GetTickCount();
 while(!done){
  DEBUG_EVENT e;DWORD status=DBG_CONTINUE;
  if(!WaitForDebugEvent(&e,500)){
   if(GetTickCount()-start<30000)continue;
   if(!DebugBreakProcess(process)){fprintf(stderr,"Cannot stop reference for cleanup\n");return fatal_stop();}done=2;
   if(!WaitForDebugEvent(&e,5000)){fprintf(stderr,"Cleanup stop unavailable\n");return fatal_stop();}
  }
  if(e.dwDebugEventCode==CREATE_PROCESS_DEBUG_EVENT&&e.u.CreateProcessInfo.hFile)CloseHandle(e.u.CreateProcessInfo.hFile);
  if(e.dwDebugEventCode==LOAD_DLL_DEBUG_EVENT&&e.u.LoadDll.hFile)CloseHandle(e.u.LoadDll.hFile);
  if(e.dwDebugEventCode==EXIT_PROCESS_DEBUG_EVENT){fprintf(stderr,"Reference exit=%08lx\n",e.u.ExitProcess.dwExitCode);done=2;ContinueDebugEvent(e.dwProcessId,e.dwThreadId,status);break;}
  if(e.dwDebugEventCode==EXCEPTION_DEBUG_EVENT){
   DWORD code=e.u.Exception.ExceptionRecord.ExceptionCode,a=(DWORD)(uintptr_t)e.u.Exception.ExceptionRecord.ExceptionAddress;int match=-1;
   for(unsigned i=0;i<HOOK_COUNT;i++)if(armed[i]&&a==addresses[i])match=i;
   if(code==EXCEPTION_BREAKPOINT&&!installed&&!done){for(unsigned i=0;i<HOOK_COUNT;i++){if(!writebyte(addresses[i],0xcc)){done=2;break;}armed[i]=1;}installed=1;}
   else if(code==EXCEPTION_BREAKPOINT&&match>=0){
    HANDLE thread=OpenThread(THREAD_GET_CONTEXT|THREAD_SET_CONTEXT,FALSE,e.dwThreadId);CONTEXT c={.ContextFlags=CONTEXT_CONTROL|CONTEXT_INTEGER};
    if(!thread||!GetThreadContext(thread,&c)){fprintf(stderr,"Context unavailable while stopped\n");return fatal_stop();}
    if(match==HOOK_COUNT-1){DWORD ai;if(!readmem(c.Esi+0x614,&ai,4))done=2;else if(!ai)scratch=c.Esp+0x54;}
    else{DWORD word=0,target=0;if(match==1&&!readmem(c.Eax+0x24,&target,4))done=2;if(scratch&&!readmem(scratch,&word,4))done=2;
     if(!done){fprintf(out,"{\"phase\":\"%s\",\"frame\":%lu,\"esp\":%lu,\"target\":%lu,\"scratchAddress\":%lu,\"scratchBits\":%lu}\n",phases[match],frame,c.Esp,target,scratch,word);start=GetTickCount();}if(match==3)frame++;
    }
    if(!writebyte(addresses[match],instructions[match][0])){fprintf(stderr,"Cannot restore breakpoint\n");return fatal_stop();}armed[match]=0;c.Eip=addresses[match];c.EFlags|=0x100;c.ContextFlags=CONTEXT_CONTROL;
    if(!SetThreadContext(thread,&c)){fprintf(stderr,"Cannot restore stopped context\n");return fatal_stop();}CloseHandle(thread);pending=match;pending_thread=e.dwThreadId;
   }else if(code==EXCEPTION_SINGLE_STEP&&pending>=0&&e.dwThreadId==pending_thread){
    HANDLE thread=OpenThread(THREAD_GET_CONTEXT|THREAD_SET_CONTEXT,FALSE,e.dwThreadId);CONTEXT c={.ContextFlags=CONTEXT_CONTROL};if(!thread||!GetThreadContext(thread,&c))return fatal_stop();
    c.EFlags&=~0x100u;if(!SetThreadContext(thread,&c))return fatal_stop();CloseHandle(thread);
    if(frame>=limit)done=1;
    if(!done){if(!writebyte(addresses[pending],0xcc))return fatal_stop();armed[pending]=1;}pending=-1;
   }else if(code!=EXCEPTION_BREAKPOINT){fprintf(stderr,"Exception=%08lx address=%08lx first=%lu\n",code,a,e.u.Exception.dwFirstChance);status=DBG_EXCEPTION_NOT_HANDLED;}
  }
  if(!done&&GetTickCount()-start>=30000)done=2;
  if(done){
   for(unsigned i=0;i<HOOK_COUNT;i++)if(armed[i]){if(!writebyte(addresses[i],instructions[i][0]))return fatal_stop();armed[i]=0;}
   if(pending>=0){HANDLE thread=OpenThread(THREAD_GET_CONTEXT|THREAD_SET_CONTEXT,FALSE,pending_thread);CONTEXT c={.ContextFlags=CONTEXT_CONTROL};if(!thread||!GetThreadContext(thread,&c))return fatal_stop();c.EFlags&=~0x100u;if(!SetThreadContext(thread,&c))return fatal_stop();CloseHandle(thread);}
  }
  ContinueDebugEvent(e.dwProcessId,e.dwThreadId,status);
 }
 DebugActiveProcessStop(pid);fclose(out);CloseHandle(process);fprintf(stderr,"renderFrames=%lu status=%d\n",frame,done);return done==1?0:4;
}
