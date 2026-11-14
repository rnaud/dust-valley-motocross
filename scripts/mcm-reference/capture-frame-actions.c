// Capture logical actions used by normal bike/rider updates. Positive action
// IDs are translated through the controller's mapping before flag lookup.
// Joystick routing is deliberately unsupported until its state is captured.
static int capture_mcm_frame_actions(HANDLE process,CollisionWorldBlock*blocks,unsigned*count,DWORD controller){
 if(!controller)return 1;
 const DWORD actions[]={4,5,6,7,8,9};
 for(unsigned i=0;i<4;i++){
  DWORD device,address=controller+0x10+i*4;
  if(!collision_save(process,blocks,count,address,4)||!collision_world_read(process,address,&device,4)||device)return 0;
 }
 for(unsigned kind=0;kind<2;kind++){
  DWORD device,owner,map,address=controller+(kind?0x20:0x24);
  if(!collision_save(process,blocks,count,address,4)||!collision_world_read(process,address,&device,4))return 0;
  if(!device)continue;
  if(!collision_save(process,blocks,count,device+4,4)||!collision_world_read(process,device+4,&owner,4)||!owner)return 0;
  if(!collision_save(process,blocks,count,owner+0x7dc,4)||!collision_world_read(process,owner+0x7dc,&map,4))return 0;
  if(!map)continue;
  for(unsigned i=0;i<sizeof actions/sizeof actions[0];i++){
   DWORD code,address=map+(kind?0x3e8:0)+actions[i]*4;
   if(!collision_save(process,blocks,count,address,4)||!collision_world_read(process,address,&code,4))return 0;
   if(code==0xffffffff)continue;
   if(code>255||!collision_save(process,blocks,count,device+(kind?0x298:0x288)+code*20,4))return 0;
  }
 }
 return 1;
}
