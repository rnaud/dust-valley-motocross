// Read-only AI controller inputs, atomically exported with the frame checkpoint.
// Uses collision_save/read helpers already embedded by capture-bike.c.
static int capture_ai_route(HANDLE p,CollisionWorldBlock*b,unsigned*n,DWORD actor){
 DWORD count,table;if(!collision_world_read(p,actor+0xb00,&count,4)||!collision_world_read(p,actor+0xaf4,&table,4)||count>2048)return 0;
 if(!count)return 1;if(!collision_save(p,b,n,table,count*4))return 0;
 for(DWORD i=0;i<count;i++){DWORD node;if(!collision_world_read(p,table+i*4,&node,4)||!collision_save(p,b,n,node,44))return 0;}return 1;
}
static int capture_mcm_ai_environment(HANDLE p,DWORD bike,const char*path,const char*id){
 CollisionWorldBlock b[COLLISION_BLOCK_LIMIT]={0};unsigned n=0;int ok=0;FILE*out=NULL;DWORD settings,owner,player,list,scene=0;WORD first;BYTE second;
 #define AI_SAVE(A,N) do{if(!collision_save(p,b,&n,(A),(N)))goto done;}while(0)
 if(!collision_world_read(p,0x4e4fb4,&settings,4)||!collision_world_read(p,bike+0x41c,&owner,4)||!collision_world_read(p,owner+0x30,&player,4))goto done;
 AI_SAVE(0x4e4fb4,4);AI_SAVE(0x4e7238,12);AI_SAVE(0x4e5670,4);AI_SAVE(settings+0x1070,16);AI_SAVE(settings+0x6c0,4);AI_SAVE(owner+0x30,12);
 AI_SAVE(player,0xcc8);if(!capture_ai_route(p,b,&n,bike)||!capture_ai_route(p,b,&n,player))goto done;
 if(!collision_world_read(p,settings+0x107a,&first,2)||!collision_world_read(p,settings+0x107e,&second,1)||first>64||second>64)goto done;
 for(unsigned group=0;group<2;group++){
  unsigned count=group?second:first;if(!count)continue;
  if(!collision_world_read(p,owner+(group?0x34:0x38),&list,4))goto done;AI_SAVE(list,count*4);
  for(unsigned i=0;i<count;i++){DWORD actor;if(!collision_world_read(p,list+i*4,&actor,4))goto done;AI_SAVE(actor,0xcc8);}
 }
 if(getenv("MCM_AI_SCENE_OBJECT")){
  DWORD link,view,world,gate,bound;scene=strtoul(getenv("MCM_AI_SCENE_OBJECT"),NULL,0);
  if(!scene||!collision_world_read(p,scene+0xec,&bound,4)||bound!=bike||!collision_world_read(p,scene+0x1c,&link,4)||!collision_world_read(p,link+4,&view,4)||!collision_world_read(p,scene+0xf8,&world,4)||!collision_world_read(p,world+0x48,&gate,4))goto done;
  AI_SAVE(scene,0x11c);AI_SAVE(link,0x30);AI_SAVE(view+0x110,4);AI_SAVE(world+0x48,4);AI_SAVE(gate+0x20,4);
 }
 out=fopen(path,"wx");if(!out)goto done;
 fprintf(out,"{\"schemaVersion\":1,\"kind\":\"mcm-ai-environment-observation\",\"bikeAddress\":%lu,\"captureId\":\"%s\",\"captureBoundary\":\"ai-frame-entry\",\"sceneObjectAddress\":%lu,\"blockCount\":%u,\"blocks\":[",bike,id,scene,n);
 for(unsigned i=0;i<n;i++){fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",i?",":"",b[i].address,b[i].size);for(DWORD j=0;j<b[i].size;j++)fprintf(out,"%02x",b[i].bytes[j]);fprintf(out,"\"}");}fprintf(out,"]}\n");ok=!ferror(out);
 done:if(out&&fclose(out))ok=0;for(unsigned i=0;i<n;i++)free(b[i].bytes);if(!ok)fprintf(stderr,"AI environment export failed\n");return ok;
 #undef AI_SAVE
}
