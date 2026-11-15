import {aimMcmCamera} from './camera-target.js';
// Original normal finalization at 0x47d945..0x47d9f4, and inactive visibility
// at 0x47dbde..0x47dc06. Audio globals and retained-mode forwarding excluded.
export function finalizeMcmChaseCamera(camera,nodes,input){
 if(camera.retainedMode)throw new RangeError('Unrecovered retained-mode camera forwarding');
 const special=input.active&&input.mode===3&&input.enabled;
 for(const node of nodes){node.flag12c=special?1:0;if(special)node.fields240.fill(0);}
 if(!input.active)return;
 camera.values.splice(0,3,...input.eye);
 camera.values[9]=special?Math.fround(input.bike4e8*input.bike4d8):0;
 aimMcmCamera(camera,input.target,input.ownerCounter);
}
