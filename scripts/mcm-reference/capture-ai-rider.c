// Embedded read-only rider observations. The initial record shares the bike's
// atomic entry boundary. Later records supply assertions and real scheduling,
// never a checkpoint restoration or a forced rider timestep.
#include "capture-particle-pool.c"
static int trace_ai_scene(const char*phase,DWORD point){
 DWORD link,view,world,gate,bike,enabled,disabled,excluded,position[3]={0};
 if(!read_memory(ai_scene_object+0x1c,&link,4)||!read_memory(link+4,&view,4)||!read_memory(view+0x110,&enabled,4)||
    !read_memory(ai_scene_object+0xf8,&world,4)||!read_memory(world+0x48,&gate,4)||!read_memory(gate+0x20,&disabled,4)||
    !read_memory(ai_scene_object+0xec,&bike,4)||bike!=observe_ai||!read_memory(bike+0xc30,&excluded,4)||
    (point&&!read_memory(point,position,sizeof position)))return 0;
 fprintf(ai_rider_out,"{\"phase\":\"%s\",\"captureId\":\"%s\",\"eventSequence\":%lu,\"completedBikeFrames\":%lu,\"bikeActive\":%d,\"riderActive\":%d,\"address\":%lu,\"bike\":%lu,\"enabled\":%lu,\"disabled\":%lu,\"excluded\":%lu,\"positionBits\":[%lu,%lu,%lu]}\n",phase,frame_capture_id,ai_rider_sequence++,player_frame,player_active,ai_rider_active,ai_scene_object,bike,enabled,disabled,excluded,position[0],position[1],position[2]);
 return !ferror(ai_rider_out)&&fflush(ai_rider_out)==0;
}
static int trace_ai_rider(const char*phase,DWORD rider,DWORD dt){
 DWORD bike,child,world,paused,globalDt,link,owner,gate=0,vtable,update,pool,proxy;
 BYTE state[0x3ac],bytes[0x618];
 if(!read_memory(rider+0x15c,&bike,4)||bike!=observe_ai||!read_memory(rider,state,sizeof state)||
    !read_memory(rider+0x14,&child,4)||!child||!read_memory(child,bytes,sizeof bytes)||
    !read_memory(0x4e4fb4,&world,4)||!read_memory(world+0x132c,&paused,4)||!read_memory(0x4edec4,&globalDt,4)||
    !read_memory(rider+0x1c,&link,4)||!read_memory(child,&vtable,4)||!read_memory(vtable+0x2c,&update,4)||
    !read_memory(child+0x34,&pool,4)||!read_memory(bike+0xc8c,&proxy,4))return 0;
 if(link&&(!read_memory(link,&owner,4)||!read_memory(owner+0x35c,&gate,4)))return 0;
 if(!ai_rider_out){ai_rider_out=fopen(getenv("MCM_AI_RIDER_TRACE"),"wx");if(!ai_rider_out)return 0;}
 FILE*out=ai_rider_out;
 fprintf(out,"{\"phase\":\"%s\",\"captureId\":\"%s\",\"eventSequence\":%lu,\"completedBikeFrames\":%lu,\"bikeActive\":%d,\"bike\":%lu,\"rider\":%lu,\"address\":%lu,\"paused\":%lu,\"globalDtBits\":%lu,\"dtBits\":%lu,\"ownerGate\":%lu,\"updateAddress\":%lu,\"hex\":\"",phase,frame_capture_id,ai_rider_sequence++,player_frame,player_active,bike,rider,child,paused,globalDt,dt,gate,update);
 for(unsigned i=0;i<sizeof bytes;i++)fprintf(out,"%02x",bytes[i]);
 fprintf(out,"\",\"riderHex\":\"");for(unsigned i=0;i<sizeof state;i++)fprintf(out,"%02x",state[i]);fprintf(out,"\"");
 if(!capture_retained_particle_pool(out,pool)||!observe_rider_collision(out,rider))return 0;
 if(capture_ai_spray&&!strcmp(phase,"initial-rider")){
  DWORD spray;BYTE full[0x614];
  if(!read_memory(bike+0xc98,&spray,4)||!read_memory(spray,full,sizeof full))return 0;
  fprintf(out,",\"sprayAddress\":%lu,\"sprayHex\":\"",spray);
  for(unsigned i=0;i<sizeof full;i++)fprintf(out,"%02x",full[i]);fprintf(out,"\"");
 }
 fprintf(out,",\"visualState\":[");unsigned count=0;
 for(unsigned i=0;i<block_count;i++){
  const Block*b=&blocks[i];if(b->size!=0x114&&b->address!=proxy)continue;
  BYTE data[0x438];if(b->size>sizeof data||!read_memory(b->address,data,b->size))return 0;
  fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",count++?",":"",b->address,b->size);
  for(DWORD j=0;j<b->size;j++)fprintf(out,"%02x",data[j]);fprintf(out,"\"}");
 }
 fprintf(out,"]}\n");return !ferror(out)&&fflush(out)==0;
}

// Actual shared-pool scheduling, kept in the same event sequence as rider and
// transform queries. No assumed relationship to bike or rider delta.
static int trace_ai_pool(const char*phase){
 DWORD world,paused;
 if(!ai_rider_out||!read_memory(0x4e4fb4,&world,4)||!read_memory(world+0x132c,&paused,4))return 0;
 fprintf(ai_rider_out,"{\"phase\":\"%s\",\"captureId\":\"%s\",\"eventSequence\":%lu,\"completedBikeFrames\":%lu,\"bikeActive\":%d,\"riderActive\":%d,\"paused\":%lu,\"dtBits\":%lu",phase,frame_capture_id,ai_rider_sequence++,player_frame,player_active,ai_rider_active,paused,ai_pool_dt);
 if(!capture_retained_particle_pool(ai_rider_out,retained_pool_address))return 0;
 fprintf(ai_rider_out,"}\n");return !ferror(ai_rider_out)&&fflush(ai_rider_out)==0;
}

static int trace_ai_dust(const char*phase){
 DWORD world,paused,pool;BYTE emitter[0x84];
 if(!ai_rider_out||!read_memory(0x4e4fb4,&world,4)||!read_memory(world+0x132c,&paused,4)||!read_memory(ai_dust_address,emitter,sizeof emitter))return 0;
 memcpy(&pool,emitter+0x34,4);if(pool!=retained_pool_address)return 0;
 fprintf(ai_rider_out,"{\"phase\":\"%s\",\"captureId\":\"%s\",\"eventSequence\":%lu,\"completedBikeFrames\":%lu,\"bikeActive\":%d,\"riderActive\":%d,\"emitter\":%lu,\"paused\":%lu,\"dtBits\":%lu,\"emitterHex\":\"",phase,frame_capture_id,ai_rider_sequence++,player_frame,player_active,ai_rider_active,ai_dust_address,paused,ai_dust_dt);
 for(unsigned i=0;i<sizeof emitter;i++)fprintf(ai_rider_out,"%02x",emitter[i]);fprintf(ai_rider_out,"\"");
 if(!capture_retained_particle_pool(ai_rider_out,pool))return 0;
 fprintf(ai_rider_out,"}\n");return !ferror(ai_rider_out)&&fflush(ai_rider_out)==0;
}

static int trace_ai_spray(const char*phase){
 DWORD world,paused,pool;BYTE emitter[0x614];
 if(!ai_rider_out||!read_memory(0x4e4fb4,&world,4)||!read_memory(world+0x132c,&paused,4)||!read_memory(ai_spray_address,emitter,sizeof emitter))return 0;
 memcpy(&pool,emitter+0x34,4);if(pool!=retained_pool_address)return 0;
 fprintf(ai_rider_out,"{\"phase\":\"%s\",\"captureId\":\"%s\",\"eventSequence\":%lu,\"completedBikeFrames\":%lu,\"bikeActive\":%d,\"riderActive\":%d,\"emitter\":%lu,\"paused\":%lu,\"dtBits\":%lu,\"emitterHex\":\"",phase,frame_capture_id,ai_rider_sequence++,player_frame,player_active,ai_rider_active,ai_spray_address,paused,ai_spray_dt);
 for(unsigned i=0;i<sizeof emitter;i++)fprintf(ai_rider_out,"%02x",emitter[i]);fprintf(ai_rider_out,"\"");
 if(!capture_retained_particle_pool(ai_rider_out,pool))return 0;
 fprintf(ai_rider_out,"}\n");return !ferror(ai_rider_out)&&fflush(ai_rider_out)==0;
}

static int trace_ai_particle_draw(const char*phase){
 DWORD link,camera,scale,width,height,input,projected,count,yOffset;
 static BYTE inputs[32000],projections[32000];
 if(!ai_rider_out||!read_memory(retained_pool_address+0x30,&count,4)||count>1000||
    !read_memory(retained_pool_address+0x1c,&link,4)||!read_memory(link+0x2c,&camera,4)||
    !read_memory(camera+0x16c,&scale,4)||!read_memory(camera+0x1b4,&width,4)||!read_memory(camera+0x1b8,&height,4)||
    !read_memory(retained_pool_address+0x1f90,&input,4)||!read_memory(retained_pool_address+0x1f8c,&projected,4)||
    !read_memory(0x4d7124,&yOffset,4)||!read_memory(input,inputs,count*32)||!read_memory(projected,projections,count*32))return 0;
 fprintf(ai_rider_out,"{\"phase\":\"%s\",\"captureId\":\"%s\",\"eventSequence\":%lu,\"completedBikeFrames\":%lu,\"bikeActive\":%d,\"riderActive\":%d,\"camera\":%lu,\"scaleBits\":%lu,\"width\":%ld,\"height\":%ld,\"inputAddress\":%lu,\"projectedAddress\":%lu,\"yOffsetBits\":%lu,\"inputHex\":\"",phase,frame_capture_id,ai_rider_sequence++,player_frame,player_active,ai_rider_active,camera,scale,(LONG)width,(LONG)height,input,projected,yOffset);
 for(unsigned i=0;i<count*32;i++)fprintf(ai_rider_out,"%02x",inputs[i]);fprintf(ai_rider_out,"\",\"projectedHex\":\"");
 for(unsigned i=0;i<count*32;i++)fprintf(ai_rider_out,"%02x",projections[i]);fprintf(ai_rider_out,"\"");
 DWORD viewport,device,state,currentViewport,viewportWords[4];BYTE matrices[192];
 if(!read_memory(camera+0x138,&viewport,4)||!read_memory(viewport+0xc,&device,4)||!read_memory(device+0x354,&state,4)||
    !read_memory(device+0x68,&currentViewport,4)||!read_memory(viewport+0x20,viewportWords,sizeof viewportWords)||
    !read_memory(state+0x2c94,matrices,64)||!read_memory(state+0x6c14,matrices+64,64)||!read_memory(state+0x2cd4,matrices+128,64))return 0;
 fprintf(ai_rider_out,",\"projectionViewport\":%lu,\"currentViewport\":%lu,\"viewport\":[%lu,%lu,%lu,%lu],\"projectionMatricesHex\":\"",viewport,currentViewport,viewportWords[0],viewportWords[1],viewportWords[2],viewportWords[3]);
 for(unsigned i=0;i<sizeof matrices;i++)fprintf(ai_rider_out,"%02x",matrices[i]);fprintf(ai_rider_out,"\"");
 if(!capture_retained_particle_pool(ai_rider_out,retained_pool_address))return 0;
 fprintf(ai_rider_out,"}\n");return !ferror(ai_rider_out)&&fflush(ai_rider_out)==0;
}
