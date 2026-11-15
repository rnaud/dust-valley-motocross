// Joined camera-controller observations with forty-four guarded, restored non-CALL breakpoints.
// No input, timing, timer or bike state is overwritten. Pin/verify the retail
// executable and Wine wined3d hashes before use. Context writes touch only EIP and trap flags.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static HANDLE process;
static DWORD addresses[]={0x47b107,0x47b1fe,0x47b3e7,0x47b452,0x47b4e5,0x47b52a,0x47c30c,0x47d606,0x47d71f,0x47d945,0x47d9f4,0x47db8f,0x47dbd1,0x47dbdc,0x479de0,0x479e1f,0x479e2f,0x479e34,0x4a54b6,0x7a93103a,0x7a931042,0x7a83308b,0x43e660,0x43e6c0,0x43e69b,0x43e707,0x445870,0x4458ea,0x7a964500,0x43ec50,0x43ec70,0x7a92d500,0x7a92ffe3,0x7a9304dd,0x7a9304f6,0x7a9645ee,0x7a96462f,0x4465b0,0x4465cc,0x446608,0x44faf0,0x44ff95,0x44feec,0x47e8a0};
static BYTE instructions[][8]={{0x8b,0x8e,0xec,0x01,0,0},{0x8b,0x86,0x38,0x02,0,0},{0x8b,0x86,0xf4,0x01,0,0},{0x8b,0x86,0x04,0x02,0,0},{0x8b,0x86,0xf4,0x01,0,0},{0x33,0xff,0x8b,0x85,0x6c,0xff,0xff,0xff},{0x8b,0x8e,0xf4,0x01,0,0},{0x8b,0x86,0xf8,0x01,0,0},{0xa1,0xb4,0x4f,0x4e,0},{0x8b,0x85,0x6c,0xff,0xff,0xff},{0x8b,0x86,0xf4,0x01,0,0},{0x8b,0x86,0x00,0x02,0,0},{0x8b,0x45,0x08},{0xeb,0x28},{0x53},{0x83,0xc6,0x30},{0x8b,0x18},{0xb8,1,0,0,0},{0xd9,0x86,0xc8,8,0,0},{0x89,0x3c,0x24},{0x8b,0x45,0x0c},{0x0f,0x17,0x60,0x08},{0x53},{0x81,0xec,0x88,0,0,0},{0x51},{0x51},{0x81,0xec,0xe0,0,0,0},{0x50},{0x55},{0x53},{0x51},{0x55},{0xa8,0x02},{0x8b,0x45,0x0c},{0x8d,0x65,0xf4},{0x8d,0x65,0xf4},{0x8d,0x65,0xf4},{0x56},{0x5e},{0x5e},{0x81,0xec,0xd8,0,0,0},{0x5d},{0x85,0xc0},{0x81,0xec,0xf0,0,0,0}};
static unsigned lengths[]={6,6,6,6,6,8,6,6,5,6,6,6,3,2,1,3,2,5,6,3,3,4,1,6,1,1,6,1,1,1,1,1,2,3,3,3,3,1,1,1,6,1,2,6};
static const char*phases[]={"source-entry","source-exit","restore-entry","base-entry","base-exit","controls-entry","before","after","post","clearance","finalized","fov-entry","fov","updated","submit-entry","submit-view","submit-projection","submit-exit","bike-entry","product-before","product-after","product-store","fog-entry","fog-render-entry","fog-submit","fog-render-submit","world-entry","world-submit","wine-transform","fog-reset-entry","fog-reset-submit","apply-entry","apply-gate","apply-cleared","apply-exit","dirty-set-exit","dirty-set-exit","node-entry","node-hidden-exit","node-exit","wrapper-entry","wrapper-exit","wrapper-cull","bounds-entry"};
#define HOOK_COUNT 44
static int armed[HOOK_COUNT];
static int readmem(DWORD a,void*b,SIZE_T n);
static DWORD player_address;
static DWORD scratch_address,submission_camera,product_address;static int store_tracking;
static int dirty(FILE*out,const char*phase,DWORD frame,CONTEXT*c,DWORD state,DWORD type,DWORD destination){
 DWORD flags=0,blend=0;
 if(!readmem(state+0x108,&flags,4)||!readmem(state+0x2540,&blend,4))return 0;
 fprintf(out,"{\"phase\":\"%s\",\"frame\":%lu,\"stateblock\":%lu,\"flags\":%lu,\"blend\":%lu,\"type\":%lu,\"esp\":%lu,\"destination\":%lu,\"scratchAddress\":%lu}\n",phase,frame,state,flags,blend,type,c->Esp,destination,scratch_address);return 1;
}
static int extra(FILE*out,int match,DWORD frame,CONTEXT*c){
 if(match==40){
  DWORD node=0,owner=0,camera=0,words[42]={0};
  if(!readmem(c->Ecx+0x30,&node,4)||!readmem(c->Ecx+0x1c,&owner,4)||!readmem(owner+0x2c,&camera,4)||!readmem(node+0x84,words,64)||!readmem(camera+0xb0,words+16,64)||!readmem(c->Ecx-0x404+0x218,words+32,24)||!readmem(camera+0x178,words+38,16))return 0;
  fprintf(out,"{\"phase\":\"wrapper-inputs\",\"frame\":%lu,\"object\":%lu,\"node\":%lu,\"camera\":%lu,\"words\":[",frame,c->Ecx,node,camera);for(int i=0;i<42;i++)fprintf(out,"%s%lu",i?",":"",words[i]);fprintf(out,"]}\n");
 }

 if(match==43){
  DWORD args[7]={0},words[32]={0};if(!readmem(c->Esp,args,28))return 0;if(args[0]!=0x44feec)return 1;
  if(!args[5]||args[6]||!readmem(args[2],words,64)||!readmem(args[3],words+16,12)||!readmem(args[4],words+19,12)||!readmem(args[1]+0x178,words+22,16)||!readmem(args[5],words+26,16))return 0;
  fprintf(out,"{\"phase\":\"bounds-entry\",\"frame\":%lu,\"camera\":%lu,\"rectAddress\":%lu,\"words\":[",frame,args[1],args[5]);for(int i=0;i<30;i++)fprintf(out,"%s%lu",i?",":"",words[i]);fprintf(out,"]}\n");return 1;
 }
 if(match==42){
  DWORD corners[32];for(int i=0;i<8;i++)if(!readmem(0x51ede0+i*32,corners+i*4,16))return 0;
  fprintf(out,"{\"phase\":\"bounds-exit\",\"frame\":%lu,\"result\":%lu,\"words\":[",frame,c->Eax);for(int i=0;i<32;i++)fprintf(out,"%s%lu",i?",":"",corners[i]);fprintf(out,"]}\n");
 }

 if(match>=40){
  DWORD object=match==40?c->Ecx:c->Ebx,node=0,caller=0,fields[8]={0};
  if(!readmem(object+0x30,&node,4)||!readmem(match==40?c->Esp:c->Esp+0xe8,&caller,4)||!readmem(object+0x84,fields,16)||!readmem(object+0xa0,fields+4,4)||!readmem(object+0xb4,fields+5,4))return 0;
  fprintf(out,"{\"phase\":\"%s\",\"frame\":%lu,\"object\":%lu,\"actor\":%lu,\"node\":%lu,\"caller\":%lu,\"esp\":%lu,\"result\":%lu,\"fields\":[%lu,%lu,%lu,%lu,%lu,%lu]}\n",phases[match],frame,object,object-0x404,node,caller,c->Esp,c->Eax,fields[0],fields[1],fields[2],fields[3],fields[4],fields[5]);return 1;
 }

 if(match>=37){
  DWORD object=match==37?c->Ecx:c->Esi,fields[5]={0},caller=0,bikeNode=0,rider=0,riderNode=0;
  if(!readmem(object,fields,4)||!readmem(object+0x12c,fields+1,4)||!readmem(object+0x180,fields+2,4)||!readmem(object+0x18c,fields+3,8)||!readmem(match==37?c->Esp:c->Esp+4,&caller,4))return 0;
  if(player_address&&(!readmem(player_address+0x434,&bikeNode,4)||!readmem(player_address+0xc8c,&rider,4)||!readmem(rider+0x434,&riderNode,4)))return 0;
  fprintf(out,"{\"phase\":\"%s\",\"frame\":%lu,\"object\":%lu,\"esp\":%lu,\"caller\":%lu,\"player\":%lu,\"bikeNode\":%lu,\"riderNode\":%lu,\"fields\":[%lu,%lu,%lu,%lu,%lu]}\n",phases[match],frame,object,c->Esp,caller,player_address,bikeNode,riderNode,fields[0],fields[1],fields[2],fields[3],fields[4]);return 1;
 }

 if(match>=31){
  DWORD state=0;if(match>=35)state=c->Esi;else if(!readmem(match==31?c->Esp+8:c->Ebp+12,&state,4))return 0;
  return dirty(out,phases[match],frame,c,state,match>=35?c->Edi:0,0);
 }
 if(match==28){DWORD args[3];if(!readmem(c->Esp+4,args,12)||!dirty(out,"dirty-set-entry",frame,c,args[0],args[1],0))return 0;}
 if(match==19){DWORD state=0;if(!readmem(c->Ebp+12,&state,4)||!dirty(out,"apply-product",frame,c,state,0,c->Esi))return 0;}

 if(match>=22){
  DWORD object=0,camera=0,owner=0,fields[8]={0},matrix[16]={0},args[4]={0},callers[6]={0},depth=0;
  if(match==28){
   if(!readmem(c->Esp,args,16)||!readmem(args[3],matrix,64))return 0;
   DWORD fp=c->Ebp,link[2];while(depth<6&&fp>=0x220000&&fp<0x230000&&readmem(fp,link,8)){callers[depth++]=link[1];if(link[0]<=fp)break;fp=link[0];}
  }else if(match<=25||match>=29){
   object=match<=23||match==29?c->Ecx:c->Esi;
   if(!readmem(object+0x1c,&owner,4)||!readmem(owner+0x2c,&camera,4)||!readmem(object+0x20,fields,4)||!readmem(object+0x38,fields+1,4)||!readmem(camera+0x1a8,fields+2,8))return 0;
   if(match==24||match==25||match==30){if(!readmem(c->Esp,args,8)||!readmem(args[1],matrix,64))return 0;}
  }else {
   object=match==26?c->Ecx:c->Esi;
   if(!readmem(0x4e4afc,fields,4)||!readmem(object+0x180,fields+1,4)||!readmem(object+0x12c,fields+2,4)||!readmem(object+0x18c,fields+3,4)||!readmem(object+0x190,fields+4,4)||!readmem(object+0x11c,fields+5,4)||!readmem(object+0x234,fields+6,4))return 0;
   if(fields[6]&&!readmem(fields[6]+fields[5]*8,fields+7,4))return 0;
   if(match==27&&(!readmem(c->Esp,args,8)||!readmem(args[1],matrix,64)))return 0;
  }
  fprintf(out,"{\"phase\":\"%s\",\"frame\":%lu,\"object\":%lu,\"camera\":%lu,\"esp\":%lu,\"fields\":[",phases[match],frame,object,camera,c->Esp);
  for(unsigned i=0;i<8;i++){fprintf(out,"%s%lu",i?",":"",fields[i]);}fprintf(out,"],\"args\":[");for(unsigned i=0;i<4;i++){fprintf(out,"%s%lu",i?",":"",args[i]);}fprintf(out,"],\"callers\":[");for(DWORD i=0;i<depth;i++){fprintf(out,"%s%lu",i?",":"",callers[i]);}fprintf(out,"],\"words\":[");for(unsigned i=0;i<16;i++){fprintf(out,"%s%lu",i?",":"",matrix[i]);}fprintf(out,"]}\n");return 1;
 }
 if(match>=19){
  DWORD words[32]={0},count=0,scratch=0;
  if(match==19){product_address=c->Esi+8==scratch_address?c->Esi:0;if(!product_address)return 1;count=32;if(!readmem(c->Edi+0x2c94,words,64)||!readmem(c->Edi+0x6c14,words+16,64))return 0;}
  else if(match==20){if(!product_address)return 1;count=16;if(!readmem(product_address,words,64))return 0;}
  else {store_tracking=scratch_address&&c->Eax+8==scratch_address;if(!store_tracking)return 1;}
  if(!readmem(scratch_address,&scratch,4))return 0;
  fprintf(out,"{\"phase\":\"%s\",\"frame\":%lu,\"destination\":%lu,\"scratchAddress\":%lu,\"scratchBits\":%lu,\"words\":[",phases[match],frame,match==21?c->Eax:product_address,scratch_address,scratch);
  for(DWORD i=0;i<count;i++){fprintf(out,"%s%lu",i?",":"",words[i]);}fprintf(out,"]}\n");return 1;
 }
 DWORD scratch=0,camera=0,owner=0,active=0,args[3]={0},matrix[16]={0},byte=0,counter=0,planes[2]={0};
 if(match==18){DWORD ai=0;if(!readmem(c->Esi+0x614,&ai,4))return 0;if(ai)return 1;scratch_address=c->Esp+0x54;}
 else {camera=match==14?c->Ecx:match==15?c->Esi:match==16?c->Esi-0x30:submission_camera;if(match==14)submission_camera=camera;
  if(!camera||!readmem(camera+0x1c,&owner,4)||!readmem(owner+0x2c,&active,4)||!readmem(camera+0x1b0,&byte,1)||!readmem(camera+0x1bc,&counter,4)||!readmem(camera+0x1a8,planes,8))return 0;
  if((match==15||match==16)&&(!readmem(c->Esp,args,12)||!readmem(args[2],matrix,64)))return 0;
 }
 if(scratch_address&&!readmem(scratch_address,&scratch,4))return 0;
 fprintf(out,"{\"phase\":\"%s\",\"frame\":%lu,\"camera\":%lu,\"esp\":%lu,\"scratchAddress\":%lu,\"scratchBits\":%lu,\"activeCamera\":%lu,\"refreshByte\":%lu,\"refreshCounter\":%lu,\"planes\":[%lu,%lu],\"args\":[%lu,%lu,%lu],\"words\":[",phases[match],frame,camera,c->Esp,scratch_address,scratch,active,byte,counter,planes[0],planes[1],args[0],args[1],args[2]);
 for(unsigned i=0;i<16;i++){fprintf(out,"%s%lu",i?",":"",matrix[i]);}fprintf(out,"]}\n");return 1;
}

// If execution context cannot be restored, do not detach with live INT3/TF state.
static int fatal_stop(void){fprintf(stderr,"Unrecoverable debugger cleanup; stopping reference to avoid executing armed hooks\n");TerminateProcess(process,5);return 5;}
static int readmem(DWORD a,void*b,SIZE_T n){SIZE_T got;return ReadProcessMemory(process,(void*)(uintptr_t)a,b,n,&got)&&got==n;}
static int writebyte(DWORD a,BYTE b){SIZE_T n;return WriteProcessMemory(process,(void*)(uintptr_t)a,&b,1,&n)&&n==1&&FlushInstructionCache(process,(void*)(uintptr_t)a,1);}
int main(int argc,char**argv){
 if(argc!=4)return 2;
 DWORD pid=strtoul(argv[1],0,0),limit=strtoul(argv[3],0,0);if(!pid||!limit||limit>10000)return 2;
 process=OpenProcess(PROCESS_ALL_ACCESS,FALSE,pid);if(!process)return 2;
 DWORD pe=0,stamp=0,size=0;
 if(!readmem(0x7a77003c,&pe,4)||pe>4096||!readmem(0x7a770000+pe+8,&stamp,4)||!readmem(0x7a770000+pe+24+56,&size,4)||stamp!=0x69e0eabb||size!=0x308000){fprintf(stderr,"Pinned Wine module metadata guard failed\n");CloseHandle(process);return 2;}
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
    if(match>=14){if(!extra(out,match,frame,&c))done=2;else start=GetTickCount();}else {
    DWORD inputs[102]={0},actor=0,player=0;
    DWORD pointers[6]={0},records[24]={0},targets[6]={0},result[6]={0},groundPoint[3]={0},matrices[65]={0},cameraPose[13]={0},nodeVisibility[18]={0},dt=0;
    const unsigned offsets[6]={0x4c,0x48,0x44,0x34,0x30,0x2c};
    if(!readmem(c.Esi+0x210,pointers,24)||!readmem(c.Ebp+8,&dt,4)||!readmem(c.Esi+0x22c,result,12)||!readmem(c.Ebp-0x7c,result+3,12))done=2;
    for(unsigned j=0;j<6;j++)if(!readmem(pointers[j],records+j*4,16)||!readmem(c.Ebp-offsets[j],targets+j,4))done=2;
    if(!readmem(c.Ebp-0x64,inputs,12)||!readmem(c.Ebp-0x40,inputs+3,12)||!readmem(c.Ebp-0x34,inputs+6,12)||!readmem(c.Ebp-0x10,inputs+9,4)||!readmem(c.Esi+0x1d4,inputs+10,4)||!readmem(c.Esi+0x1f4,inputs+11,4)||!readmem(c.Esi+0x1f0,&actor,4)||!readmem(actor+0x954,inputs+12,4))done=2;
    if(!readmem(c.Ebp-0x58,inputs+13,12)||!readmem(c.Ebp-0x28,inputs+16,4)||!readmem(c.Esi+0x1ec,&player,4)||!readmem(player+0x4ec,inputs+17,4)||!readmem(player+0x4dc,inputs+18,4)||!readmem(c.Ebp-0x80,inputs+19,4)||!readmem(0x51edb0,inputs+20,12))done=2;
    player_address=player;inputs[30]=c.Ebx;inputs[31]=c.Edi;
    if(!readmem(c.Esi+0x1d8,inputs+23,4)||!readmem(c.Esi+0x1cc,inputs+24,4)||!readmem(c.Ebp-0x98,inputs+25,4)||!readmem(c.Esi+0x1e0,inputs+26,4)||!readmem(c.Esi+0x1e8,inputs+27,4)||!readmem(c.Esi+0x20c,inputs+28,4)||!readmem(player+0x560,inputs+29,4)||!readmem(player+0x844,inputs+32,4)||!readmem(c.Esi+0x23c,inputs+33,12))done=2;
    if(!readmem(player+0x510,inputs+36,12)||!readmem(player+0x5ec,inputs+39,4)||!readmem(player+0x6a4,inputs+40,4)||!readmem(c.Ebp-0x88,inputs+41,4))done=2;
    DWORD manager=0,rider=0;
    if(!readmem(0x4e4fb4,&manager,4)||!readmem(player+0x874,&rider,4)||!readmem(player+0x6b0,inputs+42,4)||!readmem(player+0xbfc,inputs+43,4)||!readmem(manager+0x314,inputs+44,4)||!readmem(player+0x8b4,inputs+45,4)||!readmem(rider+0x144,inputs+46,4)||!readmem(rider+0x170,inputs+47,4)||!readmem(rider+0x140,inputs+48,4))done=2;
    if(!readmem(c.Esi+0x200,inputs+49,4)||!readmem(manager+0xe40,inputs+50,16))done=2;
    DWORD node=0;
    if(!readmem(player+0x4c0,inputs+54,12)||!readmem(player+0x620,inputs+57,4)||!readmem(player+0x434,&node,4)||!readmem(node+0xb4,inputs+58,12)||!readmem(c.Esi+0x204,inputs+61,4))done=2;
    DWORD devices=0,keyboard=0,joystick=0;
    if(!readmem(c.Ebp-0x94,inputs+62,4)||!readmem(c.Esi+0x13c,inputs+63,4)||!readmem(manager+0x10,&devices,4)||!readmem(devices+0x24,&keyboard,4)||!readmem(devices+0xc,&joystick,4))done=2;
    const unsigned keys[]={0x48,0x50,0x4b,0x4d,0x4a,0x0c,0x4e,0x0d};
    for(unsigned j=0;j<8;j++){DWORD key=0;if(!readmem(keyboard+0x288+keys[j]*20,&key,4))done=2;if(key==1)inputs[64]|=1u<<j;}
    inputs[65]=!!joystick;
    if(joystick&&(!readmem(joystick+0x594,inputs+66,4)||!readmem(joystick+0x584,inputs+67,4)||!readmem(joystick+0x2a0+2*20,inputs+68,4)||!readmem(joystick+0x2a0+3*20,inputs+69,4)))done=2;
    if(!readmem(keyboard+0x4cc,inputs+70,4)||!readmem(keyboard+0xecc,inputs+71,4)||!readmem(c.Esi+0x208,inputs+72,4)||!readmem(c.Esi+0x24c,inputs+73,4))done=2;
    if(!readmem(c.Esi+0x238,inputs+74,4)||!readmem(c.Esi+0x1f8,inputs+75,4))done=2;
    if(!readmem(manager+0x1072,inputs+76,2)||!readmem(manager+0x724,inputs+77,4)||!readmem(c.Esi+0x250,inputs+78,4)||!readmem(manager+0x117f,inputs+79,16)||!readmem(actor+0x44,inputs+83,4)||!readmem(actor+0x40,inputs+84,4)||!readmem(actor+0xa04,inputs+85,4)||!readmem(c.Ebp-0xbc,groundPoint,12))done=2;
    DWORD cameraOwner=0,renderRider=0,riderNode=0;
    if(!readmem(player+0x4e8,inputs+86,4)||!readmem(player+0x4d8,inputs+87,4)||!readmem(c.Esi+0x140,inputs+88,4)||!readmem(c.Esi+0x1c,&cameraOwner,4)||!readmem(cameraOwner+0x38,inputs+89,4)||!readmem(c.Esi+0x144,cameraPose,40)||!readmem(c.Esi+0x1c4,cameraPose+10,8)||!readmem(c.Esi+0x1bc,cameraPose+12,4))done=2;
    if(!readmem(player+0xc8c,&renderRider,4)||!readmem(renderRider+0x434,&riderNode,4)||!readmem(node+0x12c,nodeVisibility,4)||!readmem(node+0x240,nodeVisibility+1,32)||!readmem(riderNode+0x12c,nodeVisibility+9,4)||!readmem(riderNode+0x240,nodeVisibility+10,32))done=2;
    DWORD fovPointer=0;BYTE refreshByte=0;
    if(!readmem(c.Esi+0x13c,inputs+90,4)||!readmem(c.Esi+0x28,inputs+91,4)||!readmem(c.Esi+0x1b0,&refreshByte,1)||!readmem(c.Esi+0x228,&fovPointer,4)||!readmem(fovPointer,inputs+94,16))done=2;
    inputs[92]=refreshByte;inputs[93]=fovPointer;
    if(!readmem(c.Esi+0x1a8,inputs+98,8)||!readmem(c.Esi+0x170,inputs+100,4)||!readmem(c.Esi+0x180,inputs+101,4)||!readmem(c.Esi+0x30,matrices,256)||!readmem(c.Esi+0x16c,matrices+64,4))done=2;
    if(!done){fprintf(out,"{\"phase\":\"%s\",\"frame\":%lu,\"camera\":%lu,\"esp\":%lu,\"ebp\":%lu,\"deltaBits\":%lu",phases[match],frame,c.Esi,c.Esp,c.Ebp,dt);
     const char*names[9]={"pointers","filters","targets","result","inputs","groundPoint","cameraPose","nodeVisibility","matrices"};DWORD*data[9]={pointers,records,targets,result,inputs,groundPoint,cameraPose,nodeVisibility,matrices};unsigned sizes[9]={6,24,6,6,102,3,13,18,65};
     for(unsigned j=0;j<9;j++){fprintf(out,",\"%s\":[",names[j]);for(unsigned k=0;k<sizes[j];k++)fprintf(out,"%s%lu",k?",":"",data[j][k]);fprintf(out,"]");}fprintf(out,"}\n");start=GetTickCount();if(match==13)frame++;
    }
    }
    if(!writebyte(addresses[match],instructions[match][0])){fprintf(stderr,"Cannot restore breakpoint\n");return fatal_stop();}armed[match]=0;c.Eip=addresses[match];c.EFlags|=0x100;c.ContextFlags=CONTEXT_CONTROL;
    if(!SetThreadContext(thread,&c)){fprintf(stderr,"Cannot restore stopped context\n");return fatal_stop();}CloseHandle(thread);pending=match;pending_thread=e.dwThreadId;
   }else if(code==EXCEPTION_SINGLE_STEP&&pending>=0&&e.dwThreadId==pending_thread){
    HANDLE thread=OpenThread(THREAD_GET_CONTEXT|THREAD_SET_CONTEXT,FALSE,e.dwThreadId);CONTEXT c={.ContextFlags=CONTEXT_CONTROL};if(!thread||!GetThreadContext(thread,&c))return fatal_stop();
    if(store_tracking&&pending==21){DWORD word=0;if(!readmem(scratch_address,&word,4))done=2;else fprintf(out,"{\"phase\":\"scratch-store\",\"frame\":%lu,\"scratchAddress\":%lu,\"scratchBits\":%lu}\n",frame,scratch_address,word);store_tracking=0;}
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
