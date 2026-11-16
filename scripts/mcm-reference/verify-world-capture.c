#define main unused_capture_main
#include "capture-bike.c"
#undef main
int main(int argc,char**argv){
 if(argc!=2&&argc!=3)return 2;DWORD pid=strtoul(argv[1],0,0);
 configure_world_entry_hooks();if(argc==3){if(!strcmp(argv[2],"camera"))hook_count=49;else if(!strcmp(argv[2],"renderer"))hook_count=52;else if(!strcmp(argv[2],"terrain-meshes"))hook_count=60;else if(!strcmp(argv[2],"marker-draw"))hook_count=61;else if(!strcmp(argv[2],"scene-tick"))hook_count=70;else if(!strcmp(argv[2],"application-frame"))hook_count=78;else return 2;}
 process=OpenProcess(PROCESS_QUERY_INFORMATION|PROCESS_VM_READ,FALSE,pid);if(!process)return 2;
 int clean=1;for(unsigned i=0;i<hook_count;i++){BYTE bytes[6];int restored=read_memory(addresses[i],bytes,lengths[i])&&!memcmp(bytes,expected[i],lengths[i]);fprintf(stdout,"%08lx restored=%d\n",addresses[i],restored);if(!restored)clean=0;}
 BOOL debugger=TRUE;if(!CheckRemoteDebuggerPresent(process,&debugger)||debugger)clean=0;
 fprintf(stdout,"debugger=%d clean=%d\n",debugger,clean);CloseHandle(process);return clean?0:1;
}
