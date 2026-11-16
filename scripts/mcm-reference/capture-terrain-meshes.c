// Mesh observations are assertion targets. Allocator events expose service
// boundaries; they do not reconstruct the CRT heap or replace simulation bytes.
static FILE*terrain_allocation_out;
static struct TerrainObservedMesh {DWORD pointer,size;BYTE*bytes;} terrain_meshes[TERRAIN_NODE_LIMIT][2];
static int terrain_known_node(DWORD address){
 unsigned slot=(address*2654435761u)>>17;
 while(terrain_node_hash[slot]){if(terrain_nodes[terrain_node_hash[slot]-1].address==address)return 1;slot=(slot+1)&32767;}
 return 0;
}
static int capture_terrain_meshes(FILE*out,int initial){
 BYTE builder[0x2d34],indices[0xc00],buffer[289*32];DWORD normals,textureScale,accounting;
 if(!read_memory(0x51f0e0,builder,sizeof builder)||!read_memory(0x521e18,indices,sizeof indices)||!read_memory(0x4e8524,&normals,4)||!read_memory(0x524fd8,&textureScale,4)||!read_memory(0x4e5670,&accounting,4))return 0;
 if(initial){char path[1024];const char*dir=getenv("MCM_WORLD_ENTRY");if(!dir||terrain_allocation_out)return 0;snprintf(path,sizeof path,"%s\\terrain-allocation-events.jsonl",dir);terrain_allocation_out=fopen(path,"wx");if(!terrain_allocation_out)return 0;}
 fprintf(out,",\"meshSnapshot\":{\"sequence\":%lu,\"full\":%s,\"normalsEnabled\":%lu,\"textureScaleBits\":%lu,\"accountingBytes\":%lu,\"builderHex\":\"",terrain_node_sequence-1,initial?"true":"false",normals,textureScale,accounting);terrain_node_hex(out,builder,sizeof builder);fprintf(out,"\",\"indicesHex\":\"");terrain_node_hex(out,indices,sizeof indices);fprintf(out,"\",\"buffers\":[");
 unsigned written=0;
 for(unsigned i=0;i<terrain_node_count;i++)for(unsigned kind=0;kind<2;kind++){
  DWORD pointer,capacity;memcpy(&pointer,terrain_nodes[i].bytes+0x1b8+kind*4,4);memcpy(&capacity,terrain_nodes[i].bytes+0x1c8+kind*4,4);
  if(capacity>(kind?1536:289))return 0;DWORD size=pointer?capacity*(kind?2:32):0;struct TerrainObservedMesh*old=&terrain_meshes[i][kind];
  if(size&&!read_memory(pointer,buffer,size))return 0;
  if(!initial&&pointer==old->pointer&&size==old->size&&(!size||!memcmp(buffer,old->bytes,size)))continue;
  fprintf(out,"%s{\"node\":%lu,\"kind\":%u,\"pointer\":%lu,\"size\":%lu,\"hex\":\"",written++?",":"",terrain_nodes[i].address,kind,pointer,size);terrain_node_hex(out,buffer,size);fprintf(out,"\"}");
  if(size!=old->size){free(old->bytes);old->bytes=size?malloc(size):NULL;if(size&&!old->bytes)return 0;}
  if(size)memcpy(old->bytes,buffer,size);old->pointer=pointer;old->size=size;
 }
 fprintf(out,"]}");return !ferror(out);
}
static int trace_terrain_allocation(unsigned phase,CONTEXT*c){
 int entry=phase==0||phase==2||phase==6;
 DWORD owner=entry?c->Ecx:c->Edi;
 if(!terrain_allocation_out)return 0;DWORD ownerBytes,globalBytes,arg=0,arg2=0,caller=0;
 if(!read_memory(owner+8,&ownerBytes,4)||!read_memory(0x4e5670,&globalBytes,4))return 0;
 if(entry&&!read_memory(c->Esp+4,&arg,4))return 0;
 if(phase==6&&!read_memory(c->Esp+8,&arg2,4))return 0;
 DWORD returnOffset=entry?0:(phase==3||phase==4)?12:8;
 if(!read_memory(c->Esp+returnOffset,&caller,4))return 0;
 const char*names[]={"malloc-entry","malloc-result","free-entry","size-global","size-owner","free-call","calloc-entry","calloc-result"};
 fprintf(terrain_allocation_out,"{\"phase\":\"%s\",\"frame\":%lu,\"terrain\":%s,\"caller\":%lu,\"owner\":%lu,\"ownerBytes\":%lu,\"globalBytes\":%lu,\"argument\":%lu,\"argument2\":%lu,\"eax\":%lu,\"esi\":%lu}\n",names[phase],player_frame,terrain_known_node(owner)?"true":"false",caller,owner,ownerBytes,globalBytes,arg,arg2,c->Eax,c->Esi);
 return !ferror(terrain_allocation_out)&&fflush(terrain_allocation_out)==0;
}
