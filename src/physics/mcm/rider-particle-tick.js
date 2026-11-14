// Original rider child callback 0x43a0c0, reset/inactive branches. Active
// particle creation needs its captured pool and is deliberately not skipped.
export function tickMcmRiderParticles(view,{dt,paused}){
 if(paused)return 1;
 if(view.getUint32(0x30,true)){
  for(let i=0;i<12;i+=4)view.setUint32(0x54+i,view.getUint32(0x48+i,true),true);
  view.setUint32(0x30,0,true);return 1;
 }
 if(!view.getUint32(0x64,true)){
  view.setFloat32(0x68,view.getFloat32(0x68,true)+dt,true);return 1;
 }
 throw Error('Active rider particles require the captured particle pool');
}
