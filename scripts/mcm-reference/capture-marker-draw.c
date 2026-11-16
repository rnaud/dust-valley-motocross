// Atomic marker mesh resources and assertion-only draw-entry observations.
static int capture_world_marker_draw;
static FILE*world_marker_draws_out;
static int write_marker_draw(FILE*out,const char*id,int initial){
 DWORD marker=observed_world_marker,node=observed_world_marker_shape,child,owner,camera,projection[16],viewport[4],mode;
 if(!marker||!node||!read_memory(marker+0x14,&child,4)||child!=node+0x14c||
    !read_memory(child+0x1c,&owner,4)||!read_memory(owner+0x2c,&camera,4)||
    !read_memory(camera+0xb0,projection,64)||!read_memory(camera+0x178,viewport,16)||!read_memory(0x4e4afc,&mode,4))return 0;
 fprintf(out,"{\"captureBoundary\":\"%s\",\"captureId\":\"%s\",\"completedBikeFrames\":%lu,\"marker\":%lu,\"node\":%lu,\"child\":%lu,\"camera\":%lu,\"rendererMode\":%lu",initial?"world-frame-entry":"marker-draw-entry",id,player_frame,marker,node,child,camera,mode);
 if(!draw_words(out,"projection",projection,16)||!draw_words(out,"viewport",viewport,4))return 0;
 fprintf(out,",\"blocks\":[");if(!draw_block(out,marker,0xa4))return 0;
 fprintf(out,",");if(!draw_block(out,node,0x250))return 0;
 if(initial){
  DWORD levels,table;if(!read_memory(node+0x118,&levels,4)||!levels||levels>32||!read_memory(node+0x234,&table,4))return 0;
  fprintf(out,",");if(!draw_block(out,table,levels*8))return 0;
  for(DWORD level=0;level<levels;level++){
   DWORD pair[2];if(!read_memory(table+level*8,pair,8)||pair[0]>64)return 0;
   fprintf(out,",");if(!draw_block(out,pair[1],pair[0]*40))return 0;
   for(DWORD i=0;i<pair[0];i++){
    DWORD components[2];if(!read_memory(pair[1]+i*40,components,8)||components[0]>128)return 0;
    fprintf(out,",");if(!draw_block(out,components[1],components[0]*20))return 0;
   }
  }
 }
 fprintf(out,"]}\n");return !ferror(out)&&!fflush(out);
}
static int capture_initial_marker_draw(const char*dir,const char*id){
 char path[1024];snprintf(path,sizeof path,"%s\\world-marker-mesh.json",dir);
 FILE*out=fopen(path,"wx");if(!out)return 0;int ok=write_marker_draw(out,id,1);if(fclose(out))ok=0;return ok;
}
static int trace_marker_draw(CONTEXT*c){
 if(c->Ecx!=observed_world_marker)return 1;
 if(!world_marker_draws_out){char path[1024];snprintf(path,sizeof path,"%s\\world-marker-draws.jsonl",getenv("MCM_WORLD_ENTRY"));world_marker_draws_out=fopen(path,"wx");if(!world_marker_draws_out)return 0;}
 return write_marker_draw(world_marker_draws_out,frame_capture_id,0);
}
