// Read-only collision graph export, called while the replay debugger is stopped.
// Captures grid ownership/link bytes together; does not restore world state.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
typedef struct {DWORD address,size;BYTE *bytes;} CollisionWorldBlock;
static DWORD collision_word(const BYTE*b,unsigned o){DWORD v;memcpy(&v,b+o,4);return v;}
static int collision_world_read(HANDLE p,DWORD a,void*b,DWORD n){SIZE_T got;return a&&ReadProcessMemory(p,(void*)(uintptr_t)a,b,n,&got)&&got==n;}
#define COLLISION_BLOCK_LIMIT 4096
static int collision_save(HANDLE p,CollisionWorldBlock*b,unsigned*n,DWORD a,DWORD size){
 if(!a||!size||size>1048576||*n>=COLLISION_BLOCK_LIMIT)return 0;
 for(unsigned i=0;i<*n;i++)if(b[i].address==a)return b[i].size==size;
 CollisionWorldBlock*next=&b[(*n)++];next->address=a;next->size=size;next->bytes=malloc(size);
 return next->bytes&&collision_world_read(p,a,next->bytes,size);
}
static int collision_tree(HANDLE p,CollisionWorldBlock*b,unsigned*n,DWORD a){
 if(!a)return 1;
 for(unsigned i=0;i<*n;i++)if(b[i].address==a)return b[i].size==0x114;
 if(!collision_save(p,b,n,a,0x114))return 0;
 const BYTE*node=b[*n-1].bytes;
 return collision_tree(p,b,n,collision_word(node,0x108))&&collision_tree(p,b,n,collision_word(node,0x10c))&&collision_tree(p,b,n,collision_word(node,0x110));
}
static int collision_components(HANDLE p,CollisionWorldBlock*b,unsigned*n,DWORD a){
 DWORD count,table,root;
 if(!collision_world_read(p,a+0x230,&count,4)||!count||count>32||!collision_world_read(p,a+0x234,&table,4)||!collision_world_read(p,a+0x434,&root,4)||!root||!collision_save(p,b,n,table,count*0x40)||!collision_tree(p,b,n,root))return 0;
 for(DWORD i=0;i<count;i++){DWORD node;if(!collision_world_read(p,table+i*0x40+0x34,&node,4)||!node||!collision_tree(p,b,n,node))return 0;}
 return 1;
}
static int capture_mcm_collision_world(HANDLE process,DWORD bike,const char*path,const char*id,DWORD frame,const char*boundary){
 CollisionWorldBlock blocks[COLLISION_BLOCK_LIMIT]={0};unsigned count=0;int ok=0;FILE*out=NULL;DWORD collider,manager;
 if(!collision_world_read(process,bike+0xc88,&collider,4)||!collision_world_read(process,collider+0x98,&manager,4))goto done;
 #define SAVE(A,N) do {if(!collision_save(process,blocks,&count,(A),(N)))goto done;}while(0)
 SAVE(manager,0x3988);
 DWORD objects=collision_word(blocks[0].bytes,4),dimension=collision_word(blocks[0].bytes,0x3940),cells=collision_word(blocks[0].bytes,0x3948);
 if(!objects||objects>60||!dimension||dimension>128)goto done;
 SAVE(cells,(dimension*dimension+1)*0x18);
 SAVE(0x4e3754,8);
 for(DWORD i=0;i<objects;i++){
  DWORD address=collision_word(blocks[0].bytes,8+i*4);SAVE(address,0x110);
  const BYTE*object=blocks[count-1].bytes;DWORD entries=collision_word(object,0x8c),n=collision_word(object,0x90);
  if(collision_word(object,0)!=i||collision_word(object,0x98)!=manager||n>4096||(!entries&&n))goto done;
  if(n)SAVE(entries,n*0x18);
  if(getenv("MCM_COLLISION_ACTORS")){
   DWORD actor=collision_word(object,0x94),vtable;int found=0;
   for(unsigned j=0;j<count;j++)if(blocks[j].address==actor)found=1;
   if(!found){if(!collision_world_read(process,actor,&vtable,4))goto done;
    if(vtable==0x4d9a94){SAVE(actor,0xcc8);}else if(vtable==0x4d6404){SAVE(actor,0x3ac);}else goto done;
   }
  }
 }
 if(getenv("MCM_COLLISION_TRANSFORMS")){
  if(!getenv("MCM_COLLISION_ACTORS"))goto done;
  for(DWORD i=0;i<objects;i++){
   DWORD address=collision_word(blocks[0].bytes,8+i*4),actor,kind,proxy,vtable;
   if(!collision_world_read(process,address+0x104,&kind,4)||!collision_world_read(process,address+0x94,&actor,4))goto done;
   if(kind!=0)continue;
   if(!collision_components(process,blocks,&count,actor)||!collision_world_read(process,actor+0xc8c,&proxy,4)||!collision_world_read(process,proxy,&vtable,4)||vtable!=0x4d7b14)goto done;
   SAVE(proxy,0x438);if(!collision_components(process,blocks,&count,proxy))goto done;
  }
 }
 if(getenv("MCM_COLLISION_NOTIFICATION_GATES")){
  if(!getenv("MCM_COLLISION_ACTORS"))goto done;
  for(DWORD i=0;i<objects;i++){
   DWORD object=collision_word(blocks[0].bytes,8+i*4),kind,actor,owner,notification,world;
   if(!collision_world_read(process,object+0x104,&kind,4))goto done;
   if(kind!=0)continue;
   if(!collision_world_read(process,object+0x94,&actor,4)||!collision_world_read(process,actor+0x41c,&owner,4)||!owner||!collision_world_read(process,owner+0x3c,&notification,4)||!notification||!collision_world_read(process,notification+0x3c,&world,4)||!world)goto done;
   SAVE(owner+0x3c,4);SAVE(notification+0x3c,4);SAVE(world+0x1ec,4);
  }
 }
 out=fopen(path,"wx");if(!out)goto done;
 fprintf(out,"{\"schemaVersion\":1,\"kind\":\"mcm-collision-world-observation\",\"bikeAddress\":%lu,\"managerAddress\":%lu,\"captureId\":\"%s\",\"captureBoundary\":\"%s\",\"playerFrame\":%lu,\"notificationGatesCaptured\":%s,\"transformsCaptured\":%s,\"actorsCaptured\":%s,\"blockCount\":%u,\"blocks\":[",bike,manager,id,boundary,frame,getenv("MCM_COLLISION_NOTIFICATION_GATES")?"true":"false",getenv("MCM_COLLISION_TRANSFORMS")?"true":"false",getenv("MCM_COLLISION_ACTORS")?"true":"false",count);
 for(unsigned i=0;i<count;i++){CollisionWorldBlock*b=&blocks[i];fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",i?",":"",b->address,b->size);for(DWORD j=0;j<b->size;j++)fprintf(out,"%02x",b->bytes[j]);fprintf(out,"\"}");}
 fprintf(out,"]}\n");ok=!ferror(out);
 done:
 if(out&&fclose(out))ok=0;
 for(unsigned i=0;i<count;i++)free(blocks[i].bytes);
 if(!ok)fprintf(stderr,"Collision world export failed (%lu).\n",GetLastError());
 return ok;
 #undef SAVE
}
