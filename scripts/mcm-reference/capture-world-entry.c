static int capture_world_effects(DWORD bike,const char*path,const char*id){
 DWORD world,owner,event,settings,shape,enabled,occlusion,selected,state,disabled;BYTE target[12];
 if(!read_memory(0x4e4fb4,&world,4)||!read_memory(world+0x718,&enabled,4)||!read_memory(world+0x714,&occlusion,4)||
    !read_memory(bike+0xc84,&owner,4)||!read_memory(owner+0x44,&event,4)||!read_memory(owner+0x48,&settings,4)||
    !read_memory(event+0x1ec,&selected,4)||!read_memory(event+0x1f4,&state,4)||!read_memory(settings+0x20,&disabled,4)||
    !read_memory(bike+0xca8,&shape,4)||!shape||!read_memory(shape+0x34,target,12))return 0;
 FILE*out=fopen(path,"wx");if(!out)return 0;int ok=1;
 fprintf(out,"{\"captureId\":\"%s\",\"captureBoundary\":\"world-frame-entry\",\"bikeAddress\":%lu,\"visualEffects\":[",id,bike);
 for(unsigned k=0;k<3;k++){
  DWORD address,offsets[]={0xc94,0xc98,0xca0},sizes[]={0x84,0x84,0x480};BYTE bytes[0x480];
  if(!read_memory(bike+offsets[k],&address,4)||!read_memory(address,bytes,sizes[k])){ok=0;break;}
  fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",k?",":"",address,sizes[k]);ok=ok&&write_particle_hex(out,bytes,sizes[k]);fprintf(out,"\"}");
 }
 fprintf(out,"],\"effectsEnvironment\":{\"world\":%lu,\"enabled\":%lu,\"occlusion\":%lu,\"selectedBike\":%lu,\"eventState\":%lu,\"disabled\":%lu,\"shape\":%lu,\"targetHex\":\"",world,enabled,occlusion,selected,state,disabled,shape);
 ok=ok&&write_particle_hex(out,target,sizeof target);fprintf(out,"\"}}\n");if(ferror(out))ok=0;if(fclose(out))ok=0;return ok;
}
// One atomic pre-physics world snapshot, separate from the later AI checkpoint.
// Never restores memory or replaces an already initialized replay checkpoint.
static int capture_world_entry(DWORD actor,DWORD esp){
 const char*dir=getenv("MCM_WORLD_ENTRY");char path[1024],id[17];LARGE_INTEGER stamp;
 DWORD initialRandom;if(!observed_random_address||!read_memory(observed_random_address,&initialRandom,4))return 0;
 BYTE body[0x18cc],app[0x1330];DWORD world,dt,scratch,bikes[65],n=1,view;
 if(block_count||player_frame||!QueryPerformanceCounter(&stamp)||!read_memory(actor,body,sizeof body)||!read_memory(0x4e4fb4,&world,4)||!read_memory(world,app,sizeof app)||!read_memory(esp+4,&dt,4)||!read_memory(esp-0x10,&scratch,4))return 0;
 snprintf(id,sizeof id,"%08lx%08lx",(DWORD)stamp.HighPart,stamp.LowPart);
 memcpy(bikes,body+0x30,4);short aiCount;memcpy(&aiCount,app+0x107a,2);DWORD table;memcpy(&table,body+0x38,4);
 if(aiCount<0||aiCount>64||!bikes[0])return 0;
 if(aiCount&&!read_memory(table,bikes+1,aiCount*4))return 0;n+=aiCount;
 snprintf(path,sizeof path,"%s\\world-entry.json",dir);FILE*out=fopen(path,"wx");if(!out)return 0;
 fprintf(out,"{\"schemaVersion\":1,\"kind\":\"mcm-world-entry\",\"controllerEnvironmentsCaptured\":true,\"effectsCaptured\":true,\"captureId\":\"%s\",\"captureBoundary\":\"world-frame-entry\",\"actor\":%lu,\"world\":%lu,\"dtBits\":%lu,\"localIdentityScratch\":%lu,\"actorHex\":\"",id,actor,world,dt,scratch);
 int ok=write_particle_hex(out,body,sizeof body);fprintf(out,"\",\"worldHex\":\"");ok=ok&&write_particle_hex(out,app,sizeof app);fprintf(out,"\",\"bikes\":[");
 for(unsigned i=0;i<n;i++)fprintf(out,"%s%lu",i?",":"",bikes[i]);fprintf(out,"],\"remoteTable\":[");
 DWORD remoteTable;int remoteCount;memcpy(&remoteTable,body+0x34,4);memcpy(&remoteCount,app+0x314,4);
 if(remoteCount<0||remoteCount>64)ok=0;
 for(int i=0;ok&&i<remoteCount;i++){DWORD bike=0;if(remoteTable&&!read_memory(remoteTable+i*4,&bike,4)){ok=0;break;}fprintf(out,"%s%lu",i?",":"",bike);if(bike)ok=0; /* Explicitly reject uncaptured remote bike state. */}
 fprintf(out,"],\"randomAddress\":%lu,\"randomState\":%lu",observed_random_address,initialRandom);BYTE initialStack[0xc40];DWORD stackAddress=esp-0xc20;
 if(!read_memory(stackAddress,initialStack,sizeof initialStack))ok=0;
 fprintf(out,",\"stackAddress\":%lu,\"stackHex\":\"",stackAddress);ok=ok&&write_particle_hex(out,initialStack,sizeof initialStack);fprintf(out,"\"");
 memcpy(&view,body+0x44,4);DWORD target=0,excluded=0;
 if(!read_memory(view+0x1ec,&target,4)||!read_memory(target+0xc30,&excluded,4))ok=0;
 fprintf(out,",\"view\":%lu,\"target\":%lu,\"targetExcluded\":%lu",view,target,excluded);
 DWORD refreshController,refreshDevice,refreshKind=0;
 if(!read_memory(bikes[0]+0x6e4,&refreshController,4)||!read_memory(refreshController+0xc,&refreshDevice,4)||(refreshDevice&&!read_memory(refreshDevice+0x30,&refreshKind,4)))ok=0;
 fprintf(out,",\"refreshDevice\":{\"controller\":%lu,\"address\":%lu,\"kind\":%lu}",refreshController,refreshDevice,refreshKind);
 DWORD marker;memcpy(&marker,body+0x6c,4);BYTE markerBytes[0x24];
 if(marker){if(!read_memory(marker,markerBytes,sizeof markerBytes))ok=0;else{fprintf(out,",\"markerHex\":\"");ok=ok&&write_particle_hex(out,markerBytes,sizeof markerBytes);fprintf(out,"\"");}}
 if(world_pursuit)fprintf(out,",\"steeringProtocol\":\"%s\"",world_pursuit==2?"player-pursuit-ai-v2":"player-pursuit-ai-v1");
 if(world_throttle_pulse)fprintf(out,",\"inputProtocol\":\"%s\"",world_throttle_pulse==4?"player-throttle-frames-0-through-95":world_throttle_pulse==3?"player-throttle-frames-0-through-47":world_throttle_pulse==2?"player-throttle-frames-0-through-11":"player-throttle-frames-1-through-2");
 fprintf(out,"}\n");if(ferror(out))ok=0;if(fclose(out))ok=0;if(!ok)return 0;
 if(capture_world_camera&&!capture_initial_world_camera(dir,view,dt))return 0;
 const char*oldBoundary=export_boundary;export_boundary="world-frame-entry";
 snprintf(path,sizeof path,"%s\\world-actor-tree.json",dir);ok=capture_actor_tree(bikes[0],path,id);export_boundary=oldBoundary;if(!ok)return 0;
 for(unsigned i=0;i<n;i++){
  DWORD bike=bikes[i];for(unsigned j=0;j<i;j++)if(bikes[j]==bike)return 0;
  snprintf(path,sizeof path,"%s\\world-audio-%u.json",dir,i);if(!capture_world_audio(bike,path,id))return 0;
  block_count=0;if(!checkpoint(bike,0))return 0;
  snprintf(path,sizeof path,"%s\\world-mesh-%u.jsonl",dir,i);if(!capture_world_mesh(bike,path,id))return 0;
  snprintf(path,sizeof path,"%s\\world-bike-%u.json",dir,i);out=fopen(path,"wx");if(!out)return 0;
  fprintf(out,"{\"schemaVersion\":1,\"kind\":\"mcm-partial-local-checkpoint\",\"captureId\":\"%s\",\"captureBoundary\":\"world-frame-entry\",\"bikeAddress\":%lu,\"playerFrame\":0,\"blockCount\":%u,\"blocks\":[",id,bike,block_count);
  for(unsigned j=0;j<block_count;j++){Block*b=&blocks[j];fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",j?",":"",b->address,b->size);ok=ok&&write_particle_hex(out,b->bytes,b->size);fprintf(out,"\"}");}
  fprintf(out,"]}\n");if(ferror(out))ok=0;if(fclose(out))ok=0;block_count=0;if(!ok)return 0;
  snprintf(path,sizeof path,"%s\\world-environment-%u.json",dir,i);if(!capture_mcm_frame_environment(process,bike,path,id,0,"world-frame-entry"))return 0;
  snprintf(path,sizeof path,"%s\\world-animations-%u.json",dir,i);if(!capture_mcm_animation_assets_at(process,bike,path,id,"world-frame-entry"))return 0;
  snprintf(path,sizeof path,"%s\\world-collision-%u.json",dir,i);if(!capture_mcm_collision_world(process,bike,path,id,0,"world-frame-entry"))return 0;
  DWORD ai;if(!read_memory(bike+0x614,&ai,4))return 0;
  if(ai){snprintf(path,sizeof path,"%s\\world-ai-environment-%u.json",dir,i);if(!capture_mcm_ai_environment_at(process,bike,path,id,"world-frame-entry",bike==observe_ai?ai_scene_object:0))return 0;}
  DWORD rider,child,pool,dampingBits;BYTE riderBytes[0x3ac],childBytes[0x618],poolBytes[0x2004],particle[0x48];
  if(!read_memory(0x4e21bc,&dampingBits,4)||!read_memory(bike+0x874,&rider,4)||!read_memory(rider,riderBytes,sizeof riderBytes)||!read_memory(rider+0x14,&child,4)||!read_memory(child,childBytes,sizeof childBytes)||!read_memory(child+0x34,&pool,4)||!read_memory(pool,poolBytes,sizeof poolBytes))return 0;
  snprintf(path,sizeof path,"%s\\world-child-%u.json",dir,i);out=fopen(path,"wx");if(!out)return 0;
  fprintf(out,"{\"captureId\":\"%s\",\"captureBoundary\":\"world-frame-entry\",\"bikeAddress\":%lu,\"rider\":%lu,\"address\":%lu,\"hex\":\"",id,bike,rider,child);ok=write_particle_hex(out,childBytes,0x610);
  fprintf(out,"\",\"boundaryWords\":[%lu,%lu],\"dampingBits\":%lu,\"riderHex\":\"",*(DWORD*)(childBytes+0x610),*(DWORD*)(childBytes+0x614),dampingBits);ok=ok&&write_particle_hex(out,riderBytes,sizeof riderBytes);fprintf(out,"\",\"poolAddress\":%lu,\"poolHex\":\"",pool);ok=ok&&write_particle_hex(out,poolBytes,sizeof poolBytes);fprintf(out,"\",\"particlesHex\":\"");
  for(unsigned j=0;ok&&j<1000;j++){DWORD a;memcpy(&a,poolBytes+0x44+j*4,4);ok=read_memory(a,particle,sizeof particle)&&write_particle_hex(out,particle,sizeof particle);}
  fprintf(out,"\",\"particleOrder\":\"initial-allocation-order\",\"particleStride\":72");
  DWORD link=0,owner=0,gate=0,update=0,globalDt=0,vtable;memcpy(&vtable,childBytes,4);
  if(!read_memory(rider+0x1c,&link,4)||!read_memory(vtable+0x2c,&update,4)||!read_memory(0x4edec4,&globalDt,4))ok=0;
  if(link&&(!read_memory(link,&owner,4)||!read_memory(owner+0x35c,&gate,4)))ok=0;
  fprintf(out,",\"dtBits\":%lu,\"globalDtBits\":%lu,\"paused\":%lu,\"ownerGate\":%lu,\"updateAddress\":%lu",dt,globalDt,collision_word(app,0x132c),gate,update);
  DWORD spray=0;BYTE sprayBytes[0x614];if(!read_memory(bike+0xc98,&spray,4)||!read_memory(spray,sprayBytes,sizeof sprayBytes))ok=0;
  fprintf(out,",\"sprayAddress\":%lu,\"sprayHex\":\"",spray);ok=ok&&write_particle_hex(out,sprayBytes,sizeof sprayBytes);fprintf(out,"\"}");if(ferror(out))ok=0;if(fclose(out))ok=0;if(!ok)return 0;
  snprintf(path,sizeof path,"%s\\world-effects-%u.json",dir,i);if(!capture_world_effects(bike,path,id))return 0;
 }
 return 1;
}
