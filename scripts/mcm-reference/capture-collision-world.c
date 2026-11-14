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
static int capture_mcm_collision_world(HANDLE process,DWORD bike,const char*path,const char*id){
 CollisionWorldBlock blocks[123]={0};unsigned count=0;int ok=0;FILE*out=NULL;DWORD collider,manager;
 if(!collision_world_read(process,bike+0xc88,&collider,4)||!collision_world_read(process,collider+0x98,&manager,4))goto done;
 #define SAVE(A,N) do {DWORD capture_address=(A),capture_size=(N);if(!capture_address||!capture_size||capture_size>1048576||count>=123)goto done;CollisionWorldBlock*b=&blocks[count++];b->address=capture_address;b->size=capture_size;b->bytes=malloc(capture_size);if(!b->bytes||!collision_world_read(process,capture_address,b->bytes,capture_size))goto done;}while(0)
 SAVE(manager,0x394c);
 DWORD objects=collision_word(blocks[0].bytes,4),dimension=collision_word(blocks[0].bytes,0x3940),cells=collision_word(blocks[0].bytes,0x3948);
 if(!objects||objects>60||!dimension||dimension>128)goto done;
 SAVE(cells,(dimension*dimension+1)*0x18);
 SAVE(0x4e3754,4);
 for(DWORD i=0;i<objects;i++){
  DWORD address=collision_word(blocks[0].bytes,8+i*4);SAVE(address,0x110);
  const BYTE*object=blocks[count-1].bytes;DWORD entries=collision_word(object,0x8c),n=collision_word(object,0x90);
  if(collision_word(object,0)!=i||collision_word(object,0x98)!=manager||n>4096||(!entries&&n))goto done;
  if(n)SAVE(entries,n*0x18);
 }
 out=fopen(path,"wx");if(!out)goto done;
 fprintf(out,"{\"schemaVersion\":1,\"kind\":\"mcm-collision-world-observation\",\"bikeAddress\":%lu,\"managerAddress\":%lu,\"captureId\":\"%s\",\"captureBoundary\":\"player-frame-entry\",\"blockCount\":%u,\"blocks\":[",bike,manager,id,count);
 for(unsigned i=0;i<count;i++){CollisionWorldBlock*b=&blocks[i];fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",i?",":"",b->address,b->size);for(DWORD j=0;j<b->size;j++)fprintf(out,"%02x",b->bytes[j]);fprintf(out,"\"}");}
 fprintf(out,"]}\n");ok=!ferror(out);
 done:
 if(out&&fclose(out))ok=0;
 for(unsigned i=0;i<count;i++)free(blocks[i].bytes);
 if(!ok)fprintf(stderr,"Collision world export failed (%lu).\n",GetLastError());
 return ok;
 #undef SAVE
}
