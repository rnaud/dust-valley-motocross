// Included by the live debugger harness after read_memory is defined. Keep
// allocation identity stable even when native update/render reorder slots.
static DWORD retained_pool_address,retained_particle_addresses[1000];
static int capture_retained_particle_pool(FILE*out,DWORD pool){
 BYTE header[0x2004],particle[0x48];
 if(!read_memory(pool,header,sizeof header))return 0;
 if(!retained_pool_address){
  retained_pool_address=pool;
  for(unsigned i=0;i<1000;i++)memcpy(retained_particle_addresses+i,header+0x44+i*4,4);
 }
 if(pool!=retained_pool_address)return 0;
 fprintf(out,",\"poolAddress\":%lu,\"particleStride\":72,\"particleOrder\":\"initial-allocation-order\",\"poolHex\":\"",pool);
 for(unsigned i=0;i<sizeof header;i++)fprintf(out,"%02x",header[i]);
 fprintf(out,"\",\"particlesHex\":\"");
 for(unsigned i=0;i<1000;i++){
  if(!read_memory(retained_particle_addresses[i],particle,sizeof particle))return 0;
  for(unsigned j=0;j<sizeof particle;j++)fprintf(out,"%02x",particle[j]);
 }
 fprintf(out,"\"");return !ferror(out);
}
