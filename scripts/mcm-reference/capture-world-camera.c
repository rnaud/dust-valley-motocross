static int capture_world_camera,world_camera_phase;
static DWORD world_camera_address,world_camera_frame;
static FILE*world_camera_out;
static int capture_initial_world_camera(const char*dir,DWORD camera,DWORD dt){
 char path[1024];snprintf(path,sizeof path,"%s\\world-camera-initial.json",dir);
 FILE*out=fopen(path,"wx");if(!out)return 0;
 int ok=capture_chase_memory(out,"world-entry",0,camera,dt);if(fclose(out))ok=0;if(!ok)return 0;
 world_camera_address=camera;snprintf(path,sizeof path,"%s\\world-camera-observations.jsonl",dir);
 world_camera_out=fopen(path,"wx");return world_camera_out!=NULL;
}
static int trace_world_camera(int phase,CONTEXT*c){
 if(c->Esi!=world_camera_address)return 1;
 if(!world_camera_out||phase!=world_camera_phase)return 0;
 if(phase==0)world_camera_frame=player_frame;
 if(!world_camera_frame||world_camera_frame!=player_frame)return 0;
 DWORD dt;if(!read_memory(c->Ebp+8,&dt,4))return 0;
 const char*names[]={"source-entry","fov-entry","updated"};
 if(!capture_chase_memory(world_camera_out,names[phase],world_camera_frame,c->Esi,dt))return 0;
 world_camera_phase=(phase+1)%3;return 1;
}
