// One atomic pre-physics world snapshot, separate from the later AI checkpoint.
// Never restores memory or replaces an already initialized replay checkpoint.
static int capture_world_entry(DWORD actor,DWORD esp){
 const char*dir=getenv("MCM_WORLD_ENTRY");char path[1024],id[17];LARGE_INTEGER stamp;
 BYTE body[0x18cc],app[0x1330];DWORD world,dt,scratch,bikes[65],n=1,view;
 if(block_count||player_frame||!QueryPerformanceCounter(&stamp)||!read_memory(actor,body,sizeof body)||!read_memory(0x4e4fb4,&world,4)||!read_memory(world,app,sizeof app)||!read_memory(esp+4,&dt,4)||!read_memory(esp-0x10,&scratch,4))return 0;
 snprintf(id,sizeof id,"%08lx%08lx",(DWORD)stamp.HighPart,stamp.LowPart);
 memcpy(bikes,body+0x30,4);short aiCount;memcpy(&aiCount,app+0x107a,2);DWORD table;memcpy(&table,body+0x38,4);
 if(aiCount<0||aiCount>64||!bikes[0])return 0;
 if(aiCount&&!read_memory(table,bikes+1,aiCount*4))return 0;n+=aiCount;
 snprintf(path,sizeof path,"%s\\world-entry.json",dir);FILE*out=fopen(path,"wx");if(!out)return 0;
 fprintf(out,"{\"schemaVersion\":1,\"kind\":\"mcm-world-entry\",\"captureId\":\"%s\",\"captureBoundary\":\"world-frame-entry\",\"actor\":%lu,\"world\":%lu,\"dtBits\":%lu,\"localIdentityScratch\":%lu,\"actorHex\":\"",id,actor,world,dt,scratch);
 int ok=write_particle_hex(out,body,sizeof body);fprintf(out,"\",\"worldHex\":\"");ok=ok&&write_particle_hex(out,app,sizeof app);fprintf(out,"\",\"bikes\":[");
 for(unsigned i=0;i<n;i++)fprintf(out,"%s%lu",i?",":"",bikes[i]);fprintf(out,"],\"remoteTable\":[");
 DWORD remoteTable;int remoteCount;memcpy(&remoteTable,body+0x34,4);memcpy(&remoteCount,app+0x314,4);
 if(remoteCount<0||remoteCount>64)ok=0;
 for(int i=0;ok&&i<remoteCount;i++){DWORD bike=0;if(remoteTable&&!read_memory(remoteTable+i*4,&bike,4)){ok=0;break;}fprintf(out,"%s%lu",i?",":"",bike);if(bike)ok=0; /* Explicitly reject uncaptured remote bike state. */}
 fprintf(out,"]");memcpy(&view,body+0x44,4);DWORD target=0,excluded=0;
 if(!read_memory(view+0x1ec,&target,4)||!read_memory(target+0xc30,&excluded,4))ok=0;
 fprintf(out,",\"view\":%lu,\"target\":%lu,\"targetExcluded\":%lu",view,target,excluded);
 DWORD marker;memcpy(&marker,body+0x6c,4);BYTE markerBytes[0x24];
 if(marker){if(!read_memory(marker,markerBytes,sizeof markerBytes))ok=0;else{fprintf(out,",\"markerHex\":\"");ok=ok&&write_particle_hex(out,markerBytes,sizeof markerBytes);fprintf(out,"\"");}}
 fprintf(out,"}\n");if(ferror(out))ok=0;if(fclose(out))ok=0;if(!ok)return 0;
 const char*oldBoundary=export_boundary;export_boundary="world-frame-entry";
 snprintf(path,sizeof path,"%s\\world-actor-tree.json",dir);ok=capture_actor_tree(bikes[0],path,id);export_boundary=oldBoundary;if(!ok)return 0;
 for(unsigned i=0;i<n;i++){
  DWORD bike=bikes[i];for(unsigned j=0;j<i;j++)if(bikes[j]==bike)return 0;
  block_count=0;if(!checkpoint(bike,0))return 0;
  snprintf(path,sizeof path,"%s\\world-bike-%u.json",dir,i);out=fopen(path,"wx");if(!out)return 0;
  fprintf(out,"{\"schemaVersion\":1,\"kind\":\"mcm-partial-local-checkpoint\",\"captureId\":\"%s\",\"captureBoundary\":\"world-frame-entry\",\"bikeAddress\":%lu,\"playerFrame\":0,\"blockCount\":%u,\"blocks\":[",id,bike,block_count);
  for(unsigned j=0;j<block_count;j++){Block*b=&blocks[j];fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",j?",":"",b->address,b->size);ok=ok&&write_particle_hex(out,b->bytes,b->size);fprintf(out,"\"}");}
  fprintf(out,"]}\n");if(ferror(out))ok=0;if(fclose(out))ok=0;block_count=0;if(!ok)return 0;
  snprintf(path,sizeof path,"%s\\world-environment-%u.json",dir,i);if(!capture_mcm_frame_environment(process,bike,path,id,0,"world-frame-entry"))return 0;
  snprintf(path,sizeof path,"%s\\world-animations-%u.json",dir,i);if(!capture_mcm_animation_assets_at(process,bike,path,id,"world-frame-entry"))return 0;
  snprintf(path,sizeof path,"%s\\world-collision-%u.json",dir,i);if(!capture_mcm_collision_world(process,bike,path,id,0,"world-frame-entry"))return 0;
  DWORD rider,child,pool;BYTE riderBytes[0x3ac],childBytes[0x618],poolBytes[0x2004],particle[0x48];
  if(!read_memory(bike+0x874,&rider,4)||!read_memory(rider,riderBytes,sizeof riderBytes)||!read_memory(rider+0x14,&child,4)||!read_memory(child,childBytes,sizeof childBytes)||!read_memory(child+0x34,&pool,4)||!read_memory(pool,poolBytes,sizeof poolBytes))return 0;
  snprintf(path,sizeof path,"%s\\world-child-%u.json",dir,i);out=fopen(path,"wx");if(!out)return 0;
  fprintf(out,"{\"captureId\":\"%s\",\"captureBoundary\":\"world-frame-entry\",\"bikeAddress\":%lu,\"rider\":%lu,\"address\":%lu,\"hex\":\"",id,bike,rider,child);ok=write_particle_hex(out,childBytes,sizeof childBytes);
  fprintf(out,"\",\"riderHex\":\"");ok=ok&&write_particle_hex(out,riderBytes,sizeof riderBytes);fprintf(out,"\",\"poolAddress\":%lu,\"poolHex\":\"",pool);ok=ok&&write_particle_hex(out,poolBytes,sizeof poolBytes);fprintf(out,"\",\"particlesHex\":\"");
  for(unsigned j=0;ok&&j<1000;j++){DWORD a;memcpy(&a,poolBytes+0x44+j*4,4);ok=read_memory(a,particle,sizeof particle)&&write_particle_hex(out,particle,sizeof particle);}
  fprintf(out,"\",\"particleOrder\":\"initial-allocation-order\",\"particleStride\":72}\n");if(ferror(out))ok=0;if(fclose(out))ok=0;if(!ok)return 0;
 }
 return 1;
}
