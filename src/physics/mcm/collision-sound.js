const f=Math.fround;
const roundEven=x=>{const lo=Math.floor(x),fraction=x-lo;return fraction<.5?lo:fraction>.5?lo+1:lo%2===0?lo:lo+1;};
// Original 427230: choose one of six impact sounds using the application's
// shared CRT stream. Device status and playback operations remain explicit.
export function playMcmCollisionSound({random,samples,device},impulse,volume){
 if(samples.length!==6)throw Error('Collision audio requires six samples');
 const choose=()=>roundEven(f((random.draw()/32768)*6-.5));
 let index=choose(),retries=0;
 while(device.isPlaying(index)){
  if(retries>=6){device.stop(0,1);index=0;break;}
  index=choose();retries++;
 }
 const half=f((samples[index].length>>>0)*.5);
 let position=f(half-(impulse*f(.01))*half);
 if(position<0)position=0;
 if(position>half)position=half;
 device.setPosition(index,Math.trunc(position)>>>0);
 if(volume!==-1)device.setVolume(index,volume);
 device.play(index,0,0,0);
 return index;
}
