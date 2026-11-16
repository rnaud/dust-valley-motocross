// Immutable terrain inputs accompanying the full node graph. Later boundaries
// reread and compare these bytes; changed resources fail the capture explicitly.
#define TERRAIN_BANK_LIMIT 4096
static struct TerrainObservedBank {DWORD address;BYTE bytes[0x1654];} terrain_banks[TERRAIN_BANK_LIMIT];
static DWORD terrain_bank_count,terrain_sphere_enabled,terrain_rows[17],terrain_vertex_rows[17];
static BYTE terrain_detail_lookup[65536],terrain_vertex_metadata[289*32];
static int capture_terrain_resources(FILE*out,int initial){
 DWORD sphere,rows[17],vertexRows[17];BYTE lookup[65536],metadata[289*32],bank[0x1654];
 if(!read_memory(0x4e2380,&sphere,4)||!read_memory(0x4e8490,rows,sizeof rows)||!read_memory(0x4e84d8,vertexRows,sizeof vertexRows)||!read_memory(0x508fd0,lookup,sizeof lookup)||!read_memory(0x522ba8,metadata,sizeof metadata))return 0;
 if(initial){
  terrain_bank_count=0;terrain_sphere_enabled=sphere;memcpy(terrain_rows,rows,sizeof rows);memcpy(terrain_vertex_rows,vertexRows,sizeof vertexRows);memcpy(terrain_detail_lookup,lookup,sizeof lookup);memcpy(terrain_vertex_metadata,metadata,sizeof metadata);
  for(unsigned i=0;i<terrain_node_count;i++){
   DWORD address;memcpy(&address,terrain_nodes[i].bytes+0x50,4);if(!address)return 0;unsigned j=0;for(;j<terrain_bank_count;j++)if(terrain_banks[j].address==address)break;
   if(j==terrain_bank_count){if(terrain_bank_count==TERRAIN_BANK_LIMIT)return 0;terrain_banks[j].address=address;if(!read_memory(address,terrain_banks[j].bytes,sizeof bank))return 0;terrain_bank_count++;}
  }
  fprintf(out,",\"resources\":{\"sphereEnabled\":%lu,\"rowOffsets\":[",sphere);for(unsigned i=0;i<17;i++)fprintf(out,"%s%lu",i?",":"",rows[i]);fprintf(out,"],\"vertexRows\":[");for(unsigned i=0;i<17;i++)fprintf(out,"%s%lu",i?",":"",vertexRows[i]);
  fprintf(out,"],\"detailLookupHex\":\"");terrain_node_hex(out,lookup,sizeof lookup);fprintf(out,"\",\"vertexMetadataHex\":\"");terrain_node_hex(out,metadata,sizeof metadata);fprintf(out,"\",\"banks\":[");
  for(unsigned i=0;i<terrain_bank_count;i++){fprintf(out,"%s{\"address\":%lu,\"hex\":\"",i?",":"",terrain_banks[i].address);terrain_node_hex(out,terrain_banks[i].bytes,sizeof bank);fprintf(out,"\"}");}fprintf(out,"]}");
 }else{
  if(sphere!=terrain_sphere_enabled||memcmp(rows,terrain_rows,sizeof rows)||memcmp(vertexRows,terrain_vertex_rows,sizeof vertexRows)||memcmp(lookup,terrain_detail_lookup,sizeof lookup)||memcmp(metadata,terrain_vertex_metadata,sizeof metadata))return 0;
  for(unsigned i=0;i<terrain_bank_count;i++)if(!read_memory(terrain_banks[i].address,bank,sizeof bank)||memcmp(bank,terrain_banks[i].bytes,sizeof bank))return 0;
  for(unsigned i=0;i<terrain_node_count;i++){DWORD address;memcpy(&address,terrain_nodes[i].bytes+0x50,4);unsigned j=0;for(;j<terrain_bank_count;j++)if(terrain_banks[j].address==address)break;if(j==terrain_bank_count)return 0;}
  fprintf(out,",\"resourcesUnchanged\":true");
 }
 return !ferror(out);
}
