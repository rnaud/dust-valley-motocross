// Included by the live debugger harness after read_memory is defined. Keep
// allocation identity stable even when native update/render reorder slots.
// The debug event suspends the target throughout all reads and optional audit.
static DWORD retained_pool_address,retained_particle_addresses[1000];
static BYTE retained_particle_bytes[1000][0x48];
static unsigned retained_particle_order[1000];
static int particle_address_order(const void*a,const void*b){
 DWORD x=retained_particle_addresses[*(const unsigned*)a],y=retained_particle_addresses[*(const unsigned*)b];
 return x<y?-1:x>y;
}
static int refresh_particle_observations(void){
 static BYTE buffer[65536];
 for(unsigned i=0;i<1000;i++)retained_particle_order[i]=i;
 qsort(retained_particle_order,1000,sizeof retained_particle_order[0],particle_address_order);
 for(unsigned first=0;first<1000;){
  unsigned end=first+1;DWORD start=retained_particle_addresses[retained_particle_order[first]];
  uint64_t stop=(uint64_t)start+0x48;
  if(!start||stop>UINT32_MAX)return 0;
  while(end<1000){
   DWORD next=retained_particle_addresses[retained_particle_order[end]];
   if(next<stop)return 0; // Overlapping/duplicate allocations are not a pool.
   if(next-stop>4096||(uint64_t)next+0x48-start>sizeof buffer)break;
   if((uint64_t)next+0x48>UINT32_MAX)return 0;
   stop=(uint64_t)next+0x48;end++;
  }
  if(read_memory(start,buffer,(DWORD)(stop-start))){
   for(unsigned i=first;i<end;i++){unsigned slot=retained_particle_order[i];memcpy(retained_particle_bytes[slot],buffer+retained_particle_addresses[slot]-start,0x48);}
  }else{
   // An unreadable gap must not discard otherwise readable allocations.
   for(unsigned i=first;i<end;i++){unsigned slot=retained_particle_order[i];if(!read_memory(retained_particle_addresses[slot],retained_particle_bytes[slot],0x48))return 0;}
  }
  first=end;
 }
 if(getenv("MCM_VERIFY_PARTICLE_BATCH"))for(unsigned i=0;i<1000;i++){
  BYTE bytes[0x48];if(!read_memory(retained_particle_addresses[i],bytes,sizeof bytes)||memcmp(bytes,retained_particle_bytes[i],sizeof bytes))return 0;
 }
 return 1;
}
static int write_particle_hex(FILE*out,const BYTE*bytes,unsigned size){
 static const char digits[]="0123456789abcdef";char text[8192];
 for(unsigned offset=0;offset<size;){unsigned count=size-offset;if(count>sizeof text/2)count=sizeof text/2;
  for(unsigned i=0;i<count;i++){BYTE v=bytes[offset+i];text[i*2]=digits[v>>4];text[i*2+1]=digits[v&15];}
  if(fwrite(text,2,count,out)!=count)return 0;offset+=count;
 }
 return 1;
}
static int capture_retained_particle_pool(FILE*out,DWORD pool){
 BYTE header[0x2004];
 if(!read_memory(pool,header,sizeof header))return 0;
 if(!retained_pool_address){
  retained_pool_address=pool;
  for(unsigned i=0;i<1000;i++)memcpy(retained_particle_addresses+i,header+0x44+i*4,4);
 }
 if(pool!=retained_pool_address||!refresh_particle_observations())return 0;
 fprintf(out,",\"poolAddress\":%lu,\"particleStride\":72,\"particleOrder\":\"initial-allocation-order\",\"particleBatchAudited\":%s,\"poolHex\":\"",(unsigned long)pool,getenv("MCM_VERIFY_PARTICLE_BATCH")?"true":"false");
 if(!write_particle_hex(out,header,sizeof header))return 0;
 fprintf(out,"\",\"particlesHex\":\"");
 if(!write_particle_hex(out,&retained_particle_bytes[0][0],sizeof retained_particle_bytes))return 0;
 fprintf(out,"\"");return !ferror(out);
}
