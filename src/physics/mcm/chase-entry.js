// Original 0x47b3e7..0x47b452, before base construction and input controls.
// Keep this gate before controls: a key can cross the yaw threshold this frame.
export function prepareMcmChaseEntry(camera,{mode,restoreFlag,crashed}){
 if(mode!==6&&restoreFlag&&!crashed){
  restoreFlag=0;
  [camera.radius,camera.pitch,camera.yaw]=camera.backup;
 }
 return {restoreFlag,eyeGate:Math.abs(camera.yaw)>2?1:0};
}
