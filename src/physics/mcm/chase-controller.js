import {deriveMcmChaseSource,deriveMcmChaseBase} from './chase-spatial-inputs.js';
import {prepareMcmChaseEntry} from './chase-entry.js';
import {stepMcmChaseControls} from './chase-controls.js';
import {stepMcmHeadingChase} from './chase-heading.js';
// Initialized chase path only. World/actor inputs and later view construction
// remain caller-owned; camera, target, axis and filters persist between frames.
export function stepMcmChaseController(state,input,delta){
 if(!input.initialized)throw new RangeError('Unrecovered camera initialization');
 const source=deriveMcmChaseSource(input.source).source;
 const entry=prepareMcmChaseEntry(state.camera,{mode:input.heading.mode,restoreFlag:state.restoreFlag,crashed:input.heading.crashed});
 state.restoreFlag=entry.restoreFlag;
 const base=deriveMcmChaseBase({...input.base,delta,previousTarget:state.target}).base;
 state.camera.reset=state.eyeResetFlag;
 const controls=stepMcmChaseControls(state.camera,{...input.controls,delta});
 state.eyeResetFlag=state.camera.reset;
 const result=stepMcmHeadingChase(state,{...input.heading,source,base,eyeGate:entry.eyeGate,motionGate:controls.motionGate,multiplier:controls.multiplier},delta);
 state.target=Float32Array.from(result.target);
 return {...result,source,base,eyeGate:entry.eyeGate,motionGate:controls.motionGate,multiplier:controls.multiplier};
}
