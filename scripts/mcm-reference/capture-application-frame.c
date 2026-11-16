// Outer application boundaries in the same recording as both bikes. Only the
// clock return is an external scheduler input; subsequent state is assertions.
static int capture_world_application;
static DWORD observed_application;
static FILE*world_application_out;
static int write_application_frame(FILE*out,const char*phase,DWORD frame,DWORD delta){
 DWORD table,root,rootTable,values[9],offsets[]={8,0x10,0x318,0x430,0x444,0x464,0x468,0,0};
 if(!read_memory(observed_application,&table,4))return 0;
 for(unsigned i=0;i<7;i++)if(!read_memory(observed_application+offsets[i],values+i,4))return 0;
 root=values[3];
 DWORD draw,present,update;
 if(!read_memory(table+0x24,&draw,4)||!read_memory(table+0x2c,&present,4)||!read_memory(root,&rootTable,4)||!read_memory(rootTable+0x2c,&update,4))return 0;
 fprintf(out,"{\"phase\":\"%s\",\"frame\":%lu,\"deltaBits\":%lu,\"app\":%lu,\"table\":%lu,\"owner\":%lu,\"input\":%lu,\"optional\":%lu,\"root\":%lu,\"paused\":%lu,\"current\":%lu,\"previous\":%lu,\"rootTable\":%lu,\"draw\":%lu,\"present\":%lu,\"update\":%lu}\n",phase,frame,delta,observed_application,table,values[0],values[1],values[2],root,values[4],values[5],values[6],rootTable,draw,present,update);
 return !ferror(out)&&!fflush(out);
}
static int capture_initial_application(const char*dir,DWORD delta){
 if(!read_memory(0x4e4fb4,&observed_application,4))return 0;
 char path[1024];snprintf(path,sizeof path,"%s\\world-application-initial.json",dir);FILE*out=fopen(path,"wx");if(!out)return 0;
 int ok=write_application_frame(out,"world-entry",0,delta);if(fclose(out))ok=0;
 snprintf(path,sizeof path,"%s\\world-application-observations.jsonl",dir);world_application_out=fopen(path,"wx");return ok&&world_application_out;
}
static int trace_application_frame(unsigned phase,CONTEXT*c){
 if(phase>7)return 0;
 if((phase==0?c->Ecx:c->Esi)!=observed_application)return 1;
 const char*names[]={"entry","clock-after","input-after","optional-after","update-after","draw-after","present-after","exit"};
 // Player frame advances inside the scene update, before the outer tail.
 if(phase>=4&&!player_frame)return 0;
 return write_application_frame(world_application_out,names[phase],phase>=4?player_frame-1:player_frame,0);
}
