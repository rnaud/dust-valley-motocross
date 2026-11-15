import {composeMcmCameraMatrices} from './camera-matrices.js';
// Original 0x479fc0: unordered comparisons take the same branch as equality.
// The immediate-mode 0x47a190 setter receives fixed valid defaults here.
export function restoreMcmSubmissionPlanes(camera,matrices){
 const equal=(a,b)=>Number.isNaN(a)||a===b;
 if(equal(camera.far,100000)&&equal(camera.near,1))return {matrices,rebuilt:false};
 if(camera.retainedMode)throw new RangeError('Unrecovered retained-mode clip forwarding');
 camera.near=1;camera.far=100000;
 return {matrices:composeMcmCameraMatrices(camera),rebuilt:true};
}
