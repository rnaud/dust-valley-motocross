// Read-only component/stack observations at actual substep boundaries. These
// records are assertions, never checkpoints supplied to the recovered model.
static int substep_hex(FILE*out,const BYTE*bytes,DWORD size){
 static const char digits[]="0123456789abcdef";char text[512];
 while(size){DWORD n=size>256?256:size;for(DWORD i=0;i<n;i++){text[i*2]=digits[bytes[i]>>4];text[i*2+1]=digits[bytes[i]&15];}
  if(fwrite(text,2,n,out)!=n)return 0;bytes+=n;size-=n;
 }return 1;
}
static int trace_ai_substep(const char*phase,DWORD stack){
 BYTE bytes[0xcc8];
 if(!ai_substeps_out){ai_substeps_out=fopen(getenv("MCM_AI_SUBSTEPS"),"wx");if(!ai_substeps_out)return 0;}
 FILE*out=ai_substeps_out;
 fprintf(out,"{\"phase\":\"%s\",\"captureId\":\"%s\",\"frame\":%lu,\"substep\":%lu,\"bike\":%lu,\"stackAddress\":%lu,\"stackHex\":\"",phase,frame_capture_id,player_frame-1,ai_substep,observe_ai,stack);
 if(!read_memory(stack,bytes,0xc00)||!substep_hex(out,bytes,0xc00))return 0;
 fprintf(out,"\",\"blocks\":[");
 for(unsigned i=0;i<block_count;i++){
  const Block*b=&blocks[i];if(!read_memory(b->address,bytes,b->size))return 0;
  fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",i?",":"",b->address,b->size);
  if(!substep_hex(out,bytes,b->size))return 0;fprintf(out,"\"}");
 }
 fprintf(out,"]}\n");return !ferror(out)&&fflush(out)==0;
}
