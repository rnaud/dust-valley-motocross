// Original CRT small-block regions and committed page metadata, captured at the
// same debugger stop as the bike/terrain state. Payloads are not allocator state.
static int capture_crt_small_heap(FILE*out){
 DWORD globals[3];if(!read_memory(0x4ec2b4,globals,sizeof globals))return 0;
 DWORD cursor=0x4ebaa0,previous=0,firstPrevious=0;unsigned regions=0;
 fprintf(out,",\"crtSmallHeap\":{\"head\":%u,\"currentRegion\":%lu,\"freePageCounter\":%lu,\"threshold\":%lu,\"regions\":[",0x4ebaa0,globals[0],globals[1],globals[2]);
 do{
  BYTE region[0x814];if(!read_memory(cursor,region,sizeof region))return 0;
  DWORD*words=(DWORD*)region,base=words[0x810/4];
  if(regions&&words[1]!=previous)return 0;if(!regions)firstPrevious=words[1];
  if(words[2]>1024||(words[3]!=0xffffffff&&words[3]>=1024)||base%4096)return 0;
  fprintf(out,"%s{\"address\":%lu,\"hex\":\"",regions?",":"",cursor);
  if(!write_particle_hex(out,region,sizeof region))return 0;fprintf(out,"\",\"pages\":[");unsigned pages=0;
  if(base)for(unsigned i=0;i<1024;i++){
   unsigned freeUnits=region[0x10+i];if(freeUnits==255)continue;if(freeUnits>240)return 0;
   BYTE page[256];DWORD address=base+i*4096;if(!read_memory(address,page,sizeof page))return 0;
   if(*(DWORD*)page<address+8||*(DWORD*)page>address+248||page[248]!=255)return 0;
   fprintf(out,"%s{\"address\":%lu,\"freeUnits\":%u,\"hex\":\"",pages?",":"",address,freeUnits);
   if(!write_particle_hex(out,page,sizeof page))return 0;fprintf(out,"\"}");pages++;
  }
  fprintf(out,"]}");previous=cursor;cursor=words[0];regions++;
 }while(cursor!=0x4ebaa0&&regions<4096);
 fprintf(out,"]}");return cursor==0x4ebaa0&&previous==firstPrevious&&!ferror(out);
}
