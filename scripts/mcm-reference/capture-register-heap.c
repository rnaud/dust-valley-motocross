// Included after read_memory. Observes existing upload boundaries; adds no hooks.
static void print_register_words(FILE*out,const DWORD*words,unsigned count){
 fputc('[',out);for(unsigned i=0;i<count;i++)fprintf(out,"%s%lu",i?",":"",words[i]);fputc(']',out);
}
static int capture_register_heaps(FILE*out,DWORD cs,DWORD frame,unsigned stage){
 DWORD device,backend,priority,context_count,context_array,flags[16],pointers[16];
 DWORD states[2][4],nodes[2][514],present[2][256],positions[2][256];
 if(!read_memory(cs+4,&device,4)||!read_memory(device+0x14,&backend,4)||!read_memory(backend+0x4c,&priority,4)
 ||!read_memory(device+0x12f8,&context_count,4)||context_count>16||!read_memory(device+0x12f4,&context_array,4))return 0;
 if(context_count&&!read_memory(context_array,pointers,context_count*4))return 0;
 for(unsigned i=0;i<context_count;i++)if(!read_memory(pointers[i]+0x5c,flags+i,4))return 0;
 for(unsigned i=0;i<2;i++){
  unsigned capacity=i?224:256;
  if(!read_memory(backend+0x28+i*16,states[i],16)||states[i][3]>capacity+1
  ||!read_memory(states[i][0],nodes[i],(capacity+1)*8)||!read_memory(states[i][1],present[i],capacity*4)
  ||!read_memory(states[i][2],positions[i],capacity*4))return 0;
 }
 fprintf(out,"{\"phase\":\"upload-register-heaps\",\"frame\":%lu,\"stage\":%u,\"cs\":%lu,\"priority\":%lu,\"contextFlags\":",frame,stage,cs,priority);
 print_register_words(out,flags,context_count);
 for(unsigned i=0;i<2;i++){
  unsigned capacity=i?224:256;
  fprintf(out,",\"%s\":{\"next\":%lu,\"nodes\":",i?"pixel":"vertex",states[i][3]);print_register_words(out,nodes[i],(capacity+1)*2);
  fputs(",\"present\":",out);print_register_words(out,present[i],capacity);
  fputs(",\"positions\":",out);print_register_words(out,positions[i],capacity);fputc('}',out);
 }
 fputs("}\n",out);return 1;
}
