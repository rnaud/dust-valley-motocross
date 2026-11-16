import {bitsFloat,floatBits} from './math.js';
import {mcmMultiply as mul,mcmSubtract as sub,mcmAdd as add} from './x87-arithmetic.js';
export const MCM_ENGINE_SEEKS=Object.freeze([0x50e00,0x78200,0xa2600,0xe6200,0x14d200,0x192e00,0x1afe00]);
// Original 426be0 normal-riding branch. Audio device status/cursors and controls
// are explicit inputs; commands mutate the device through the supplied boundary.
export function stepMcmRidingSound(manager,bike,engine,dt,device){
 const u=o=>manager.getUint32(o,true),put=(o,v)=>manager.setUint32(o,v>>>0,true),b=o=>bike.getInt32(o,true);
 if(b(0x844)!==0)throw Error('Crash audio policy is not connected');
 const sound=o=>u(o),rpm=engine.getFloat32(0x15c,true),gear=engine.getInt32(0x158,true);
 let demand=0;
 if(b(0x614))demand=+(b(0xb04)>=0x3f800000);
 else if(b(0x618)){
  const speed=Math.fround(mul(bike.getFloat32(0x6a4,true),bitsFloat(0x3f2e8ba3)));
  demand=+((floatBits(speed)|0)>=0x41a00000);
 }else if(b(0x6f8))demand=+(engine.getInt32(0x15c,true)>0&&!(sub(manager.getFloat32(0xb4,true),rpm)>=500));
 else demand=device.throttle(4,0);
 if(u(0x108)){
  device.stop(sound(0x68),1);if(sound(0x7c))device.stop(sound(0x7c),1);put(0x108,0);
 }
 if(b(0x8c4)&&!device.playing(sound(0x78))){device.play(sound(0x78),0);device.stop(sound(0x68),1);}
 if(!demand){const playing=device.playing(sound(0x68)),position=device.position(sound(0x68));if(!playing||position>0x2b750)device.play(sound(0x6c),1);else device.stop(sound(0x6c),0);}
 else device.stop(sound(0x6c),0);
 const seek=index=>{if(!Number.isInteger(index)||index<0||index>=MCM_ENGINE_SEEKS.length)throw Error('Uncaptured engine audio seek index');device.seek(sound(0x70),MCM_ENGINE_SEEKS[index]);};
 if(device.gearSeekEnabled&&manager.getInt32(0xb8,true)<gear){seek(gear);device.play(sound(0x70),1);}
 if(!demand){if(u(0x100)){device.stop(sound(0x70),0);device.play(sound(0x68),0);if(device.gearSeekEnabled)seek(0);put(0x100,0);}}
 else{
  if(!device.playing(sound(0x70))){seek(Math.trunc(mul(mul(device.random(),1/32768),7)));device.play(sound(0x70),1);}
  if(!b(0x4bc))device.stop(sound(0x68),1);put(0x100,1);
 }
 if(!b(0x4bc)||!demand)put(0x124,0);
 else{device.stop(sound(0x70),0);device.play(sound(0x68),0);manager.setFloat32(0x124,add(manager.getFloat32(0x124,true),dt),true);}
 if(device.skid(5,0))device.play(sound(0x74),0);
 put(0xb8,gear);put(0xb4,engine.getUint32(0x15c,true));return 1;
}
