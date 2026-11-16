import {mcmSqrtLookup} from './math.js';
import {playMcmCollisionSound} from './collision-sound.js';
const f=Math.fround;
// Original 4276f0/427760: distance uses X/Z only and the original sqrt table.
export function mcmCollisionSoundVolume(position,camera,pan=0){
 const x=f(Math.abs(position[0]-camera[0])),z=f(Math.abs(position[2]-camera[2]));
 const distance=x>300||z>300?300:mcmSqrtLookup(f(z*z+x*x));
 if(distance>300)return {volume:-2500,pan};
 return {volume:Math.trunc((f(distance)*f(1/300))*-2500)|0,pan:0};
}
// Original 427110. Sound playback gates belong to the audio device; retained
// selection and the random stream belong to the shared application state.
export function notifyMcmCollisionSound(state,bike,impulse,type){
 if(state.selectedBike!==bike.address||bike.state844)return;
 const {volume}=mcmCollisionSoundVolume(bike.position,state.cameraPosition);
 if(volume<=-2500)return;
 if(type===0||type===2){
  if(state.device.isPlaying(state.currentIndex))return;
  state.currentIndex=playMcmCollisionSound(state,Math.abs(impulse),volume);
 }else if(type===1){
  state.device.play(state.riderIndex,0,0,0);state.device.setVolume(state.riderIndex,volume);
 }
}
