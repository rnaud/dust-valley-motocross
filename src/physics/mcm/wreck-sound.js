import {bitsFloat} from './math.js';
const nearestEven=x=>{const lo=Math.floor(x),p=x-lo;return p<.5?lo:p>.5?lo+1:lo%2===0?lo:lo+1;};
// Original 427230. RNG and audio device state remain explicit boundaries.
export function playMcmWreckSound(sounds,impact,volume,device){
 const pick=()=>nearestEven(Math.fround(device.random()/32768*6-.5));
 let index=pick(),tries=0;
 while(device.playing(sounds[index].handle)){
  if(tries>=6){device.stop(sounds[0].handle,1);index=0;break;}
  index=pick();tries++;
 }
 const sound=sounds[index],half=Math.fround((sound.bytes>>>0)*.5);
 const raw=half-impact*bitsFloat(0x3c23d70a)*half;
 let cursor=Math.fround(raw);
 // Original fcom's carry flag also clamps unordered values to zero.
 if(!(raw>=0))cursor=0;
 if(cursor>half)cursor=half;
 device.seek(sound.handle,Math.trunc(cursor)>>>0);
 if(volume!==-1)device.volume(sound.handle,volume);
 device.play(sound.handle,0);
 return index;
}
