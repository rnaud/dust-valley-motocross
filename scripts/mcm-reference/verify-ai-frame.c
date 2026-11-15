// Independent read-only verifier: default four sites, or six with "controller".
#define main capture_main
#include "capture-bike.c"
#undef main
int main(int argc,char **argv){
 if(argc!=2&&argc!=3)return 2;if(argc==3){if(strcmp(argv[2],"controller"))return 2;configure_ai_frame_hooks();}DWORD pid=strtoul(argv[1],NULL,0);
 process=OpenProcess(PROCESS_QUERY_INFORMATION|PROCESS_VM_READ,FALSE,pid);
 BOOL attached=FALSE;int bad=!process||!CheckRemoteDebuggerPresent(process,&attached)||attached;
 for(unsigned i=0;i<hook_count;i++){BYTE b[8];int ok=read_memory(addresses[i],b,lengths[i])&&!memcmp(b,expected[i],lengths[i]);printf("%08lx restored=%d\n",addresses[i],ok);bad|=!ok;}
 printf("debugger=%d clean=%d\n",attached,!bad);if(process)CloseHandle(process);return bad;
}
