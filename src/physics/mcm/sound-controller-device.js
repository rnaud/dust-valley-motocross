import {playMcmSound,stopMcmSoundGroup} from './sound-device-control.js';
// Bind the recovered controller to its original wrapper and group traversal.
// The underlying device owns sample cursors, playback status and volume.
export function createMcmSoundControllerDevice(device,world,groups){
 return {...device,
  play(sound,loop,menuSensitive=0){return playMcmSound(world,sound,menuSensitive,0,loop,device);},
  stopGroup(handle,reset){
   if(!groups.has(handle))throw Error('Missing original audio group');
   return stopMcmSoundGroup(groups.get(handle),reset,device);
  }
 };
}
