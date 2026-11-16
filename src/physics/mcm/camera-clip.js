// Original 47a190. Unordered comparisons select 1 for near, but preserve NaN
// for far. Retained-mode device setters and error reporting remain explicit.
export function setMcmCameraClip(camera,near,far,services={}){
 near=Math.fround(near);far=Math.fround(far);
 camera.near=near>=1?near:1;camera.far=far>100000?100000:far;
 if(camera.retainedMode){
  const invoke=(name,...args)=>{if(typeof services[name]!=='function')throw Error('Unconnected camera clip service: '+name);return services[name](...args);};
  let result=invoke('near',camera.near);
  if(!Number.isInteger(result))throw Error('Missing camera clip result');
  if(result){invoke('error',result,0x4e7a08,0x1ac);return;}
  result=invoke('far',camera.far);
  if(!Number.isInteger(result))throw Error('Missing camera clip result');
  if(result)invoke('error',result,0x4e7a08,0x1ad);
 }
}
