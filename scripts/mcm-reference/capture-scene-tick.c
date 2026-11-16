// Read-only boundaries for the complete 481310 scene update. Later rows are
// assertions and external input observations, never restorable checkpoints.
static int capture_world_scene_tick;
static DWORD observed_world_scene,scene_tick_delta;
static FILE*world_scene_tick_out;
static int write_scene_tick(FILE*out,const char*phase,DWORD frame,DWORD delta,DWORD result){
 DWORD app,owner,camera,environment,shape=0,input,menu,control,paused,switchCamera,target=0,targetAi=0,targetEnabled=0;
 BYTE state[0x78];
 if(!read_memory(observed_world_scene,state,sizeof state)||!read_memory(0x4e4fb4,&app,4)||
    !read_memory(app+0x10,&input,4)||!read_memory(app+0x614,&menu,4)||!read_memory(app+0x618,&control,4)||!read_memory(control+0x38,&paused,4))return 0;
 memcpy(&owner,state+0x1c,4);memcpy(&environment,state+0x38,4);memcpy(&switchCamera,state+0x40,4);
 if(!read_memory(owner+0x2c,&camera,4)||(environment&&!read_memory(environment+0x6c,&shape,4)))return 0;
 if(switchCamera&&(!read_memory(switchCamera+0x1cc,&target,4)||(target&&(!read_memory(target+0x618,&targetAi,4)||!read_memory(target+0x4bc,&targetEnabled,4)))))return 0;
 fprintf(out,"{\"phase\":\"%s\",\"frame\":%lu,\"deltaBits\":%lu,\"result\":%lu,\"scene\":%lu,\"app\":%lu,\"input\":%lu,\"menu\":%lu,\"control\":%lu,\"timerPaused\":%lu,\"owner\":%lu,\"camera\":%lu,\"environment\":%lu,\"shape\":%lu,\"switchCamera\":%lu,\"switchTarget\":%lu,\"switchTargetAi\":%lu,\"switchTargetEnabled\":%lu,\"blocks\":[",phase,frame,delta,result,observed_world_scene,app,input,menu,control,paused,owner,camera,environment,shape,switchCamera,target,targetAi,targetEnabled);
 if(!draw_block(out,observed_world_scene,0x78))return 0;fprintf(out,",");if(!draw_block(out,owner,0x44))return 0;
 fprintf(out,",");if(!draw_block(out,camera,0x254))return 0;
 if(shape){fprintf(out,",");if(!draw_block(out,shape,0x3c))return 0;}
 fprintf(out,"]}\n");return !ferror(out)&&!fflush(out);
}
static int capture_initial_scene_tick(const char*dir,DWORD actor,DWORD delta){
 if(!read_memory(actor+0x18,&observed_world_scene,4))return 0;
 DWORD vtable,update;if(!read_memory(observed_world_scene,&vtable,4)||!read_memory(vtable+0x2c,&update,4)||update!=0x481310)return 0;
 char path[1024];snprintf(path,sizeof path,"%s\\world-scene-tick-initial.json",dir);FILE*out=fopen(path,"wx");if(!out)return 0;
 scene_tick_delta=delta;int ok=write_scene_tick(out,"world-entry",0,delta,0);if(fclose(out))ok=0;
 snprintf(path,sizeof path,"%s\\world-scene-tick-observations.jsonl",dir);world_scene_tick_out=fopen(path,"wx");return ok&&world_scene_tick_out;
}
static int trace_scene_tick(unsigned phase,CONTEXT*c){
 if(phase>=7){
  DWORD owner,caller=0;if(phase>8||!read_memory(observed_world_scene+0x1c,&owner,4))return 0;
  if(c->Ecx!=owner)return 1;
  if(!player_frame||(phase==7&&!read_memory(c->Esp,&caller,4)))return 0;
  return write_scene_tick(world_scene_tick_out,phase==7?"owner-entry":"owner-exit",player_frame-1,scene_tick_delta,phase==7?caller:c->Eax);
 }
 DWORD scene=phase==0?c->Ecx:c->Esi;if(scene!=observed_world_scene)return 1;
 if(phase==0&&!read_memory(c->Esp+4,&scene_tick_delta,4))return 0;
 const char*phases[]={"entry","input-off","input-on","before-children","after-children","menu-exit","timer-exit"};
 if(phase>=7)return 0;
 if(phase>=4&&!player_frame)return 0;
 return write_scene_tick(world_scene_tick_out,phases[phase],phase>=4?player_frame-1:player_frame,scene_tick_delta,c->Eax);
}
