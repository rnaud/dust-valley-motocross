import {mcmAdd as add,mcmSubtract as sub,mcmMultiply as mul,mcmDivide as div} from './x87-arithmetic.js';
// 0x47db8f..0x47dbd1, including immediate-mode setter 0x47a110.
export function stepMcmChaseFov(camera,filter,target,delta,ownerCounter){
 if(camera.retainedMode)throw new RangeError('Unrecovered retained-mode FOV forwarding');
 const f=Math.fround,value=f(filter[0]),time=f(filter[1]),dt=f(delta),elapsed=time>dt?dt:time;
 const next=f(add(mul(sub(f(target),value),div(elapsed,time)),value));filter[0]=next;
 // Both signed zeros mean keep the existing FOV; the counter still changes.
 if(next!==0)camera.fov=next;
 camera.refreshCounter=(ownerCounter+1)>>>0;
}
// Only 0x479e40..0x479e76: the full camera update continues after this prefix.
export function beginMcmCameraUpdate(camera){
 if(camera.skipUpdate)return;
 if(camera.refreshCounter)camera.refreshCounter=(camera.refreshCounter-1)>>>0;
 if(camera.refreshByte)camera.refreshByte=(camera.refreshByte-1)&255;
}
