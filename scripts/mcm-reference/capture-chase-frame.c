// Raw chase-frame dependencies with three guarded, restored non-CALL breakpoints.
// No input, timing, timer or bike state is overwritten. Pin/verify the retail
// executable hash before use. Context writes touch only EIP and trap flags.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static HANDLE process;
static DWORD addresses[]={0x47b107,0x47db8f,0x47dbdc};
static BYTE instructions[][8]={{0x8b,0x8e,0xec,0x01,0,0},{0x8b,0x86,0x00,0x02,0,0},{0xeb,0x28}};
static unsigned lengths[]={6,6,2};
static const char*phases[]={"source-entry","fov-entry","updated"};
#define HOOK_COUNT 3
static int armed[HOOK_COUNT];
// If execution context cannot be restored, do not detach with live INT3/TF state.
static int fatal_stop(void){fprintf(stderr,"Unrecoverable debugger cleanup; stopping reference to avoid executing armed hooks\n");TerminateProcess(process,5);return 5;}
static int readmem(DWORD a,void*b,SIZE_T n){SIZE_T got;return ReadProcessMemory(process,(void*)(uintptr_t)a,b,n,&got)&&got==n;}
static int writebyte(DWORD a,BYTE b){SIZE_T n;return WriteProcessMemory(process,(void*)(uintptr_t)a,&b,1,&n)&&n==1&&FlushInstructionCache(process,(void*)(uintptr_t)a,1);}
// Raw dependencies, captured atomically while stopped. Only the first entry
// initializes camera state; later bytes are assertions or external bike/input data.
static int block(FILE*out,DWORD address,DWORD size,int*first){
 BYTE bytes[0x1330];if(!address||size>sizeof bytes||!readmem(address,bytes,size))return 0;
 fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",*first?"":",",address,size);*first=0;
 for(DWORD i=0;i<size;i++)fprintf(out,"%02x",bytes[i]);fprintf(out,"\"}");return 1;
}
static int snapshot(FILE*out,const char*phase,DWORD frame,DWORD camera,DWORD dt){
 DWORD app,owner,target,terrain,rider,root,renderRider,renderRoot,devices,keyboard,joystick,filter;
 if(!readmem(0x4e4fb4,&app,4)||!readmem(camera+0x1c,&owner,4)||!readmem(camera+0x1ec,&target,4)||!readmem(camera+0x1f0,&terrain,4)||
 !readmem(target+0x874,&rider,4)||!readmem(target+0x434,&root,4)||!readmem(target+0xc8c,&renderRider,4)||!readmem(renderRider+0x434,&renderRoot,4)||
 !readmem(app+0x10,&devices,4)||!readmem(devices+0x24,&keyboard,4)||!readmem(devices+0xc,&joystick,4))return 0;
 fprintf(out,"{\"phase\":\"%s\",\"frame\":%lu,\"camera\":%lu,\"deltaBits\":%lu,\"blocks\":[",phase,frame,camera,dt);int first=1;
 DWORD pairs[][2]={{0x4e4fb4,4},{0x51edb0,12},{camera,0x254},{app,0x1330},{owner,0x40},{target,0xcc8},{terrain,0xa08},{rider,0x3ac},{root,0x260},{renderRider+0x434,4},{renderRoot,0x260},{devices,0x28},{keyboard,0x1100}};
 for(unsigned i=0;i<sizeof pairs/sizeof pairs[0];i++)if(!block(out,pairs[i][0],pairs[i][1],&first))return 0;
 if(joystick&&!block(out,joystick,0x600,&first))return 0;
 for(unsigned o=0x210;o<=0x228;o+=4)if(!readmem(camera+o,&filter,4)||!filter||!block(out,filter,16,&first))return 0;
 fprintf(out,"]}\n");return !ferror(out);
}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 DWORD pid=strtoul(argv[1],0,0),limit=strtoul(argv[3],0,0);if(!pid||!limit||limit>10000)return 2;
 process=OpenProcess(PROCESS_ALL_ACCESS,FALSE,pid);if(!process)return 2;
 for(unsigned i=0;i<HOOK_COUNT;i++){BYTE b[8];if(instructions[i][0]==0xe8){fprintf(stderr,"Direct CALL single-step is unsafe under this Wine build\n");return 2;}if(!readmem(addresses[i],b,lengths[i])||memcmp(b,instructions[i],lengths[i])){fprintf(stderr,"Instruction guard failed %08lx\n",addresses[i]);CloseHandle(process);return 2;}}
 FILE*out=fopen(argv[2],"wx");if(!out){CloseHandle(process);return 2;}setbuf(out,NULL);
 if(!DebugActiveProcess(pid)){fclose(out);CloseHandle(process);return 2;}DebugSetProcessKillOnExit(FALSE);
 int installed=0,pending=-1,done=0,collecting=0,phaseIndex=0;DWORD pending_thread=0,frame=0,start=GetTickCount();
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
    DWORD dt=0,initialized=0;
    if(match==0){
     if(phaseIndex||!readmem(c.Esi+0x238,&initialized,4))done=2;
     else collecting=initialized!=0;
    }
    if(collecting&&!done){
     if(match!=phaseIndex||!readmem(c.Ebp+8,&dt,4)||!snapshot(out,phases[match],frame,c.Esi,dt))done=2;
     else {start=GetTickCount();phaseIndex=(phaseIndex+1)%HOOK_COUNT;if(match==2)frame++;}
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
 if(!DebugActiveProcessStop(pid))done=2;
 BOOL debugger=TRUE;if(!CheckRemoteDebuggerPresent(process,&debugger)||debugger)done=2;
 for(unsigned i=0;i<HOOK_COUNT;i++){BYTE b[8];int restored=readmem(addresses[i],b,lengths[i])&&!memcmp(b,instructions[i],lengths[i]);fprintf(stderr,"hook=%08lx restored=%d\n",addresses[i],restored);if(!restored)done=2;}
 if(fclose(out))done=2;CloseHandle(process);fprintf(stderr,"renderFrames=%lu status=%d debugger=%d\n",frame,done,debugger);return done==1?0:4;
}
