#include "capture-terrain-nodes.c"
#include "capture-terrain-resources.c"
// Assertion-only terrain state at existing world/bike boundaries. No writes to
// the game, and no additional debugger pauses.
static DWORD observed_world_terrain;
static int capture_scene_terrain_state(FILE*out,DWORD address,int nodeSnapshot,int initial){
 BYTE bytes[0x17d0],ownerBytes[0x40],cameraBytes[0x254];DWORD owner,camera,globals[2],app,debug,debugCounter;
 if(!read_memory(address,bytes,sizeof bytes))return 0;
 memcpy(&owner,bytes+0x1c,4);
 if(!read_memory(owner,ownerBytes,sizeof ownerBytes))return 0;memcpy(&camera,ownerBytes+0x2c,4);
 if(!read_memory(camera,cameraBytes,sizeof cameraBytes)||!read_memory(0x4ee04c,globals,sizeof globals)||!read_memory(0x4e4fb4,&app,4)||!read_memory(app+0x2e4,&debug,4)||!read_memory(0x4e238c,&debugCounter,4))return 0;
 fprintf(out,"{\"address\":%lu,\"hex\":\"",address);for(unsigned i=0;i<sizeof bytes;i++)fprintf(out,"%02x",bytes[i]);
 fprintf(out,"\",\"owner\":%lu,\"ownerHex\":\"",owner);for(unsigned i=0;i<sizeof ownerBytes;i++)fprintf(out,"%02x",ownerBytes[i]);
 fprintf(out,"\",\"camera\":%lu,\"cameraHex\":\"",camera);for(unsigned i=0;i<sizeof cameraBytes;i++)fprintf(out,"%02x",cameraBytes[i]);
 fprintf(out,"\",\"globals\":[%lu,%lu],\"app\":%lu,\"debugEnabled\":%lu,\"debugCounter\":%lu",globals[0],globals[1],app,debug,debugCounter);
 if(nodeSnapshot&&getenv("MCM_WORLD_TERRAIN_NODES")){if(!capture_terrain_nodes(out,address,initial))return 0;if(getenv("MCM_WORLD_TERRAIN_RESOURCES")&&!capture_terrain_resources(out,initial))return 0;}fprintf(out,"}");return !ferror(out);
}
static int capture_scene_terrain_observation(FILE*out,int nodeSnapshot){
 if(!getenv("MCM_WORLD_TERRAIN"))return 1;if(!observed_world_terrain)return 0;
 fprintf(out,",\"sceneTerrainObservation\":");return capture_scene_terrain_state(out,observed_world_terrain,nodeSnapshot,0);
}
