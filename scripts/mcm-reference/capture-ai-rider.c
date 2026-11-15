// Embedded read-only rider observations. The initial record shares the bike's
// atomic entry boundary. Later records supply assertions and real scheduling,
// never a checkpoint restoration or a forced rider timestep.
#include "capture-particle-pool.c"
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
 fprintf(out,",\"visualState\":[");unsigned count=0;
 for(unsigned i=0;i<block_count;i++){
  const Block*b=&blocks[i];if(b->size!=0x114&&b->address!=proxy)continue;
  BYTE data[0x438];if(b->size>sizeof data||!read_memory(b->address,data,b->size))return 0;
  fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",count++?",":"",b->address,b->size);
  for(DWORD j=0;j<b->size;j++)fprintf(out,"%02x",data[j]);fprintf(out,"\"}");
 }
 fprintf(out,"]}\n");return !ferror(out)&&fflush(out)==0;
}
