// Read-only frame settings and reset action, exported at the checkpoint boundary.
// Does not add world/controller memory to the replay's restored local blocks.
#include "capture-frame-actions.c"
static int capture_mcm_frame_environment(HANDLE process,DWORD bike,const char*path,const char*id,DWORD frame,const char*boundary){
 CollisionWorldBlock blocks[COLLISION_BLOCK_LIMIT]={0};unsigned count=0;int ok=0;FILE*out=NULL;
 DWORD world,owner,controller,device;
 #define ENV_SAVE(A,N) do {if(!collision_save(process,blocks,&count,(A),(N)))goto done;}while(0)
 if(!collision_world_read(process,0x4e4fb4,&world,4)||!world||
    !collision_world_read(process,bike+0xc84,&owner,4)||!owner||
    !collision_world_read(process,bike+0x6e4,&controller,4))goto done;
 ENV_SAVE(0x4e4fb4,4);ENV_SAVE(world+0x1070,4);ENV_SAVE(owner+0x18bc,4);
 if(controller){
  ENV_SAVE(controller+0x24,4);
  if(!collision_world_read(process,controller+0x24,&device,4)||!device)goto done;
  // 0x4526d0(action=15, option=0, output=NULL) reads only this action flag.
  ENV_SAVE(device+0x288+15*20,4);
 }
 if(getenv("MCM_FRAME_INPUT")){
  DWORD steering_device;
  ENV_SAVE(world+0x12d4,4);ENV_SAVE(world+0x12e4,4);ENV_SAVE(world+0x12e8,4);ENV_SAVE(world+0x12fc,4);
  if(!collision_world_read(process,world+0x12e4,&steering_device,4))goto done;
  if(steering_device){ENV_SAVE(steering_device+0x30,4);ENV_SAVE(steering_device+0x5c,4);}
 }
 if(getenv("MCM_FRAME_ACTIONS")&&!capture_mcm_frame_actions(process,blocks,&count,controller))goto done;
 out=fopen(path,"wx");if(!out)goto done;
 fprintf(out,"{\"schemaVersion\":1,\"kind\":\"mcm-frame-environment-observation\",\"bikeAddress\":%lu,\"captureId\":\"%s\",\"captureBoundary\":\"%s\",\"playerFrame\":%lu,\"inputCaptured\":%s,\"blockCount\":%u,\"blocks\":[",bike,id,boundary,frame,getenv("MCM_FRAME_INPUT")?"true":"false",count);
 for(unsigned i=0;i<count;i++){CollisionWorldBlock*b=&blocks[i];fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",i?",":"",b->address,b->size);for(DWORD j=0;j<b->size;j++)fprintf(out,"%02x",b->bytes[j]);fprintf(out,"\"}");}
 fprintf(out,"],\"actionsCaptured\":%s}\n",getenv("MCM_FRAME_ACTIONS")?"true":"false");ok=!ferror(out);
 done:
 if(out&&fclose(out))ok=0;
 for(unsigned i=0;i<count;i++)free(blocks[i].bytes);
 if(!ok)fprintf(stderr,"Frame environment export failed (%lu).\n",GetLastError());
 return ok;
 #undef ENV_SAVE
}
