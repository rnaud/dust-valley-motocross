// Independent read-only verifier: four sites by default, six with controller,
// eight with rider, nine with queries, eleven with scene, seventeen with substeps, nineteen with draws, twenty-two with pool, twenty-nine with dust, thirty-five with spray, thirty-eight with particle draw.
#define main capture_main
#include "capture-bike.c"
#undef main
int main(int argc,char **argv){
 if(argc!=2&&argc!=3)return 2;if(argc==3){if(!strcmp(argv[2],"particle-draw"))configure_ai_particle_draw_hooks();else if(!strcmp(argv[2],"spray"))configure_ai_spray_hooks();else if(!strcmp(argv[2],"dust"))configure_ai_dust_hooks();else if(!strcmp(argv[2],"pool"))configure_ai_pool_hooks();else if(!strcmp(argv[2],"draws"))configure_ai_draw_hooks();else if(!strcmp(argv[2],"substeps"))configure_ai_substep_hooks();else if(!strcmp(argv[2],"scene"))configure_ai_scene_hooks();else if(!strcmp(argv[2],"queries"))configure_ai_query_hooks();else if(!strcmp(argv[2],"rider"))configure_ai_rider_hooks();else if(!strcmp(argv[2],"controller"))configure_ai_frame_hooks();else return 2;}DWORD pid=strtoul(argv[1],NULL,0);
 process=OpenProcess(PROCESS_QUERY_INFORMATION|PROCESS_VM_READ,FALSE,pid);
 BOOL attached=FALSE;int bad=!process||!CheckRemoteDebuggerPresent(process,&attached)||attached;
 for(unsigned i=0;i<hook_count;i++){BYTE b[8];int ok=read_memory(addresses[i],b,lengths[i])&&!memcmp(b,expected[i],lengths[i]);printf("%08lx restored=%d\n",addresses[i],ok);bad|=!ok;}
 printf("debugger=%d clean=%d\n",attached,!bad);if(process)CloseHandle(process);return bad;
}
