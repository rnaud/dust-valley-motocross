import {composeMcmCameraMatrices} from './camera-matrices.js';
// Clip setup shared by original fog entry 0x43e660 and render 0x43e6c0.
// 0x47a190 clamps near upward to 1 and far downward to 100000. Here near is
// always the literal 1. Unordered far comparisons retain the supplied NaN.
export function applyMcmFogPlanes(camera,{enabled,far},matrices){
 if(!enabled)return {matrices,rebuilt:false};
 if(camera.retainedMode)throw new RangeError('Unrecovered retained-mode fog forwarding');
 camera.near=1;far=Math.fround(far);camera.far=far>100000?100000:far;
 return {matrices:composeMcmCameraMatrices(camera),rebuilt:true};
}
