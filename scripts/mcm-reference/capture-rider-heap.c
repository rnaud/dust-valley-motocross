// Called while the existing capture debugger has stopped the game. Records
// Wine 11 x86 subheap headers and free-list links, never payloads. LFH
// group headers are retained as opaque blocks, not decoded as ordinary blocks.
static int capture_rider_heap(FILE*out,DWORD child){
 DWORD anchor=child+0x610,words[2],heap;
 if(!read_memory(anchor,words,8)||!read_memory(0x52572c,&heap,4))return 0;
 unsigned type=(words[1]>>16)&255,flags=words[1]>>24;
 if((type!=0x75&&type!=0x46)||(flags&~3u))return 0;
 DWORD base=(anchor&0xffff0000u)-(words[1]&65535)*65536u;
 // Primary-heap subheap layout and LFH are intentionally not inferred here.
 if(base==heap||base>anchor)return 0;
 DWORD sub[8];BYTE heapBytes[0x488];
 if(!read_memory(base,sub,sizeof sub)||sub[5]!=heap||sub[1]>0x1000000||sub[2]>sub[1]||!read_memory(heap,heapBytes,sizeof heapBytes))return 0;
 DWORD end=base+32+sub[2],cursor=base+24;int found=0;
 fprintf(out,"{\"format\":\"wine11-x86-subheap-headers\",\"child\":%lu,\"anchor\":%lu,\"heap\":%lu,\"base\":%lu,\"committedEnd\":%lu,\"heapHex\":\"",child,anchor,heap,base,end);
 if(!write_particle_hex(out,heapBytes,sizeof heapBytes))return 0;
 fprintf(out,"\",\"subheapHex\":\"");if(!write_particle_hex(out,(BYTE*)sub,sizeof sub))return 0;
 fprintf(out,"\",\"blocks\":[");
 for(unsigned i=0;cursor<end&&i<262144;i++){
  if(!read_memory(cursor,words,8))return 0;
  flags=words[1]>>24;type=(words[1]>>16)&255;
  if((type!=0x75&&type!=0x46)||(flags&~0x83u)){fprintf(stderr,"Unsupported heap header at %08lx: %08lx %08lx\n",cursor,words[0],words[1]);return 0;}
  unsigned long long units=(flags&1)?words[0]:(words[0]&65535),bytes=units*8;
  if(bytes<16||bytes>0x1000000||cursor+bytes>base+24+sub[1]){fprintf(stderr,"Invalid heap size at %08lx: %08lx %08lx\n",cursor,words[0],words[1]);return 0;}
  DWORD links[2]={0,0};if((flags&1)&&!read_memory(cursor+8,links,8))return 0;
  fprintf(out,"%s{\"header\":%lu,\"words\":[%lu,%lu],\"freeLinks\":[%lu,%lu]}",i?",":"",cursor,words[0],words[1],links[0],links[1]);
  if(cursor==anchor)found=1;
  cursor+=(DWORD)bytes;
 }
 fprintf(out,"]}");return found&&cursor>=end&&!ferror(out);
}
