import {mcmSoundAttenuation} from './sound-distance.js';
import {playMcmWreckSound} from './wreck-sound.js';
import {mcmAdd} from './x87-arithmetic.js';
const nearestEven=x=>{const lo=Math.floor(x),p=x-lo;return p<.5?lo:p>.5?lo+1:lo%2===0?lo:lo+1;};
export function stepMcmCrashSound(manager,bike,dt,demand,device,context){
 const u=o=>manager.getUint32(o,true),put=(o,v)=>manager.setUint32(o,v>>>0,true);
 if(!u(0x108)){
  const playing=device.playing(u(0x68));device.stop(u(0x68),0);device.stopGroup(u(0x44),1);
  if(bike.getInt32(0x8b4,true)===12)device.play(u(0x7c),0);
  else{device.stop(u(0x6c),0);device.play(u(0x6c),1);if(demand||playing)device.play(u(0x68),0);}
  put(0x11c,0);manager.setFloat32(0x120,5,true);put(0x10c,0);
 }
 put(0x108,1);put(0x100,0);put(0x124,0);
 const volume=()=>mcmSoundAttenuation([0,1,2].map(i=>bike.getFloat32(0x4f8+i*4,true)),context.listener).volume;
 if(bike.getInt32(0x8c4,true)&&!device.playing(u(0x80+u(0x98)*4))){
  const gain=volume(),sounds=Array.from({length:6},(_,i)=>({handle:u(0x80+i*4),bytes:context.wreckBytes[i]}));
  put(0x98,playMcmWreckSound(sounds,100,gain,device));
 }
 if(context.rider.getInt32(0x14c,true)&&manager.getInt32(0x120,true)>=0x40a00000){
  const index=nearestEven(Math.fround(device.random()/32768*6-.5)),handle=u(0x9c+index*4);
  device.volume(handle,volume());device.play(handle,0);put(0x120,0);
 }
 if(manager.getInt32(0x11c,true)>=0x3f800000&&!u(0x10c)){device.play(u(0x60),0,1);put(0x10c,1);}
 for(const o of [0x11c,0x120])manager.setFloat32(o,mcmAdd(manager.getFloat32(o,true),dt),true);
 return 1;
}
