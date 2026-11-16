static int capture_world_renderer,world_renderer_phase;
static DWORD world_renderer_frame,world_renderer_delta;
static FILE*world_renderer_out;
static int capture_renderer_memory(FILE*out,const char*phase,DWORD frame,DWORD actor,DWORD dt,CONTEXT*c,int event){
 BYTE actorBytes[0x9c],ownerBytes[0x40],cameraBytes[0x254];DWORD owner,camera;
 if(!read_memory(actor,actorBytes,sizeof actorBytes))return 0;
 memcpy(&owner,actorBytes+0x1c,4);if(!read_memory(owner,ownerBytes,sizeof ownerBytes))return 0;
 memcpy(&camera,ownerBytes+0x2c,4);if(!read_memory(camera,cameraBytes,sizeof cameraBytes))return 0;
 fprintf(out,"{\"phase\":\"%s\",\"frame\":%lu,\"deltaBits\":%lu,\"actor\":%lu,\"owner\":%lu,\"camera\":%lu,\"actorHex\":\"",phase,frame,dt,actor,owner,camera);
 for(unsigned i=0;i<sizeof actorBytes;i++)fprintf(out,"%02x",actorBytes[i]);fprintf(out,"\",\"ownerHex\":\"");
 for(unsigned i=0;i<sizeof ownerBytes;i++)fprintf(out,"%02x",ownerBytes[i]);fprintf(out,"\",\"cameraHex\":\"");
 for(unsigned i=0;i<sizeof cameraBytes;i++)fprintf(out,"%02x",cameraBytes[i]);fprintf(out,"\"");
 if(event==1){DWORD args[3];if(!read_memory(c->Esp,args,sizeof args))return 0;fprintf(out,",\"submit\":{\"device\":%lu,\"kind\":%lu,\"matrix\":%lu}",args[0],args[1],args[2]);}
 if(event==2)fprintf(out,",\"result\":%lu",c->Eax);
 fprintf(out,"}\n");return !ferror(out)&&fflush(out)==0;
}
static int capture_initial_world_renderer(const char*dir,DWORD dt){
 if(!observed_world_renderer)return 0;char path[1024];snprintf(path,sizeof path,"%s\\world-renderer-initial.json",dir);FILE*out=fopen(path,"wx");if(!out)return 0;
 int ok=capture_renderer_memory(out,"world-entry",0,observed_world_renderer,dt,NULL,-1);if(fclose(out))ok=0;if(!ok)return 0;
 snprintf(path,sizeof path,"%s\\world-renderer-observations.jsonl",dir);world_renderer_out=fopen(path,"wx");return world_renderer_out!=NULL;
}
static int trace_world_renderer(int phase,CONTEXT*c){
 DWORD actor=phase?c->Esi:c->Ecx;if(actor!=observed_world_renderer)return 1;
 if(!world_renderer_out||phase!=world_renderer_phase||!player_frame)return 0;
 if(!phase){DWORD enabled;if(!read_memory(c->Esp+4,&world_renderer_delta,4)||!read_memory(actor+0x20,&enabled,4))return 0;world_renderer_frame=player_frame;
  if(!enabled)return capture_renderer_memory(world_renderer_out,"disabled",player_frame,actor,world_renderer_delta,c,-1);
 }
 if(world_renderer_frame!=player_frame)return 0;
 const char*names[]={"entry","submit","result"};if(!capture_renderer_memory(world_renderer_out,names[phase],player_frame,actor,world_renderer_delta,c,phase))return 0;
 world_renderer_phase=(phase+1)%3;return 1;
}
