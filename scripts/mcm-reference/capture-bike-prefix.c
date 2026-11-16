// Optional external steering controller. Only the application's input scalar is
// overridden while the player runs; no bike/AI state or time is written.
static DWORD world_steering_address,world_steering_original,world_steering_applied,world_steering_bike;
static int restore_world_steering(void){
 if(!world_steering_address)return 1;
 SIZE_T n;DWORD actual;
 if(!WriteProcessMemory(process,(void*)(uintptr_t)world_steering_address,&world_steering_original,4,&n)||n!=4||!read_memory(world_steering_address,&actual,4)||actual!=world_steering_original)return 0;
 fprintf(stderr,"steering-restored address=%08lx original=%08lx verified=1\n",world_steering_address,world_steering_original);
 world_steering_address=world_steering_bike=0;return 1;
}
static int apply_world_pursuit(DWORD bike){
 DWORD app;float position[3],target[3],velocity[3],heading;
 if(world_steering_address||!read_memory(0x4e4fb4,&app,4)||!read_memory(bike+0x4f8,position,12)||!read_memory(bike+0x4e0,&heading,4)||!read_memory(observe_ai+0x4f8,target,12)||!read_memory(observe_ai+0x510,velocity,12)||!read_memory(app+0x12d4,&world_steering_original,4))return 0;
 float desired=atan2f(target[0]+velocity[0]*.25f-position[0],target[2]+velocity[2]*.25f-position[2]),error=desired-heading;
 if(!isfinite(error))return 0;
 while(error>3.141592654f)error-=6.283185307f;while(error< -3.141592654f)error+=6.283185307f;
 float limit=world_pursuit==2?.75f:.25f;
 float steer=error*(world_pursuit==2?1.0f:.5f);if(steer>limit)steer=limit;if(steer< -limit)steer=-limit;
 memcpy(&world_steering_applied,&steer,4);world_steering_address=app+0x12d4;world_steering_bike=bike;
 SIZE_T n;DWORD actual;
 return WriteProcessMemory(process,(void*)(uintptr_t)world_steering_address,&world_steering_applied,4,&n)&&n==4&&read_memory(world_steering_address,&actual,4)&&actual==world_steering_applied;
}
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

static FILE*world_bikes_out;
static int world_pair_complete;
static int trace_world_bike_boundary(int before,CONTEXT*c,DWORD thread){
 DWORD owner,selectedOwner,state;BYTE body[0xcc8],stack[0xc00];static DWORD sequence;
 if(!read_memory(c->Esi+0xc84,&owner,4)||!read_memory(observe_ai+0xc84,&selectedOwner,4))return 0;
 if(owner!=selectedOwner)return 1;
 if(before)world_pair_complete=0;
 if(world_throttle_pulse){DWORD ai;if(!read_memory(c->Esi+0x614,&ai,4))return 0;
  if(!ai&&before){world_input_bike=c->Esi;world_input_frame=player_frame;world_input_throttle=world_throttle_pulse==4?player_frame<96:world_throttle_pulse==3?player_frame<48:world_throttle_pulse==2?player_frame<12:player_frame>=1&&player_frame<3;}
 }
 if(world_pursuit&&before&&c->Esi==world_input_bike&&!apply_world_pursuit(c->Esi))return 0;
 if(!read_memory(c->Esi,body,sizeof body)||!read_memory(c->Esp,stack,sizeof stack)||!read_memory(observed_random_address,&state,4))return 0;
 if(!world_bikes_out){char path[1024];snprintf(path,sizeof path,"%s\\world-bikes.jsonl",getenv("MCM_WORLD_ENTRY"));world_bikes_out=fopen(path,"wx");if(!world_bikes_out)return 0;}
 FILE*out=world_bikes_out;fprintf(out,"{\"phase\":\"%s\",\"sequence\":%lu,\"bike\":%lu,\"thread\":%lu,\"randomState\":%lu,\"stackAddress\":%lu,\"bodyHex\":\"",before?"before-bike":"after-bike",sequence++,c->Esi,thread,state,c->Esp);
 int ok=write_particle_hex(out,body,sizeof body);fprintf(out,"\",\"stackHex\":\"");ok=ok&&write_particle_hex(out,stack,sizeof stack);fprintf(out,"\"");ok=ok&&capture_marker_observation(out)&&capture_hud_observation(out)&&capture_scene_queue_observation(out)&&capture_scene_display_observation(out)&&capture_scene_terrain_observation(out,before&&!*(DWORD*)(body+0x614));if(world_pursuit&&c->Esi==world_steering_bike)fprintf(out,",\"steeringOverride\":{\"originalBits\":%lu,\"appliedBits\":%lu}",world_steering_original,world_steering_applied);if(before){
  DWORD app,steer,analog,longitudinal,device,kind=0;BYTE deviceByte=0;
  if(!read_memory(0x4e4fb4,&app,4)||!read_memory(app+0x12d4,&steer,4)||!read_memory(app+0x12fc,&analog,4)||!read_memory(app+0x12e8,&longitudinal,4)||!read_memory(app+0x12e4,&device,4))return 0;
  if(device&&(!read_memory(device+0x30,&kind,4)||!read_memory(device+0x5d,&deviceByte,1)))return 0;
  fprintf(out,",\"frameInput\":{\"steerBits\":%lu,\"analogBits\":%lu,\"longitudinalBits\":%lu,\"devicePresent\":%s,\"deviceKind\":",steer,analog,longitudinal,device?"true":"false");
  if(device)fprintf(out,"%lu,\"deviceByte\":%u}",kind,deviceByte);else fprintf(out,"null,\"deviceByte\":null}");
  DWORD audioOwner,notification,cameraOwner,camera,position[3];
  if(!read_memory(c->Esi+0x41c,&audioOwner,4)||!read_memory(audioOwner+0x3c,&notification,4)||!read_memory(notification+0x1c,&cameraOwner,4)||!read_memory(cameraOwner+0x2c,&camera,4)||!read_memory(camera+0x144,position,sizeof position))return 0;
  fprintf(out,",\"audioCamera\":{\"address\":%lu,\"positionBits\":[%lu,%lu,%lu]}",camera,position[0],position[1],position[2]);
 }if(world_throttle_pulse)fprintf(out,",\"playerThrottle\":%lu",world_input_throttle);fprintf(out,"}\n");if(!before&&c->Esi==world_steering_bike&&!restore_world_steering())return 0;if(!before&&c->Esi==world_input_bike)world_input_bike=0;if(!before&&c->Esi==observe_ai)world_pair_complete=1;return ok&&!ferror(out)&&fflush(out)==0;
}

static FILE*world_riders_out;
static int trace_world_rider_boundary(int before,CONTEXT*c,DWORD thread){
 DWORD rider=before?c->Ecx:c->Ebx,bike,owner,selectedOwner,child;BYTE body[0x3ac],bytes[0x618];
 static DWORD sequence,pendingRider,pendingThread,delta;
 if(!read_memory(rider+0x15c,&bike,4)||!read_memory(bike+0xc84,&owner,4)||!read_memory(observe_ai+0xc84,&selectedOwner,4))return 0;
 if(owner!=selectedOwner)return 1;
 if(before){if(pendingRider||!read_memory(c->Esp+4,&delta,4))return 0;pendingRider=rider;pendingThread=thread;}
 else {if(!pendingRider)return 1;if(pendingRider!=rider||pendingThread!=thread)return 0;pendingRider=0;}
 if(!read_memory(rider,body,sizeof body)||!read_memory(rider+0x14,&child,4)||!read_memory(child,bytes,sizeof bytes))return 0;
 if(!world_riders_out){char path[1024];snprintf(path,sizeof path,"%s\\world-riders.jsonl",getenv("MCM_WORLD_ENTRY"));world_riders_out=fopen(path,"wx");if(!world_riders_out)return 0;}
 FILE*out=world_riders_out;
 fprintf(out,"{\"phase\":\"%s\",\"sequence\":%lu,\"completedBikeFrames\":%lu,\"bike\":%lu,\"rider\":%lu,\"address\":%lu,\"thread\":%lu,\"dtBits\":%lu,\"riderHex\":\"",before?"before-rider":"after-rider",sequence++,player_frame,bike,rider,child,thread,delta);
 int ok=write_particle_hex(out,body,sizeof body);fprintf(out,"\",\"hex\":\"");ok=ok&&write_particle_hex(out,bytes,0x610);fprintf(out,"\",\"boundaryWords\":[%lu,%lu]",*(DWORD*)(bytes+0x610),*(DWORD*)(bytes+0x614));
 ok=ok&&observe_rider_collision(out,rider);fprintf(out,"}\n");return ok&&!ferror(out)&&fflush(out)==0;
}

static FILE*world_draws_out;
static int trace_world_draw(DWORD actor,int after){
 DWORD owner,player,playerProxy,aiProxy;
 if(!read_memory(observe_ai+0xc84,&owner,4)||!read_memory(owner+0x30,&player,4)||!read_memory(player+0xc8c,&playerProxy,4)||!read_memory(observe_ai+0xc8c,&aiProxy,4))return 0;
 if(actor!=player&&actor!=playerProxy&&actor!=observe_ai&&actor!=aiProxy)return 1;
 if(!world_draws_out){char path[1024];snprintf(path,sizeof path,"%s\\world-draws.jsonl",getenv("MCM_WORLD_ENTRY"));world_draws_out=fopen(path,"wx");if(!world_draws_out)return 0;}
 // The nodes array retains the selected AI observation graph. Mesh actor,
 // resources and rectangle belong to the named actor on every row.
 return write_ai_draw(world_draws_out,actor,after,frame_capture_id,NULL);
}

static FILE*world_inputs_out;
static int apply_world_throttle(CONTEXT*c,DWORD thread){
 DWORD bike;if(!read_memory(c->Esi,&bike,4))return 0;
 if(!world_inputs_out){char path[1024];snprintf(path,sizeof path,"%s\\world-inputs.jsonl",getenv("MCM_WORLD_ENTRY"));world_inputs_out=fopen(path,"wx");if(!world_inputs_out)return 0;}
 fprintf(world_inputs_out,"{\"activeBike\":%lu,\"applied\":%s,\"frame\":%lu,\"bike\":%lu,\"thread\":%lu,\"originalThrottle\":%lu,\"throttle\":%lu}\n",world_input_bike,world_input_bike&&bike==world_input_bike?"true":"false",world_input_frame,bike,thread,c->Eax,world_input_throttle);
 if(ferror(world_inputs_out)||fflush(world_inputs_out))return 0;
 if(world_input_bike&&bike==world_input_bike)c->Eax=world_input_throttle;return 1;
}
