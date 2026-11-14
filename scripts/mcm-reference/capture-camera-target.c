// Read-only indexed-draw and pinned Wine stateblock boundary observations apart from restored breakpoints.
// No input, timing, timer or bike state is overwritten. Pin/verify the retail
// executable hash before use. Context writes touch only EIP and trap flags.
#include <windows.h>
#include <tlhelp32.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static HANDLE process;
static DWORD ddraw_base;
static DWORD addresses[]={0x467fc8,0x445f85,0x445f88,0x467fcb,0x7aa9b340,0x7aa9b3b3,0x7aa9b3dc,0x7aa9ebfe,0x7aa9ec30,0x7aa91588,0x7aa9ebf6,0x7aa9ea3f,0x7aa9eaa5,0x7aa9eae1,0x7aa9eb19,0x7aa9eb4f,0x7aa9eb76,0x7aa9eb88,0x7aa9eb9a,0x7aa9ebb4,0x7aa9ebd8,0x7aa9ebee,0x7a93103a,0x7a931042,0x7a83308b,0x7a964500,0x47a6cd,0x47a6e5,0x47a670,0x47a240,0x47d9f1,0x47d9f4,0x4a54b6};
static BYTE instructions[][8]={{0xff,0x57,0x24},{0xff,0x53,0x78},{0x8b,0x44,0x24,0x18},{0x8b,0xce},{0x55},{0x8b,0x4d,0xe0},{0x8b,0x40,0x68},{0x8b,0x45,0x14},{0x89,0x4,0x24},{0xff,0x25,0xc,0x5,0xaf,0x7a},{0x89,0x34,0x24},{0x89,0x45,0xe8},{0xf,0xb7,0x4d,0xd8},{0x85,0xc0},{0x85,0xc0},{0x85,0xc0},{0x8b,0x45,0xe0},{0x89,0x44,0x24,0x4},{0x8b,0x45,0xe4},{0x8b,0x46,0x30},{0x8b,0x46,0x30},{0x89,0x04,0x24},{0x89,0x3c,0x24},{0x8b,0x45,0x0c},{0x0f,0x17,0x60,0x08},{0x55},{0x8d,0x7b,0x70},{0xd9,0x83,0x3c,0x01,0x00,0x00},{0x81,0xec,0x80,0,0,0},{0x83,0xec,0x04},{0xff,0x53,0x50},{0x8b,0x86,0xf4,0x01,0,0},{0xd9,0x86,0xc8,0x8,0x0,0x0}};
static unsigned lengths[]={3,3,4,2,1,3,3,3,3,6,3,3,4,2,2,2,3,4,3,3,3,3,3,3,4,1,3,6,6,3,3,6,6};
static const char*phases[]={"at-00467fc8","at-00445f85","at-00445f88","at-00467fcb","wrapper-entry","after-state","before-device7","after-prepare","before-indexed","unlock-entry","before-prepare","setup-ea3f","setup-eaa5","setup-eae1","setup-eb19","setup-eb4f","setup-eb76","setup-eb88","setup-eb9a","setup-ebb4","setup-ebd8","before-apply","before-product","after-product","product-store","set-transform","before-view","after-view","view-entry","camera-set","before-target","after-target"};
#define HOOK_COUNT 33
static int armed[HOOK_COUNT];
// If execution context cannot be restored, do not detach with live INT3/TF state.
static int fatal_stop(void){fprintf(stderr,"Unrecoverable debugger cleanup; stopping reference to avoid executing armed hooks\n");TerminateProcess(process,5);return 5;}
static int readmem(DWORD a,void*b,SIZE_T n){SIZE_T got;return ReadProcessMemory(process,(void*)(uintptr_t)a,b,n,&got)&&got==n;}
static int writebyte(DWORD a,BYTE b){SIZE_T n;return WriteProcessMemory(process,(void*)(uintptr_t)a,&b,1,&n)&&n==1&&FlushInstructionCache(process,(void*)(uintptr_t)a,1);}
static int locate_ddraw(DWORD pid){
 HANDLE snapshot=CreateToolhelp32Snapshot(TH32CS_SNAPMODULE|TH32CS_SNAPMODULE32,pid);MODULEENTRY32 m={.dwSize=sizeof(m)};
 if(snapshot==INVALID_HANDLE_VALUE)return 0;
 if(Module32First(snapshot,&m))do{if(!lstrcmpiA(m.szModule,"ddraw.dll")&&m.modBaseSize==0x69000){DWORD pe=0,stamp=0;ddraw_base=(DWORD)(uintptr_t)m.modBaseAddr;if(!readmem(ddraw_base+0x3c,&pe,4)||pe>4096||!readmem(ddraw_base+pe+8,&stamp,4)||stamp!=0x69e0eaba)ddraw_base=0;break;}}while(Module32Next(snapshot,&m));
 CloseHandle(snapshot);if(!ddraw_base)return 0;
 for(unsigned i=0;i<HOOK_COUNT;i++)if(addresses[i]>=0x7aa90000&&addresses[i]<0x7aaf9000)addresses[i]=ddraw_base+addresses[i]-0x7aa90000;
 DWORD unlock_iat=ddraw_base+0x6050c;memcpy(instructions[9]+2,&unlock_iat,4);
 fprintf(stderr,"ddrawBase=%08lx imageSize=00069000 timestamp=%08lx\n",ddraw_base,(DWORD)0x69e0eaba);return 1;
}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 DWORD pid=strtoul(argv[1],0,0),limit=strtoul(argv[3],0,0);if(!pid||!limit||limit>10000)return 2;
 process=OpenProcess(PROCESS_ALL_ACCESS,FALSE,pid);if(!process)return 2;if(!locate_ddraw(pid)){fprintf(stderr,"Pinned Wine ddraw module guard failed\n");CloseHandle(process);return 2;}
 for(unsigned i=0;i<HOOK_COUNT;i++){BYTE b[8];if(instructions[i][0]==0xe8){fprintf(stderr,"Unsafe direct-CALL hook\n");CloseHandle(process);return 2;}if(!readmem(addresses[i],b,lengths[i])||memcmp(b,instructions[i],lengths[i])){fprintf(stderr,"Instruction guard failed %08lx\n",addresses[i]);CloseHandle(process);return 2;}}
 FILE*out=fopen(argv[2],"wx");if(!out){CloseHandle(process);return 2;}setbuf(out,NULL);
 if(!DebugActiveProcess(pid)){fclose(out);CloseHandle(process);return 2;}DebugSetProcessKillOnExit(FALSE);
 DWORD product=0,tracked_before=0;int tracking=0;int installed=0,pending=-1,done=0,draw_active=0;DWORD pending_thread=0,frame=0,scratch=0,start=GetTickCount();
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
    tracking=draw_active&&match==24&&c.Eax+8==scratch;if(tracking&&!readmem(scratch,&tracked_before,4))done=2;
    if(match==HOOK_COUNT-1){DWORD ai;if(!readmem(c.Esi+0x614,&ai,4))done=2;else if(!ai)scratch=c.Esp+0x54;}
    else if(match<4||draw_active||match>=25){if(match==1)draw_active=1;DWORD word=0,target=0;if(match==21&&!readmem(ddraw_base+0x60544,&target,4))done=2;if(match==6&&!readmem(c.Eax+0x68,&target,4))done=2;if(match==1&&(!readmem(c.Ebx+0x78,&target,4)||target!=ddraw_base+0x98d0))done=2;if(scratch&&!readmem(scratch,&word,4))done=2;
     if(!done){fprintf(out,"{\"phase\":\"%s\",\"frame\":%lu,\"esp\":%lu,\"target\":%lu,\"scratchAddress\":%lu,\"scratchBits\":%lu",phases[match],frame,c.Esp,target,scratch,word);
      if(match==30||match==31){DWORD words[10]={0},flags[2]={0},counter=0,owner=0,owner_counter=0,mode=0,entry=0,aim[3]={0};if(!readmem(c.Esi+0x144,words,40)||!readmem(c.Esi+0x1c4,flags,8)||!readmem(c.Esi+0x1bc,&counter,4)||!readmem(c.Esi+0x1c,&owner,4)||!readmem(owner+0x38,&owner_counter,4)||!readmem(c.Esi+0x140,&mode,4))done=2;if(match==30&&(!readmem(c.Esp,aim,12)||!readmem(c.Ebx+0x50,&entry,4)))done=2;
       fprintf(out,",\"camera\":%lu,\"upValid\":%lu,\"forwardValid\":%lu,\"refreshCounter\":%lu,\"ownerCounter\":%lu,\"retainedMode\":%lu,\"callee\":%lu,\"returnValue\":%lu,\"aimWords\":[%lu,%lu,%lu],\"words\":[",c.Esi,flags[0],flags[1],counter,owner_counter,mode,entry,c.Eax,aim[0],aim[1],aim[2]);for(unsigned j=0;j<10;j++)fprintf(out,"%s%lu",j?",":"",words[j]);fprintf(out,"]");}
      if(match==29){DWORD args[6]={0};if(!readmem(c.Esp,args,24))done=2;fprintf(out,",\"returnAddress\":%lu,\"camera\":%lu,\"args\":[",args[0],c.Ecx);for(unsigned j=1;j<6;j++)fprintf(out,"%s%lu",j>1?",":"",args[j]);fprintf(out,"],\"values\":[");for(unsigned j=1;j<5;j++){if(j>1)fprintf(out,",");if(!args[j])fprintf(out,"null");else{DWORD data[3]={0},count=j==4?1:3;if(!readmem(args[j],data,count*4))done=2;fprintf(out,"[");for(DWORD k=0;k<count;k++)fprintf(out,"%s%lu",k?",":"",data[k]);fprintf(out,"]");}}fprintf(out,"]");}
      if(match==28){DWORD ret=0;if(!readmem(c.Esp,&ret,4))done=2;fprintf(out,",\"returnAddress\":%lu,\"camera\":%lu",ret,c.Ecx);}
      if(match==26||match==27){DWORD words[16]={0},count=match==26?10:16;if(!readmem(c.Ebx+(match==26?0x144:0x70),words,count*4))done=2;fprintf(out,",\"camera\":%lu,\"words\":[",c.Ebx);for(DWORD j=0;j<count;j++)fprintf(out,"%s%lu",j?",":"",words[j]);fprintf(out,"]");}
      if(match==25){DWORD fp=c.Ebp,link[2];fprintf(out,",\"callers\":[");unsigned depth=0;while(depth<6&&fp>=0x220000&&fp<0x230000&&readmem(fp,link,8)){fprintf(out,"%s%lu",depth?",":"",link[1]);if(link[0]<=fp)break;fp=link[0];depth++;}fprintf(out,"]");DWORD args[4]={0},matrix[16]={0};if(!readmem(c.Esp,args,16)||!readmem(args[3],matrix,64))done=2;fprintf(out,",\"returnAddress\":%lu,\"stateblock\":%lu,\"transform\":%lu,\"matrixAddress\":%lu,\"words\":[",args[0],args[1],args[2],args[3]);for(unsigned j=0;j<16;j++)fprintf(out,"%s%lu",j?",":"",matrix[j]);fprintf(out,"]");}
      if(match==22||match==23){DWORD matrices[32],count=match==22?32:16;if(match==22){product=c.Esi;if(!readmem(c.Edi+0x2c94,matrices,64)||!readmem(c.Edi+0x6c14,matrices+16,64))done=2;}else if(!product||!readmem(product,matrices,64))done=2;
       fprintf(out,",\"destination\":%lu,\"stateAddress\":%lu,\"words\":[",product,c.Edi);for(DWORD j=0;j<count;j++)fprintf(out,"%s%lu",j?",":"",matrices[j]);fprintf(out,"]");
      }
      if(match==24)fprintf(out,",\"destination\":%lu,\"overlapsScratch\":%s",c.Eax,c.Eax+8==scratch?"true":"false");
      if(match==1){DWORD args[8];if(!readmem(c.Esp,args,sizeof(args))||args[2]!=2||args[4]>8192||args[6]>32768)done=2;
       else{DWORD sizes[2]={args[4]*32,args[6]*2},ptrs[2]={args[3],args[5]};fprintf(out,",\"args\":[");for(unsigned j=0;j<8;j++)fprintf(out,"%s%lu",j?",":"",args[j]);fprintf(out,"]");
        for(unsigned j=0;j<2;j++){BYTE*data=malloc(sizes[j]?sizes[j]:1);if(!data||(sizes[j]&&!readmem(ptrs[j],data,sizes[j])))done=2;else{fprintf(out,",\"%s\":\"",j?"indicesHex":"verticesHex");for(DWORD k=0;k<sizes[j];k++)fprintf(out,"%02x",data[k]);fputc('"',out);}free(data);}
       }
      }fprintf(out,"}\n");start=GetTickCount();}if(match==2)draw_active=0;if(match==3)frame++;
    }
    if(!writebyte(addresses[match],instructions[match][0])){fprintf(stderr,"Cannot restore breakpoint\n");return fatal_stop();}armed[match]=0;c.Eip=addresses[match];c.EFlags|=0x100;c.ContextFlags=CONTEXT_CONTROL;
    if(!SetThreadContext(thread,&c)){fprintf(stderr,"Cannot restore stopped context\n");return fatal_stop();}CloseHandle(thread);pending=match;pending_thread=e.dwThreadId;
   }else if(code==EXCEPTION_SINGLE_STEP&&pending>=0&&e.dwThreadId==pending_thread){
    HANDLE thread=OpenThread(THREAD_GET_CONTEXT|THREAD_SET_CONTEXT,FALSE,e.dwThreadId);CONTEXT c={.ContextFlags=CONTEXT_CONTROL};if(!thread||!GetThreadContext(thread,&c))return fatal_stop();
    if(tracking){DWORD after=0;if(!readmem(scratch,&after,4))done=2;else fprintf(out,"{\"phase\":\"store-after\",\"frame\":%lu,\"instruction\":%lu,\"scratchAddress\":%lu,\"beforeBits\":%lu,\"scratchBits\":%lu}\n",frame,addresses[pending],scratch,tracked_before,after);tracking=0;}
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
