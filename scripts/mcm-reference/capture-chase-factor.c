// Read-only target-preparation and six-filter chase observations with two restored breakpoints.
// No input, timing, timer or bike state is overwritten. Pin/verify the retail
// executable hash before use. Context writes touch only EIP and trap flags.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static HANDLE process;
static DWORD addresses[]={0x47c685,0x47d606};
static BYTE instructions[][8]={{0x8b,0x8e,0xec,0x01,0,0},{0x8b,0x86,0xf8,0x01,0,0}};
static unsigned lengths[]={6,6};
static const char*phases[]={"before","after"};
#define HOOK_COUNT 2
static int armed[HOOK_COUNT];
// If execution context cannot be restored, do not detach with live INT3/TF state.
static int fatal_stop(void){fprintf(stderr,"Unrecoverable debugger cleanup; stopping reference to avoid executing armed hooks\n");TerminateProcess(process,5);return 5;}
static int readmem(DWORD a,void*b,SIZE_T n){SIZE_T got;return ReadProcessMemory(process,(void*)(uintptr_t)a,b,n,&got)&&got==n;}
static int writebyte(DWORD a,BYTE b){SIZE_T n;return WriteProcessMemory(process,(void*)(uintptr_t)a,&b,1,&n)&&n==1&&FlushInstructionCache(process,(void*)(uintptr_t)a,1);}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 DWORD pid=strtoul(argv[1],0,0),limit=strtoul(argv[3],0,0);if(!pid||!limit||limit>10000)return 2;
 process=OpenProcess(PROCESS_ALL_ACCESS,FALSE,pid);if(!process)return 2;
 for(unsigned i=0;i<HOOK_COUNT;i++){BYTE b[8];if(instructions[i][0]==0xe8){fprintf(stderr,"Direct CALL single-step is unsafe under this Wine build\n");return 2;}if(!readmem(addresses[i],b,lengths[i])||memcmp(b,instructions[i],lengths[i])){fprintf(stderr,"Instruction guard failed %08lx\n",addresses[i]);CloseHandle(process);return 2;}}
 FILE*out=fopen(argv[2],"wx");if(!out){CloseHandle(process);return 2;}setbuf(out,NULL);
 if(!DebugActiveProcess(pid)){fclose(out);CloseHandle(process);return 2;}DebugSetProcessKillOnExit(FALSE);
 int installed=0,pending=-1,done=0;DWORD pending_thread=0,frame=0,start=GetTickCount();
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
    DWORD inputs[42]={0},actor=0,player=0;
    DWORD pointers[6]={0},records[24]={0},targets[6]={0},result[6]={0},dt=0;
    const unsigned offsets[6]={0x4c,0x48,0x44,0x34,0x30,0x2c};
    if(!readmem(c.Esi+0x210,pointers,24)||!readmem(c.Ebp+8,&dt,4)||!readmem(c.Esi+0x22c,result,12)||!readmem(c.Ebp-0x7c,result+3,12))done=2;
    for(unsigned j=0;j<6;j++)if(!readmem(pointers[j],records+j*4,16)||!readmem(c.Ebp-offsets[j],targets+j,4))done=2;
    if(!readmem(c.Ebp-0x64,inputs,12)||!readmem(c.Ebp-0x40,inputs+3,12)||!readmem(c.Ebp-0x34,inputs+6,12)||!readmem(c.Ebp-0x10,inputs+9,4)||!readmem(c.Esi+0x1d4,inputs+10,4)||!readmem(c.Esi+0x1f4,inputs+11,4)||!readmem(c.Esi+0x1f0,&actor,4)||!readmem(actor+0x954,inputs+12,4))done=2;
    if(!readmem(c.Ebp-0x58,inputs+13,12)||!readmem(c.Ebp-0x28,inputs+16,4)||!readmem(c.Esi+0x1ec,&player,4)||!readmem(player+0x4ec,inputs+17,4)||!readmem(player+0x4dc,inputs+18,4)||!readmem(c.Ebp-0x80,inputs+19,4)||!readmem(0x51edb0,inputs+20,12))done=2;
    inputs[30]=c.Ebx;inputs[31]=c.Edi;
    if(!readmem(c.Esi+0x1d8,inputs+23,4)||!readmem(c.Esi+0x1cc,inputs+24,4)||!readmem(c.Ebp-0x98,inputs+25,4)||!readmem(c.Esi+0x1e0,inputs+26,4)||!readmem(c.Esi+0x1e8,inputs+27,4)||!readmem(c.Esi+0x20c,inputs+28,4)||!readmem(player+0x560,inputs+29,4)||!readmem(player+0x844,inputs+32,4)||!readmem(c.Esi+0x23c,inputs+33,12))done=2;
    if(!readmem(player+0x510,inputs+36,12)||!readmem(player+0x5ec,inputs+39,4)||!readmem(player+0x6a4,inputs+40,4)||!readmem(c.Ebp-0x88,inputs+41,4))done=2;
    if(!done){fprintf(out,"{\"phase\":\"%s\",\"frame\":%lu,\"camera\":%lu,\"esp\":%lu,\"ebp\":%lu,\"deltaBits\":%lu",phases[match],frame,c.Esi,c.Esp,c.Ebp,dt);
     const char*names[5]={"pointers","filters","targets","result","inputs"};DWORD*data[5]={pointers,records,targets,result,inputs};unsigned sizes[5]={6,24,6,6,42};
     for(unsigned j=0;j<5;j++){fprintf(out,",\"%s\":[",names[j]);for(unsigned k=0;k<sizes[j];k++)fprintf(out,"%s%lu",k?",":"",data[j][k]);fprintf(out,"]");}fprintf(out,"}\n");start=GetTickCount();if(match==1)frame++;
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
