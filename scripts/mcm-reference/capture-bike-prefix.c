// Assertion-only observations around the already recovered bike entry prefix.
static FILE*world_prefix_out;
static DWORD world_prefix_pending;
static int trace_world_bike_prefix(int before,CONTEXT*c,DWORD thread){
 FILE*out=world_prefix_out;static DWORD sequence,pendingStack;
 DWORD bike=before?c->Ecx:c->Esi,owner;
 if(!read_memory(bike+0xc84,&owner,4))return 0;
 DWORD selectedOwner;if(!read_memory(observe_ai+0xc84,&selectedOwner,4))return 0;if(owner!=selectedOwner)return 1;
 DWORD stack=before?c->Esp-0xbf8:c->Esp;BYTE bytes[0xc00],body[0xcc8];
 if(before){if(world_prefix_pending)return 0;world_prefix_pending=bike;pendingStack=stack;}
 else {if(!world_prefix_pending)return 1;if(world_prefix_pending!=bike||pendingStack!=stack)return 0;world_prefix_pending=0;}
 if(!read_memory(stack,bytes,sizeof bytes)||!read_memory(bike,body,sizeof body))return 0;
 if(!out){char path[1024];snprintf(path,sizeof path,"%s\\world-bike-prefix.jsonl",getenv("MCM_WORLD_ENTRY"));out=fopen(path,"wx");if(!out)return 0;world_prefix_out=out;}
 fprintf(out,"{\"phase\":\"%s\",\"sequence\":%lu,\"bike\":%lu,\"thread\":%lu,\"stackAddress\":%lu,\"savedRegisters\":[%lu,%lu,%lu,%lu],\"stackHex\":\"",before?"before-prefix":"after-prefix",sequence++,bike,thread,stack,c->Ebp,c->Edi,c->Esi,c->Ebx);
 int ok=write_particle_hex(out,bytes,sizeof bytes);fprintf(out,"\",\"bodyHex\":\"");ok=ok&&write_particle_hex(out,body,sizeof body);fprintf(out,"\"}\n");return ok&&!ferror(out)&&fflush(out)==0;
}
