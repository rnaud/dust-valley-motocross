import {stepMcmFactorChase} from './chase-factor.js';
import {stepMcmAlternateEye} from './chase-alternate-eye.js';
const f=Math.fround;
// Original 0x47c30c..0x47c3e6. Numeric field names retain unresolved meaning.
export function deriveMcmChaseHeading(camera,input){
 let angle=0;
 if(input.mode===3)angle=f(f(input.bike6b0)*f(input.multiplier)*f(.55));
 else if(!input.eyeGate&&(!input.bikeBfc||(input.manager314|0)>1))angle=f(f(input.bike6b0)*f(input.multiplier)*f(.42));
 const enabled=input.mode===5||input.mode===2||!input.crashed||(input.bike8b4===6&&!input.rider144)||(input.rider170===2&&input.rider140!==0)?1:0;
 return {angle,heading:f(f(camera.yaw)+angle),enabled};
}
export function selectMcmChasePath(mode,enabled){
 if(mode===5)return 'fixed-target';
 if(!enabled)return 'alternate-eye';
 if(mode===3)return 'rider-position';
 return 'active';
}
// Preserve actual dispatch: alternate paths must not silently use this chain.
export function stepMcmHeadingChase(state,input,delta){
 const heading=deriveMcmChaseHeading(state.camera,input),path=selectMcmChasePath(input.mode,heading.enabled);
 if(path==='alternate-eye')return {...stepMcmAlternateEye(state,{...input,...heading},delta),headingState:heading};
 if(path!=='active')throw Error('Unrecovered chase path: '+path);
 if(input.mode===4)state.settings=Float32Array.of(state.camera.radius,state.camera.pitch,state.camera.yaw,state.camera.zoom);
 return {...stepMcmFactorChase(state,{...input,...heading},delta),headingState:heading};
}
