static DWORD observed_world_queue,observed_world_renderer;
static int capture_scene_queue_items(FILE*out,DWORD address){
 DWORD head,seen[256];unsigned count=0;BYTE bytes[0x8c];
 if(!read_memory(address+0x54,&head,4))return 0;
 fprintf(out,",\"queueItems\":[");
 while(head){
  if(count==256)return 0;for(unsigned i=0;i<count;i++)if(seen[i]==head)return 0;
  if(!read_memory(head,bytes,sizeof bytes))return 0;
  fprintf(out,"%s{\"address\":%lu,\"hex\":\"",count?",":"",head);
  for(unsigned i=0;i<sizeof bytes;i++)fprintf(out,"%02x",bytes[i]);fprintf(out,"\"}");
  seen[count++]=head;memcpy(&head,bytes+0x88,4);
 }
 fprintf(out,"]");return !ferror(out);
}
static int capture_scene_queue_observation(FILE*out){
 if(!observed_world_queue)return 0;BYTE bytes[0x58];
 if(!read_memory(observed_world_queue,bytes,sizeof bytes))return 0;
 fprintf(out,",\"sceneQueueObservation\":{\"address\":%lu,\"hex\":\"",observed_world_queue);
 for(unsigned i=0;i<sizeof bytes;i++)fprintf(out,"%02x",bytes[i]);fprintf(out,"\"");
 if(!capture_scene_queue_items(out,observed_world_queue))return 0;
 fprintf(out,"}");return !ferror(out);
}
static DWORD observed_world_hud,observed_hud_children[64];
static unsigned observed_hud_child_count;
static int capture_hud_environment(FILE*out){
 DWORD app,view,enabled,visible,menu;
 if(!read_memory(0x4e4fb4,&app,4)||!read_memory(app+0x30c,&view,4)||!read_memory(view+0x444,&visible,4)||!read_memory(app+0x700,&enabled,4)||!read_memory(app+0x614,&menu,4))return 0;
 fprintf(out,",\"hudEnvironment\":{\"app\":%lu,\"view\":%lu,\"viewEnabled\":%lu,\"enabled\":%lu,\"menu\":%lu}",app,view,visible,enabled,menu);return !ferror(out);
}
static int capture_hud_observation(FILE*out){
 if(!observed_world_hud)return 0;BYTE bytes[0x1e0];
 if(!read_memory(observed_world_hud,bytes,0x128))return 0;
 fprintf(out,",\"hudObservation\":{\"address\":%lu,\"hex\":\"",observed_world_hud);
 for(unsigned i=0;i<0x128;i++)fprintf(out,"%02x",bytes[i]);fprintf(out,"\"");
 if(!capture_hud_environment(out))return 0;
 fprintf(out,",\"children\":[");
 for(unsigned i=0;i<observed_hud_child_count;i++){
  if(!read_memory(observed_hud_children[i],bytes,sizeof bytes))return 0;
  fprintf(out,"%s{\"address\":%lu,\"hex\":\"",i?",":"",observed_hud_children[i]);
  for(unsigned j=0;j<sizeof bytes;j++)fprintf(out,"%02x",bytes[j]);fprintf(out,"\"}");
 }
 fprintf(out,"]}");return !ferror(out);
}
static DWORD observed_world_marker;
// Assertion-only snapshots at existing bike boundaries. Never restore these.
static int capture_marker_observation(FILE*out){
 if(!observed_world_marker)return 0;
 BYTE marker[0xa4],shapeBytes[0x114];DWORD shape;
 if(!read_memory(observed_world_marker,marker,sizeof marker))return 0;
 memcpy(&shape,marker+0x30,4);if(!shape||!read_memory(shape,shapeBytes,sizeof shapeBytes))return 0;
 fprintf(out,",\"markerObservation\":{\"address\":%lu,\"hex\":\"",observed_world_marker);
 for(unsigned i=0;i<sizeof marker;i++)fprintf(out,"%02x",marker[i]);
 fprintf(out,"\",\"shape\":%lu,\"shapeHex\":\"",shape);
 for(unsigned i=0;i<sizeof shapeBytes;i++)fprintf(out,"%02x",shapeBytes[i]);
 fprintf(out,"\"}");return !ferror(out);
}
// Transform dependencies for marker rotation. Follow the actual parent/child/
// sibling graph with a fixed bound; never infer identity matrices or roots.
static int capture_marker_transforms(FILE*out,DWORD root){
 typedef struct {DWORD address;BYTE bytes[0x114];} Shape;
 static Shape shapes[8192];unsigned count=1;shapes[0].address=root;
 if(!root)return 0;
 for(unsigned i=0;i<count;i++){
  Shape*n=&shapes[i];if(!read_memory(n->address,n->bytes,sizeof n->bytes))return 0;
  for(unsigned o=0x108;o<=0x110;o+=4){
   DWORD address;memcpy(&address,n->bytes+o,4);if(!address)continue;
   unsigned j;for(j=0;j<count;j++)if(shapes[j].address==address)break;
   if(j==count){if(count==8192)return 0;shapes[count++].address=address;}
  }
 }
 fprintf(out,",\"shapeTransformRoot\":%lu,\"shapeTransforms\":[",root);
 for(unsigned i=0;i<count;i++){
  fprintf(out,"%s{\"address\":%lu,\"hex\":\"",i?",":"",shapes[i].address);
  for(unsigned j=0;j<sizeof shapes[i].bytes;j++)fprintf(out,"%02x",shapes[i].bytes[j]);
  fprintf(out,"\"}");
 }
 fprintf(out,"]");return !ferror(out);
}
// Atomic read-only actor hierarchy. Separate from restorable bike blocks.
static int capture_actor_tree(DWORD bike,const char*path,const char*id){
 #define TREE_FAIL() do {fprintf(stderr,"actor-tree validation failed at line %d\n",__LINE__);return 0;}while(0)
 typedef struct {DWORD address,words[12],update,destroy,owner,gate,device,deviceEnabled;} Actor;
 static Actor nodes[8192];observed_hud_child_count=0;observed_world_hud=0;observed_world_queue=0;observed_world_renderer=0;unsigned count=0;DWORD root,parent,ancestors[128];unsigned depth=0;
 if(!read_memory(bike+0x874,&root,4)||!root)TREE_FAIL();
 for(;;){
  if(depth==128)TREE_FAIL();for(unsigned i=0;i<depth;i++)if(ancestors[i]==root)TREE_FAIL();ancestors[depth++]=root;
  if(!read_memory(root+0x18,&parent,4))TREE_FAIL();if(!parent)break;root=parent;
 }
 nodes[count++].address=root;
 for(unsigned i=0;i<count;i++){
  Actor*n=&nodes[i];DWORD address=n->address;memset(n,0,sizeof *n);n->address=address;
  if(!read_memory(address,n->words,sizeof n->words)||!n->words[0]||!read_memory(n->words[0]+0x2c,&n->update,4)||!read_memory(n->words[0]+8,&n->destroy,4))TREE_FAIL();
  if(n->words[7]){
   if(!read_memory(n->words[7],&n->owner,4)||!read_memory(n->owner+0x35c,&n->gate,4)||!read_memory(n->words[7]+4,&n->device,4))TREE_FAIL();
   if(n->device&&!read_memory(n->device+0x110,&n->deviceEnabled,4))TREE_FAIL();
  }
  DWORD child=n->words[5],previous=0;
  while(child){
   if(count==8192)TREE_FAIL();for(unsigned j=0;j<count;j++)if(nodes[j].address==child)TREE_FAIL();
   DWORD links[4];if(!read_memory(child+0xc,links,sizeof links)||links[0]!=previous||links[3]!=address)TREE_FAIL();
   nodes[count++].address=child;previous=child;child=links[1];
  }
 }
 FILE*out=fopen(path,"wx");if(!out)TREE_FAIL();
 fprintf(out,"{\"schemaVersion\":1,\"kind\":\"mcm-actor-tree\",\"captureId\":\"%s\",\"captureBoundary\":\"%s\",\"bikeAddress\":%lu,\"root\":%lu,\"nodes\":[",id,export_boundary,bike,root);
 for(unsigned i=0;i<count;i++){
  Actor*n=&nodes[i];fprintf(out,"%s{\"address\":%lu,\"hex\":\"",i?",":"",n->address);
  for(unsigned j=0;j<sizeof n->words;j++)fprintf(out,"%02x",((BYTE*)n->words)[j]);
  fprintf(out,"\",\"update\":%lu,\"destroy\":%lu,\"owner\":%lu,\"gate\":%lu,\"device\":%lu,\"deviceEnabled\":%lu",n->update,n->destroy,n->owner,n->gate,n->device,n->deviceEnabled);
  DWORD size=0;switch(n->update){case 0x43e660:size=0x9c;break;case 0x4253e0:size=0x58;break;case 0x403030:size=0x1e0;break;case 0x446200:size=0x278;break;case 0x43d850:size=0x198;break;case 0x475450:size=0xa4;break;case 0x426490:size=0x128;break;case 0x438e10:size=0x84;break;case 0x4393d0:size=0x60c;break;case 0x439a30:size=0x610;break;case 0x43a6d0:size=0x480;break;}
  if(size){BYTE bytes[0x610];if(n->words[2]!=size||!read_memory(n->address,bytes,size)){fclose(out);TREE_FAIL();}fprintf(out,",\"ownedStateHex\":\"");for(unsigned j=0;j<size;j++)fprintf(out,"%02x",bytes[j]);fprintf(out,"\"");}
  if(n->update==0x43e660)observed_world_renderer=n->address;
  if(n->update==0x4253e0){observed_world_queue=n->address;if(!capture_scene_queue_items(out,n->address)){fclose(out);TREE_FAIL();}}
  if(n->update==0x439a30){DWORD boundary[2];if(!read_memory(n->address+0x610,boundary,sizeof boundary)){fclose(out);TREE_FAIL();}fprintf(out,",\"boundaryWords\":[%lu,%lu]",boundary[0],boundary[1]);}
  if(n->update==0x475450){observed_world_marker=n->address;DWORD shape;if(!read_memory(n->address+0x30,&shape,4)||!capture_marker_transforms(out,shape)){fclose(out);TREE_FAIL();}}
  if(n->update==0x426490){observed_world_hud=n->address;if(!capture_hud_environment(out)){fclose(out);TREE_FAIL();}}
  if(n->update==0x403030){if(observed_hud_child_count==64){fclose(out);TREE_FAIL();}observed_hud_children[observed_hud_child_count++]=n->address;}
  fprintf(out,"}");
 }
 fprintf(out,"]}\n");int failed=ferror(out);return fclose(out)==0&&!failed;
 #undef TREE_FAIL
}
