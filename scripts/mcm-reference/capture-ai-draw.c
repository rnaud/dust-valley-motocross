// Read-only wrapper entry/exit observations. Capture before culling, so missing
// mesh calls are distinguishable from a culled actor. eventSequence is the next
// rider/query event, not a command to mutate the reconstructed graph.
static int draw_words(FILE*out,const char*name,const DWORD*words,unsigned count){
 fprintf(out,",\"%s\":[",name);for(unsigned i=0;i<count;i++)fprintf(out,"%s%lu",i?",":"",words[i]);fprintf(out,"]");return !ferror(out);
}
static int draw_block(FILE*out,DWORD address,DWORD size){
 BYTE*bytes=malloc(size?size:1);if(!bytes)return 0;
 int ok=!size||read_memory(address,bytes,size);
 if(ok){fprintf(out,"{\"address\":%lu,\"size\":%lu,\"hex\":\"",address,size);ok=substep_hex(out,bytes,size);fprintf(out,"\"}");}
 free(bytes);return ok;
}
static int trace_ai_draw(DWORD actor,int after){
 DWORD node,rect[4],selection;
 if(!read_memory(actor+0x434,&node,4)||!read_memory(actor+0x488,rect,sizeof rect)||!read_memory(actor+0x4a4,&selection,4))return 0;
 if(!ai_draws_out){ai_draws_out=fopen(getenv("MCM_AI_DRAW_TRACE"),"wx");if(!ai_draws_out)return 0;}
 FILE*out=ai_draws_out;
 fprintf(out,"{\"phase\":\"%s\",\"captureId\":\"%s\",\"completedBikeFrames\":%lu,\"eventSequence\":%lu,\"actor\":%lu,\"node\":%lu",after?"after-draw":"before-draw",frame_capture_id,player_frame,ai_rider_sequence,actor,node);
 if(!draw_words(out,"rect",rect,4))return 0;
 fprintf(out,",\"selection\":%lu,\"lodNodes\":[",selection);unsigned emitted=0;
 for(unsigned i=0;i<block_count;i++)if(blocks[i].size==0x114){DWORD lod[2];if(!read_memory(blocks[i].address+0x118,lod,8))return 0;fprintf(out,"%s{\"address\":%lu,\"levels\":%lu,\"index\":%lu}",emitted++?",":"",blocks[i].address,lod[0],lod[1]);}fprintf(out,"]");
 if(!after){
  DWORD owner,camera,projection[16],viewport[4],bounds[6],rendererMode,index,table,levels,thresholdCount,thresholdTable,enabled;
  if(!read_memory(actor+0x420,&owner,4)||!read_memory(owner+0x2c,&camera,4)||!read_memory(camera+0xb0,projection,64)||
     !read_memory(camera+0x178,viewport,16)||!read_memory(actor+0x218,bounds,24)||!read_memory(0x4e4afc,&rendererMode,4)||
     !read_memory(node+0x11c,&index,4)||!read_memory(node+0x118,&levels,4)||!levels||levels>32||index>=levels||!read_memory(node+0x234,&table,4)||!read_memory(actor+0x4a8,&thresholdCount,4)||thresholdCount>32||!read_memory(actor+0x4ac,&thresholdTable,4)||!read_memory(actor+0x4b8,&enabled,4))return 0;
  fprintf(out,",\"camera\":%lu,\"rendererMode\":%lu,\"index\":%lu,\"table\":%lu",camera,rendererMode,index,table);
  if(!draw_words(out,"projection",projection,16)||!draw_words(out,"viewport",viewport,4)||!draw_words(out,"bounds",bounds,6))return 0;
  DWORD thresholds[32];if(thresholdCount&&!read_memory(thresholdTable,thresholds,thresholdCount*4))return 0;
  fprintf(out,",\"enabled\":%lu,\"levels\":%lu",enabled,levels);if(!draw_words(out,"thresholds",thresholds,thresholdCount))return 0;
  fprintf(out,",\"blocks\":[");
  if(!draw_block(out,node,0x238))return 0;fprintf(out,",");
  if(!draw_block(out,table,levels*8))return 0;
  for(DWORD level=0;level<levels;level++){
   DWORD pair[2];if(!read_memory(table+level*8,pair,8)||pair[0]>64)return 0;
   fprintf(out,",");if(!draw_block(out,pair[1],pair[0]*40))return 0;
   for(DWORD i=0;i<pair[0];i++){
    DWORD components[2];if(!read_memory(pair[1]+i*40,components,8)||components[0]>128)return 0;
    fprintf(out,",");if(!draw_block(out,components[1],components[0]*20))return 0;
   }
  }
  fprintf(out,"]");
 }else{
  fprintf(out,",\"nodes\":[");unsigned count=0;
  for(unsigned i=0;i<block_count;i++)if(blocks[i].size==0x114){
   if(count++)fprintf(out,",");if(!draw_block(out,blocks[i].address,0x114))return 0;
  }
  fprintf(out,"]");
 }
 fprintf(out,"}\n");return !ferror(out)&&fflush(out)==0;
}
