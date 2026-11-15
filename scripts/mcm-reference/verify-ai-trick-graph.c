#define main capture_main
#include "capture-ai-trick-graph.c"
#undef main
int main(int argc,char **argv){if(argc!=2){fprintf(stderr,"Usage: verify-render-heap.exe PID\n");return 2;}DWORD pid=strtoul(argv[1],NULL,0);if(!pid)return 2;process=OpenProcess(PROCESS_QUERY_INFORMATION|PROCESS_VM_READ,FALSE,pid);BOOL attached=FALSE;int bad=!process||!CheckRemoteDebuggerPresent(process,&attached)||attached;for(unsigned i=0;i<sizeof(addresses)/sizeof(addresses[0]);i++){BYTE b[8];int ok=readmem(addresses[i],b,lengths[i])&&!memcmp(b,instructions[i],lengths[i]);printf("%08lx restored=%d\n",addresses[i],ok);bad|=!ok;}printf("debugger=%d clean=%d\n",attached,!bad);if(process)CloseHandle(process);return bad;}
