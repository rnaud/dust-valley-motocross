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
static DWORD addresses[]={0x46d240,0x4a56d9,0x46dac1,0x46dec6,0x46e060,0x46e1ac,0x46e317,0x46e34a,0x46e9c7,0x46df48,0x46eb14,0x46f4ea,0x46f69e,0x46f0a4,0x4bf195,0x4a2451,0x4a58b3,0x4703c2,0x470553,0x45c8d0,0x45c8f3,0x45c832,0x45c849,0x45c854,0x4a1970,0x4a1a2b,0x4a6c01,0x4a6eac};
static BYTE instructions[][8]={{0x81,0xec,0xa8,0,0,0},{0xe9,0xe2,0,0,0},{0xd9,0x43,0x08},{0x8b,0x87,0xfc,0x0b,0,0},{0x6a,0x14},{0x83,0xc3,0x14},{0x83,0xc6,0x14},{0xc7,0x44,0x24,0x68,0,0,0,0},{0x85,0xc9},{0x8b,0x87,0xbc,0x04,0,0},{0x33,0xf6},{0xd9,0x44,0x24,0x2c},{0x8b,0x87,0xa4,0x06,0,0},{0x8b,0x87,0xbc,0x04,0,0},{0x8b,0x48,0x14},{0x89,0x8b,0xf4,0x06,0,0},{0x89,0x4a,0x08},{0x85,0xc9},{0x5d,0x5f,0x5e,0x5b},{0x8b,0x44,0x24,0x04},{0x5f},{0x83,0xc4,0x04},{0x83,0xc4,0x04},{0x56},{0x53},{0x5f},{0x8b,0x86,0x44,0x08,0,0},{0x8b,0x86,0xbc,0x04,0,0}};
static unsigned lengths[]={6,5,3,6,2,3,3,8,2,6,2,4,6,6,3,6,3,2,4,4,1,3,3,1,1,1,6,6};
#define HOOK_COUNT 28
static int armed[HOOK_COUNT];
// If execution context cannot be restored, do not detach with live INT3/TF state.
static int fatal_stop(void){fprintf(stderr,"Unrecoverable debugger cleanup; stopping reference to avoid executing armed hooks\n");TerminateProcess(process,5);return 5;}
static int readmem(DWORD a,void*b,SIZE_T n){SIZE_T got;return ReadProcessMemory(process,(void*)(uintptr_t)a,b,n,&got)&&got==n;}
static int writebyte(DWORD a,BYTE b){SIZE_T n;return WriteProcessMemory(process,(void*)(uintptr_t)a,&b,1,&n)&&n==1&&FlushInstructionCache(process,(void*)(uintptr_t)a,1);}

// Capture complete descendant/sibling closure before writing a record.
static int graph(FILE*out,DWORD bike,DWORD frame,int after,DWORD esp){
 DWORD root=0,stack[48],queue[512];BYTE data[512][0x114],body[0xcc8];unsigned count=0;
 if(!readmem(bike,body,sizeof body)||!readmem(esp,stack,sizeof stack))return 0;
 root=*(DWORD*)(body+0x434);if(!root)return 0;queue[count++]=root;
 for(unsigned i=0;i<count;i++){
  if(!readmem(queue[i],data[i],sizeof data[i]))return 0;
  for(unsigned k=0;k<2;k++){DWORD next=*(DWORD*)(data[i]+0x10c+k*4);if(!next)continue;unsigned j;for(j=0;j<count;j++)if(queue[j]==next)break;if(j==count){if(count==512)return 0;queue[count++]=next;}}
 }
 fprintf(out,"{\"phase\":\"motion-graph-%s\",\"sequence\":%lu,\"bike\":%lu,\"root\":%lu,\"stack\":[",after?"after":"before",frame,bike,root);for(unsigned j=0;j<48;j++)fprintf(out,"%s%lu",j?",":"",stack[j]);fprintf(out,"],\"hex\":\"");for(unsigned j=0;j<sizeof body;j++)fprintf(out,"%02x",body[j]);fprintf(out,"\",\"nodes\":[");
 for(unsigned i=0;i<count;i++){fprintf(out,"%s{\"address\":%lu,\"hex\":\"",i?",":"",queue[i]);for(unsigned j=0;j<sizeof data[i];j++)fprintf(out,"%02x",data[i][j]);fprintf(out,"\"}");}fprintf(out,"]}\n");return 1;
}

static void hexout(FILE*out,const BYTE*bytes,unsigned size){for(unsigned i=0;i<size;i++)fprintf(out,"%02x",bytes[i]);}
static int trick_graph(FILE*out,DWORD bike,DWORD frame,int after,DWORD selected){
 BYTE body[0xcc8],bounds[0x34],proxy[0x34],envelope[16],records[256][0x30],data[512][0x114];DWORD queue[512],recordAddresses[256],components[256],record=0,source=0;unsigned count=0,rc=0;
 if(selected>=16||!readmem(bike,body,sizeof body)||!readmem(*(DWORD*)(body+0x23c),bounds,sizeof bounds)||!readmem(*(DWORD*)(body+0xc8c),proxy,sizeof proxy)||!readmem(*(DWORD*)(body+0x904),envelope,16)||!readmem(*(DWORD*)(body+0x8d8),&source,4))return 0;
 DWORD root=*(DWORD*)(body+0x434);if(!root||!source)return 0;queue[count++]=root;if(source!=root)queue[count++]=source;
 record=*(DWORD*)(bounds+0xc);
 while(record){if(rc==256)return 0;for(unsigned j=0;j<rc;j++)if(recordAddresses[j]==record)return 0;recordAddresses[rc]=record;if(!readmem(record,records[rc],0x30))return 0;DWORD index=records[rc][0];if(index>255||!readmem(*(DWORD*)(body+0x234)+index*0x40+0x34,&components[rc],4))return 0;unsigned j;for(j=0;j<count;j++)if(queue[j]==components[rc])break;if(j==count)queue[count++]=components[rc];record=*(DWORD*)(records[rc]+0x2c);rc++;}
 for(unsigned i=0;i<count;i++){if(!readmem(queue[i],data[i],0x114))return 0;for(unsigned k=0;k<3;k++){DWORD next=*(DWORD*)(data[i]+0x108+k*4);if(!next)continue;unsigned j;for(j=0;j<count;j++)if(queue[j]==next)break;if(j==count){if(count==512)return 0;queue[count++]=next;}}}
 DWORD bp=*(DWORD*)(body+0x7d4+selected*4),rp=*(DWORD*)(body+0x794+selected*4),bv=0,rv=0;if(!readmem(bp+0x68,&bv,4)||!readmem(rp+0x68,&rv,4))return 0;
 fprintf(out,"{\"phase\":\"trick-graph-%s\",\"sequence\":%lu,\"bike\":%lu,\"selected\":%lu,\"root\":%lu,\"source\":%lu,\"bikeRecord\":%lu,\"riderRecord\":%lu,\"bikeValue\":%lu,\"riderValue\":%lu,\"hex\":\"",after?"after":"before",frame,bike,selected,root,source,bp,rp,bv,rv);hexout(out,body,sizeof body);fprintf(out,"\",\"bounds\":\"");hexout(out,bounds,sizeof bounds);fprintf(out,"\",\"proxy\":\"");hexout(out,proxy,sizeof proxy);fprintf(out,"\",\"envelope\":\"");hexout(out,envelope,16);fprintf(out,"\",\"records\":[");
 for(unsigned i=0;i<rc;i++){fprintf(out,"%s{\"address\":%lu,\"component\":%lu,\"hex\":\"",i?",":"",recordAddresses[i],components[i]);hexout(out,records[i],0x30);fprintf(out,"\"}");}fprintf(out,"],\"nodes\":[");for(unsigned i=0;i<count;i++){fprintf(out,"%s{\"address\":%lu,\"hex\":\"",i?",":"",queue[i]);hexout(out,data[i],0x114);fprintf(out,"\"}");}fprintf(out,"]}\n");return 1;
}

static int contact_graph(FILE*out,DWORD bike,DWORD frame,int after,DWORD esp,int contact){
 DWORD root=0,stack[768],queue[512];BYTE data[512][0x114],body[0xcc8],component[0x60];unsigned count=0;
 if(!readmem(bike,body,sizeof body)||!readmem(esp,stack,contact?sizeof stack:48*4))return 0;
 root=*(DWORD*)(body+0x434);if(!root)return 0;queue[count++]=root;if(!readmem(*(DWORD*)(body+0x8ec),component,sizeof component))return 0;if(contact){DWORD node=*(DWORD*)(component+0x50);if(node&&node!=root)queue[count++]=node;}
 for(unsigned i=0;i<count;i++){
  if(!readmem(queue[i],data[i],sizeof data[i]))return 0;
  for(unsigned k=0;k<2;k++){DWORD next=*(DWORD*)(data[i]+0x10c+k*4);if(!next)continue;unsigned j;for(j=0;j<count;j++)if(queue[j]==next)break;if(j==count){if(count==512)return 0;queue[count++]=next;}}
 }
 fprintf(out,"{\"phase\":\"%s-%s\",\"sequence\":%lu,\"bike\":%lu,\"root\":%lu,\"stack\":[",contact?"contact-response":"motion-graph",after?"after":"before",frame,bike,root);for(unsigned j=0;j<(contact?768:48);j++)fprintf(out,"%s%lu",j?",":"",stack[j]);fprintf(out,"],\"hex\":\"");for(unsigned j=0;j<sizeof body;j++)fprintf(out,"%02x",body[j]);fprintf(out,"\",\"componentHex\":\"");for(unsigned j=0;j<sizeof component;j++)fprintf(out,"%02x",component[j]);fprintf(out,"\",\"nodes\":[");
 for(unsigned i=0;i<count;i++){fprintf(out,"%s{\"address\":%lu,\"hex\":\"",i?",":"",queue[i]);for(unsigned j=0;j<sizeof data[i];j++)fprintf(out,"%02x",data[i][j]);fprintf(out,"\"}");}fprintf(out,"]}\n");return 1;
}


static int locate_ddraw(DWORD pid){return 1;}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 DWORD pid=strtoul(argv[1],0,0),limit=strtoul(argv[3],0,0);if(!pid||!limit||limit>10000)return 2;
 process=OpenProcess(PROCESS_ALL_ACCESS,FALSE,pid);if(!process)return 2;if(!locate_ddraw(pid)){fprintf(stderr,"Pinned Wine ddraw module guard failed\n");CloseHandle(process);return 2;}
 for(unsigned i=0;i<HOOK_COUNT;i++){BYTE b[8];if(instructions[i][0]==0xe8){fprintf(stderr,"Unsafe direct-CALL hook\n");CloseHandle(process);return 2;}if(!readmem(addresses[i],b,lengths[i])||memcmp(b,instructions[i],lengths[i])){fprintf(stderr,"Instruction guard failed %08lx\n",addresses[i]);CloseHandle(process);return 2;}}
 FILE*out=fopen(argv[2],"wx");if(!out){CloseHandle(process);return 2;}setbuf(out,NULL);
 if(!DebugActiveProcess(pid)){fclose(out);CloseHandle(process);return 2;}DebugSetProcessKillOnExit(FALSE);
 DWORD contact_before=0,contact_changes=0,trick_events=0,trick_selected=0,product=0,tracked_before=0;int tracking=0;int route_captured=0,installed=0,pending=-1,done=0,draw_active=0;DWORD pending_thread=0,frame=0,scratch=0,start=GetTickCount();
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

    DWORD bike=match==0?c.Ecx:match==1?c.Esi:c.Edi;BYTE bytes[0xcc8];
    if(match==0&&bike==85947800)draw_active=1;if(match==1&&bike==85947800)draw_active=0;
    if(match==2){DWORD stack[42],settings=0,raceFlag=0;WORD mode=0,enabled=0;BYTE other[0xcc8];if(!readmem(c.Esp,stack,sizeof stack)||!readmem(0x4e4fb4,&settings,4)||!readmem(settings+0x1072,&mode,2)||!readmem(settings+0x1070,&enabled,2)||!readmem(settings+0x6c0,&raceFlag,4)||!readmem(c.Esi,other,sizeof other))done=2;else{fprintf(out,"{\"phase\":\"race-context\",\"sequence\":%lu,\"bike\":%lu,\"other\":%lu,\"settings\":%lu,\"mode\":%u,\"enabled\":%u,\"raceFlag\":%lu,\"stack\":[",frame,bike,c.Esi,settings,mode,enabled,raceFlag);for(unsigned j=0;j<42;j++)fprintf(out,"%s%lu",j?",":"",stack[j]);fprintf(out,"],\"otherHex\":\"");for(unsigned j=0;j<sizeof other;j++)fprintf(out,"%02x",other[j]);fprintf(out,"\"}\n");}}
    if(match==3){DWORD settings=0,world=0,list=0,pointers[64];BYTE count=0;int ok=readmem(0x4e4fb4,&settings,4)&&readmem(settings+0x107e,&count,1)&&readmem(bike+0x41c,&world,4)&&readmem(world+0x34,&list,4)&&count<=64&&(!count||readmem(list,pointers,count*4));if(!ok)done=2;else{fprintf(out,"{\"phase\":\"second-actors\",\"sequence\":%lu,\"bike\":%lu,\"world\":%lu,\"actors\":[",frame,bike,world);for(unsigned j=0;j<count;j++){BYTE data[0xcc8];if(!readmem(pointers[j],data,sizeof data)){done=2;break;}fprintf(out,"%s{\"address\":%lu,\"hex\":\"",j?",":"",pointers[j]);for(unsigned k=0;k<sizeof data;k++)fprintf(out,"%02x",data[k]);fprintf(out,"\"}");}fprintf(out,"]}\n");}}
    if(match==3){DWORD settings=0,world=0,list=0,pointers[64];WORD count=0;int ok=readmem(0x4e4fb4,&settings,4)&&readmem(settings+0x107a,&count,2)&&readmem(bike+0x41c,&world,4)&&readmem(world+0x38,&list,4)&&count<=64&&(!count||readmem(list,pointers,count*4));if(!ok)done=2;else{fprintf(out,"{\"phase\":\"actors\",\"sequence\":%lu,\"bike\":%lu,\"world\":%lu,\"actors\":[",frame,bike,world);for(unsigned j=0;j<count;j++){BYTE data[0xcc8];if(!readmem(pointers[j],data,sizeof data)){done=2;break;}fprintf(out,"%s{\"address\":%lu,\"hex\":\"",j?",":"",pointers[j]);for(unsigned k=0;k<sizeof data;k++)fprintf(out,"%02x",data[k]);fprintf(out,"\"}");}fprintf(out,"]}\n");}}
    if(match>=26){if(c.Esi==85947800){DWORD latch=0;if(!readmem(c.Esi+0xb4c,&latch,4)||!contact_graph(out,c.Esi,frame,match==27,c.Esp,1))done=2;else if(match==26)contact_before=latch;else if(latch!=contact_before)contact_changes++;}}
    else if(match>=24){DWORD tb=match==24?c.Ecx:c.Esi;if(draw_active&&tb==85947800){if(match==25)trick_events++;if(match==24&&!readmem(c.Esp+4,&trick_selected,4))done=2;else if(!trick_graph(out,tb,frame,match==25,trick_selected)){fprintf(stderr,"Trick graph capture failed\n");done=2;}}}
    else if(match>=19){
     DWORD owner=match==19?c.Ecx:c.Edi;
     if(draw_active&&owner==85947800+0x404){
      DWORD counter=0,global=0,args[3]={0};
      if(!readmem(owner+8,&counter,4)||!readmem(0x4e5670,&global,4)||(match==19&&!readmem(c.Esp,args,sizeof args)))done=2;
      else fprintf(out,"{\"phase\":\"allocation-event\",\"sequence\":%lu,\"bike\":85947800,\"instruction\":%lu,\"owner\":%lu,\"ownerBytes\":%lu,\"globalBytes\":%lu,\"eax\":%lu,\"esi\":%lu,\"count\":%lu,\"size\":%lu}\n",frame,addresses[match],owner,counter,global,c.Eax,c.Esi,args[1],args[2]);
     }
    }
    else if(match>=17){if(!graph(out,bike,frame,match==18,c.Esp))done=2;}
    else if(match==16){DWORD previous=0;if(c.Edx+8!=c.Esi+0x6f4||!readmem(c.Edx+8,&previous,4))done=2;else fprintf(out,"{\"phase\":\"crash-control-clear\",\"sequence\":%lu,\"bike\":%lu,\"previous\":%lu,\"value\":%lu}\n",frame,c.Esi,previous,c.Ecx);}
    else if(match==14){DWORD seed=0,caller=0;if(!readmem(c.Eax+0x14,&seed,4)||!readmem(c.Esp,&caller,4))done=2;else fprintf(out,"{\"phase\":\"random\",\"sequence\":%lu,\"thread\":%lu,\"inAi\":%d,\"stateAddress\":%lu,\"state\":%lu,\"caller\":%lu}\n",frame,e.dwThreadId,draw_active,c.Eax+0x14,seed,caller);}
    else if(match==15){DWORD previous=0;if(!readmem(c.Ebx+0x6f4,&previous,4))done=2;else fprintf(out,"{\"phase\":\"control-clear\",\"sequence\":%lu,\"bike\":%lu,\"previous\":%lu,\"value\":%lu}\n",frame,c.Ebx,previous,c.Ecx);}
    else if(match>=11){DWORD stack[42],dt;BYTE state[0xcc8];if(!readmem(c.Esp,stack,sizeof stack)||!readmem(c.Esp+0xbc,&dt,4)||!readmem(bike,state,sizeof state))done=2;else{fprintf(out,"{\"phase\":\"%s\",\"sequence\":%lu,\"bike\":%lu,\"dtBits\":%lu,\"stack\":[",match==13?"lookahead-after":match==11?"steering-control-before":"steering-control-after",frame,bike,dt);for(unsigned j=0;j<42;j++)fprintf(out,"%s%lu",j?",":"",stack[j]);fprintf(out,"],\"hex\":\"");for(unsigned j=0;j<sizeof state;j++)fprintf(out,"%02x",state[j]);fprintf(out,"\"}\n");}}
    else if(match>=9){DWORD stack[42];if(!readmem(c.Esp,stack,sizeof stack))done=2;else{fprintf(out,"{\"phase\":\"%s\",\"sequence\":%lu,\"bike\":%lu,\"stack\":[",match==9?"heading-override":"steering-difference",frame,bike);for(unsigned j=0;j<42;j++)fprintf(out,"%s%lu",j?",":"",stack[j]);fprintf(out,"]}\n");}}
    else if(match>=7){DWORD stack[42],flag=0;if(!readmem(c.Esp,stack,sizeof stack)||!readmem(bike+0xb48,&flag,4))done=2;else{fprintf(out,"{\"phase\":\"scan-%s\",\"sequence\":%lu,\"bike\":%lu,\"flag\":%lu,\"ebx\":%lu,\"ebp\":%lu,\"esi\":%lu,\"stack\":[",match==7?"before":"after",frame,bike,flag,c.Ebx,c.Ebp,c.Esi);for(unsigned j=0;j<42;j++)fprintf(out,"%s%lu",j?",":"",stack[j]);fprintf(out,"]}\n");}}
    else if(match>=4){DWORD words[5],other=c.Esi,record=match==4?c.Esp+0x14:match==5?c.Ebx:c.Esi;BYTE selfBytes[0xcc8],otherBytes[0xcc8];int ok=1;if(match!=4)ok=readmem(c.Ebp,&other,4);ok=ok&&readmem(record,words,sizeof words)&&readmem(bike,selfBytes,sizeof selfBytes)&&readmem(other,otherBytes,sizeof otherBytes);if(!ok)done=2;else{fprintf(out,"{\"phase\":\"avoidance\",\"sequence\":%lu,\"bike\":%lu,\"kind\":%d,\"other\":%lu,\"words\":[",frame,bike,match-4,other);for(unsigned j=0;j<5;j++)fprintf(out,"%s%lu",j?",":"",words[j]);fprintf(out,"],\"selfHex\":\"");for(unsigned j=0;j<sizeof selfBytes;j++)fprintf(out,"%02x",selfBytes[j]);fprintf(out,"\",\"otherHex\":\"");for(unsigned j=0;j<sizeof otherBytes;j++)fprintf(out,"%02x",otherBytes[j]);fprintf(out,"\"}\n");}}
    else if(match==3){DWORD offsets[]={0x60,0x14,0x1c,0x4c,0x54,0x88},words[6],lookahead;int ok=readmem(0x4e7238,&lookahead,4);for(unsigned j=0;j<6;j++)ok&=readmem(c.Esp+offsets[j],words+j,4);if(!ok)done=2;else{fprintf(out,"{\"phase\":\"guidance\",\"sequence\":%lu,\"bike\":%lu,\"lookaheadBits\":%lu,\"words\":[",frame,bike,lookahead);for(unsigned j=0;j<6;j++)fprintf(out,"%s%lu",j?",":"",words[j]);fprintf(out,"]}\n");}}
    else if(match==2){DWORD words[7]={c.Ebx,c.Ebp};int ok=readmem(bike+0xafc,words+2,4)&&readmem(bike+0xc3c,words+3,4)&&readmem(c.Esp+0x4c,words+4,4)&&readmem(c.Esp+0x28,words+5,4)&&readmem(c.Esp+0x3c,words+6,4);if(!ok)done=2;else{fprintf(out,"{\"phase\":\"target\",\"sequence\":%lu,\"bike\":%lu,\"words\":[",frame,bike);for(unsigned j=0;j<7;j++)fprintf(out,"%s%lu",j?",":"",words[j]);fprintf(out,"]}\n");}}
    else {
    if(!readmem(bike,bytes,sizeof bytes))done=2;
    else{
     DWORD args[2]={0};if(match==0&&!readmem(c.Esp,args,8))done=2;
     fprintf(out,"{\"phase\":\"%s\",\"sequence\":%lu,\"bike\":%lu,\"esp\":%lu,\"returnAddress\":%lu,\"dtBits\":%lu,\"hex\":\"",match?"after":"before",frame,bike,c.Esp,args[0],args[1]);
     for(unsigned j=0;j<sizeof bytes;j++)fprintf(out,"%02x",bytes[j]);fprintf(out,"\"}\n");
     if(bike==85947800&&match==0&&!route_captured){route_captured=1;DWORD count=*(DWORD*)(bytes+0xb00),table=*(DWORD*)(bytes+0xaf4),pointers[8192];
      if(count>8192||!count||!readmem(table,pointers,count*4))done=2;
      else{fprintf(out,"{\"phase\":\"route\",\"bike\":%lu,\"table\":%lu,\"nodes\":[",bike,table);for(unsigned j=0;j<count;j++){DWORD data[11];if(!readmem(pointers[j],data,44)){done=2;break;}fprintf(out,"%s{\"address\":%lu,\"words\":[",j?",":"",pointers[j]);for(unsigned k=0;k<11;k++)fprintf(out,"%s%lu",k?",":"",data[k]);fprintf(out,"]}");}fprintf(out,"]}\n");}
     }
     if(match==1&&bike==85947800)frame++;
     start=GetTickCount();
    }
    }
    if(!writebyte(addresses[match],instructions[match][0])){fprintf(stderr,"Cannot restore breakpoint\n");return fatal_stop();}armed[match]=0;c.Eip=addresses[match];c.EFlags|=0x100;c.ContextFlags=CONTEXT_CONTROL;
    if(!SetThreadContext(thread,&c)){fprintf(stderr,"Cannot restore stopped context\n");return fatal_stop();}CloseHandle(thread);pending=match;pending_thread=e.dwThreadId;
   }else if(code==EXCEPTION_SINGLE_STEP&&pending>=0&&e.dwThreadId==pending_thread){
    HANDLE thread=OpenThread(THREAD_GET_CONTEXT|THREAD_SET_CONTEXT,FALSE,e.dwThreadId);CONTEXT c={.ContextFlags=CONTEXT_CONTROL};if(!thread||!GetThreadContext(thread,&c))return fatal_stop();
    if(tracking){DWORD after=0;if(!readmem(scratch,&after,4))done=2;else fprintf(out,"{\"phase\":\"store-after\",\"frame\":%lu,\"instruction\":%lu,\"scratchAddress\":%lu,\"beforeBits\":%lu,\"scratchBits\":%lu}\n",frame,addresses[pending],scratch,tracked_before,after);tracking=0;}
    c.EFlags&=~0x100u;if(!SetThreadContext(thread,&c))return fatal_stop();CloseHandle(thread);
    if(frame>=limit||(pending==1&&frame>=64&&contact_changes&&trick_events))done=1;
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
 DebugActiveProcessStop(pid);fclose(out);CloseHandle(process);fprintf(stderr,"renderFrames=%lu status=%d contactChanges=%lu trickEvents=%lu\n",frame,done,contact_changes,trick_events);return done==1?0:4;
}
