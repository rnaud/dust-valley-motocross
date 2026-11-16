// Metadata only. The caller holds the existing debugger stop throughout.
static int capture_heap_regions(FILE*out,DWORD heap){
 DWORD head=heap+0x54,links[2],cursor,previous=head;
 if(!read_memory(head,links,8))return 0;cursor=links[0];
 fprintf(out,",\"regions\":[");unsigned count=0;
 while(cursor!=head&&count<1024){
  DWORD address=cursor-12,meta[8];if(cursor<12||!read_memory(address,meta,sizeof meta)||meta[4]!=previous||meta[5]!=heap)return 0;
  DWORD first=address+24,end=address+32+meta[2],reserved=first+meta[1],block=first;
  if(meta[1]>0x1000000||meta[2]>meta[1])return 0;
  fprintf(out,"%s{\"address\":%lu,\"first\":%lu,\"committedEnd\":%lu,\"reservedEnd\":%lu,\"metadataHex\":\"",count?",":"",address,first,end,reserved);
  if(!write_particle_hex(out,(BYTE*)meta,sizeof meta))return 0;fprintf(out,"\",\"blocks\":[");unsigned blocks=0;
  while(block<end&&blocks<262144){
   DWORD w[2];if(!read_memory(block,w,8))return 0;unsigned flags=w[1]>>24,type=(w[1]>>16)&255;
   unsigned long long size=(unsigned long long)((flags&1)?w[0]:(w[0]&65535))*8;
   if((type!=0x75&&type!=0x46)||(flags&~0x83u)||size<16||block+size>reserved)return 0;
   fprintf(out,"%s{\"header\":%lu,\"words\":[%lu,%lu]",blocks?",":"",block,w[0],w[1]);
   if(flags&0x80){
    DWORD group[6];if((flags&1)||!read_memory(block+8,group,sizeof group))return 0;
    DWORD stride=(group[4]&65535)*8;if(stride<16||24ull+31ull*stride>size)return 0;
    fprintf(out,",\"lfh\":{\"address\":%lu,\"next\":%lu,\"freeBits\":%lu,\"affinity\":%lu,\"stride\":%lu,\"slots\":[",block+8,group[0],group[1],group[2],stride);
    for(unsigned j=0;j<31;j++){DWORD slot[2],a=block+24+j*stride;if(!read_memory(a,slot,8))return 0;
     if((slot[0]&65535)*8!=stride||(slot[1]&65535)!=j)return 0;
     fprintf(out,"%s{\"header\":%lu,\"words\":[%lu,%lu]}",j?",":"",a,slot[0],slot[1]);
    }
    fprintf(out,"]}");
   }
   fprintf(out,"}");block+=(DWORD)size;blocks++;
  }
  if(block<end)return 0;fprintf(out,"]}");previous=cursor;cursor=meta[3];count++;
 }
 fprintf(out,"]");if(cursor!=head||previous!=links[1])return 0;
 DWORD bins;if(!read_memory(heap+0x460,&bins,4))return 0;
 fprintf(out,",\"binsAddress\":%lu,\"binsHex\":\"",bins);
 if(bins){BYTE data[129*32];if(!read_memory(bins,data,sizeof data)||!write_particle_hex(out,data,sizeof data))return 0;}
 fprintf(out,"\",\"affinityHex\":\"");
 if(bins){BYTE data[129*32*4];if(!read_memory(bins+129*32,data,sizeof data)||!write_particle_hex(out,data,sizeof data))return 0;}
 fprintf(out,"\"");return !ferror(out);
}
