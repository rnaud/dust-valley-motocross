// Read-only display assertions at existing stopped-process boundaries. These
// observations must never be used to overwrite retained simulation outputs.
static DWORD observed_world_display;
static int capture_scene_display_block(FILE*out,DWORD address,unsigned size){
 BYTE bytes[0x290];if(!address||size>sizeof bytes||!read_memory(address,bytes,size))return 0;
 fprintf(out,"{\"address\":%lu,\"hex\":\"",address);
 for(unsigned i=0;i<size;i++)fprintf(out,"%02x",bytes[i]);fprintf(out,"\"}");return !ferror(out);
}
static int capture_scene_display_state(FILE*out,DWORD address){
 DWORD app,count,owner,camera,selected,target,globals[5],refresh;WORD mode;
 if(!read_memory(0x4e4fb4,&app,4)||!read_memory(app+0x6f4,&refresh,4)||!read_memory(app+0x1072,&mode,2)||!read_memory(0x4e2ee8,globals,sizeof globals)||!read_memory(address+0x260,&count,4)||count>11||!read_memory(address+0xf8,&owner,4)||!read_memory(address+0xfc,&camera,4)||!read_memory(owner+0x30,&selected,4)||!read_memory(camera+0x1ec,&target,4))return 0;
 fprintf(out,"{\"actor\":");if(!capture_scene_display_block(out,address,0x290))return 0;
 fprintf(out,",\"app\":%lu,\"refreshEnabled\":%lu,\"mode\":%u,\"owner\":%lu,\"selectedBike\":%lu,\"camera\":%lu,\"cameraTarget\":%lu,\"globals\":[%lu,%lu,%lu,%lu,%lu],\"surfaces\":[",app,refresh,mode,owner,selected,camera,target,globals[0],globals[1],globals[2],globals[3],globals[4]);
 for(unsigned i=0;i<2;i++){DWORD surface;if(!read_memory(address+0x30+i*4,&surface,4))return 0;if(i)fprintf(out,",");if(!capture_scene_display_block(out,surface,0x74))return 0;}
 fprintf(out,"],\"visibility\":[");
 for(unsigned i=0;i<count;i++){
  DWORD bike,root,flag,display,table,show,hide;
  if(!read_memory(address+0x234+i*4,&bike,4)||!read_memory(bike+0x434,&root,4)||!read_memory(root+0x12c,&flag,4)||!read_memory(address+0x264+i*4,&display,4)||!read_memory(display,&table,4)||!read_memory(table+0x10,&show,4)||!read_memory(table+0x14,&hide,4))return 0;
  fprintf(out,"%s{\"bike\":%lu,\"root\":%lu,\"rootFlag\":%lu,\"showMethod\":%lu,\"hideMethod\":%lu,\"display\":",i?",":"",bike,root,flag,show,hide);
  if(!capture_scene_display_block(out,display,0x30))return 0;fprintf(out,"}");
 }
 fprintf(out,"]}");return !ferror(out);
}
static int capture_scene_display_observation(FILE*out){
 if(!getenv("MCM_WORLD_DISPLAY"))return 1;
 if(!observed_world_display)return 0;
 fprintf(out,",\"sceneDisplayObservation\":");return capture_scene_display_state(out,observed_world_display);
}
