// Observe the common grid-update entry/return for every collider sharing the
// selected bike's manager. Independent sequence: never drives replay writes.
static int trace_ai_grid(const char*phase){
 DWORD count,settings[5],enabled;static BYTE cells[(128*128+1)*24];
 if(!read_memory(ai_grid_manager+4,&count,4)||!count||count>60||!read_memory(ai_grid_manager+0x3938,settings,sizeof settings)||!settings[2]||settings[2]>128||!read_memory(0x4e3754,&enabled,4))return 0;
 DWORD cell_bytes=(settings[2]*settings[2]+1)*24;
 if(!read_memory(settings[4],cells,cell_bytes))return 0;
 if(!ai_grid_out){ai_grid_out=fopen(getenv("MCM_AI_GRID_TRACE"),"wx");if(!ai_grid_out)return 0;}
 FILE*out=ai_grid_out;
 fprintf(out,"{\"phase\":\"%s\",\"captureId\":\"%s\",\"sequence\":%lu,\"eventSequence\":%lu,\"completedBikeFrames\":%lu,\"bikeActive\":%d,\"riderActive\":%d,\"thread\":%lu,\"collider\":%lu,\"caller\":%lu,\"manager\":%lu,\"enabled\":%lu,\"gridHex\":\"",phase,frame_capture_id,ai_grid_sequence++,ai_rider_sequence,player_frame,player_active,ai_rider_active,ai_grid_thread,ai_grid_collider,ai_grid_caller,ai_grid_manager,enabled);
 if(!substep_hex(out,(BYTE*)settings,sizeof settings))return 0;
 fprintf(out,"\",\"cellsAddress\":%lu,\"cellsHex\":\"",settings[4]);if(!substep_hex(out,cells,cell_bytes))return 0;
 fprintf(out,"\",\"objects\":[");
 for(DWORD i=0;i<count;i++){
  DWORD address,entries,n,manager;BYTE bytes[0x110],links[128*24];
  if(!read_memory(ai_grid_manager+8+i*4,&address,4)||!read_memory(address,bytes,sizeof bytes))return 0;
  memcpy(&entries,bytes+0x8c,4);memcpy(&n,bytes+0x90,4);memcpy(&manager,bytes+0x98,4);
  if(manager!=ai_grid_manager||n>128||(!entries&&n)||(n&&!read_memory(entries,links,n*24)))return 0;
  fprintf(out,"%s{\"address\":%lu,\"hex\":\"",i?",":"",address);if(!substep_hex(out,bytes,sizeof bytes))return 0;
  fprintf(out,"\",\"entriesAddress\":%lu,\"entriesHex\":\"",entries);if(!substep_hex(out,links,n*24))return 0;fprintf(out,"\"}");
 }
 fprintf(out,"]}\n");return !ferror(out)&&fflush(out)==0;
}
