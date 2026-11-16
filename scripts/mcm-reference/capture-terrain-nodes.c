// Lossless snapshots of the live terrain graph. The first record is complete;
// later records contain every changed allocation. All nodes are reread, and
// topology changes fail explicitly instead of silently losing new nodes.
#define TERRAIN_NODE_LIMIT 16384
static struct TerrainObservedNode {DWORD address;BYTE bytes[0x210];DWORD table,children[256];} terrain_nodes[TERRAIN_NODE_LIMIT];
static DWORD terrain_node_hash[32768],terrain_node_count,terrain_node_sequence,terrain_node_root;
static int terrain_node_insert(DWORD address){
 unsigned slot=(address*2654435761u)>>17;
 while(terrain_node_hash[slot]){if(terrain_nodes[terrain_node_hash[slot]-1].address==address)return 0;slot=(slot+1)&32767;}
 if(terrain_node_count==TERRAIN_NODE_LIMIT)return 0;terrain_nodes[terrain_node_count].address=address;terrain_node_hash[slot]=++terrain_node_count;return 1;
}
static void terrain_node_hex(FILE*out,const BYTE*bytes,unsigned size){for(unsigned i=0;i<size;i++)fprintf(out,"%02x",bytes[i]);}
static int capture_terrain_nodes(FILE*out,DWORD terrain,int initial){
 DWORD root;if(!read_memory(terrain+0x44,&root,4)||!root)return 0;
 if(initial){
  terrain_node_count=terrain_node_sequence=0;terrain_node_root=root;memset(terrain_node_hash,0,sizeof terrain_node_hash);
  if(!terrain_node_insert(root))return 0;
  for(unsigned i=0;i<terrain_node_count;i++){
   struct TerrainObservedNode*n=&terrain_nodes[i];DWORD owner;
   if(!read_memory(n->address,n->bytes,sizeof n->bytes))return 0;memcpy(&owner,n->bytes+0x5c,4);if(owner!=terrain)return 0;memcpy(&n->table,n->bytes+0x54,4);
   memset(n->children,0,sizeof n->children);if(n->table&&!read_memory(n->table,n->children,sizeof n->children))return 0;
   for(unsigned j=0;j<256;j++)if(n->children[j]&&!terrain_node_insert(n->children[j]))return 0;
  }
 }else if(!terrain_node_count||root!=terrain_node_root)return 0;
 fprintf(out,",\"nodeSnapshot\":{\"sequence\":%lu,\"full\":%s,\"root\":%lu,\"nodeCount\":%lu,\"nodes\":[",terrain_node_sequence++,initial?"true":"false",root,terrain_node_count);
 unsigned written=0;
 for(unsigned i=0;i<terrain_node_count;i++){
  struct TerrainObservedNode*n=&terrain_nodes[i];BYTE next[0x210];DWORD table[256];
  if(!initial){if(!read_memory(n->address,next,sizeof next)||memcmp(next+0x54,&n->table,4))return 0;if(n->table&&(!read_memory(n->table,table,sizeof table)||memcmp(table,n->children,sizeof table)))return 0;if(!memcmp(next,n->bytes,sizeof next))continue;memcpy(n->bytes,next,sizeof next);}
  fprintf(out,"%s{\"address\":%lu,\"hex\":\"",written++?",":"",n->address);terrain_node_hex(out,n->bytes,sizeof n->bytes);fprintf(out,"\"");
  if(initial&&n->table){fprintf(out,",\"childTable\":{\"address\":%lu,\"hex\":\"",n->table);terrain_node_hex(out,(BYTE*)n->children,sizeof n->children);fprintf(out,"\"}");}
  fprintf(out,"}");
 }
 fprintf(out,"]}");return !ferror(out);
}
