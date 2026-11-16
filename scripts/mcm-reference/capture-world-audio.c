// Read-only initial collision notification resources. No DirectSound methods
// are invoked; enabled/buffer gates are retained as evidence, not assumed.
static int capture_world_audio(DWORD bike,const char*path,const char*id){
 DWORD owner,notification,view,selected,cameraOwner,camera;BYTE state[0xa0],position[12];
 if(!read_memory(bike+0x41c,&owner,4)||!read_memory(owner+0x3c,&notification,4)||!notification||!read_memory(notification,state,sizeof state)||
    !read_memory(notification+0x3c,&view,4)||!read_memory(view+0x1ec,&selected,4)||!read_memory(notification+0x1c,&cameraOwner,4)||!read_memory(cameraOwner+0x2c,&camera,4)||!read_memory(camera+0x144,position,sizeof position))return 0;
 FILE*out=fopen(path,"wx");if(!out)return 0;
 fprintf(out,"{\"captureId\":\"%s\",\"captureBoundary\":\"world-frame-entry\",\"bikeAddress\":%lu,\"notificationAddress\":%lu,\"notificationHex\":\"",id,bike,notification);
 int ok=write_particle_hex(out,state,sizeof state);fprintf(out,"\",\"selectedBike\":%lu,\"cameraAddress\":%lu,\"cameraPositionHex\":\"",selected,camera);ok=ok&&write_particle_hex(out,position,sizeof position);fprintf(out,"\",\"samples\":[");
 for(unsigned i=0;ok&&i<7;i++){
  DWORD address,deviceOwner,enabled,buffer;BYTE bytes[0x178];
  memcpy(&address,state+(i<6?0x80+i*4:0x9c),4);
  if(!address||!read_memory(address,bytes,sizeof bytes)||!read_memory(address+0x30,&deviceOwner,4)||!read_memory(deviceOwner+0x444,&enabled,4)||!read_memory(address+0x40,&buffer,4)){ok=0;break;}
  fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"deviceOwner\":%lu,\"deviceEnabled\":%lu,\"buffer\":%lu,\"hex\":\"",i?",":"",address,(DWORD)sizeof bytes,deviceOwner,enabled,buffer);ok=ok&&write_particle_hex(out,bytes,sizeof bytes);fprintf(out,"\"}");
 }
 fprintf(out,"]}\n");if(ferror(out))ok=0;if(fclose(out))ok=0;return ok;
}
