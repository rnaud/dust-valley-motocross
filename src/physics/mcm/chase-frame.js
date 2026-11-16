import {stepMcmChaseController} from './chase-controller.js';
import {finishMcmChaseSmoothing} from './chase-post-smoothing.js';
import {applyMcmChaseClearance} from './chase-clearance.js';
import {finalizeMcmChaseCamera} from './chase-finalize.js';
import {stepMcmChaseFov,beginMcmCameraUpdate} from './chase-fov.js';
import {composeMcmCameraMatrices} from './camera-matrices.js';

// Initialized active chase path, from frame-entry inputs through matrices.
// Mode/FOV button handling at 47d9f4 remains a required caller-owned service.
// No intermediate native outputs are needed to advance this state.
export function stepMcmChaseFrame(state,input,delta,{tailControls}){
 if(typeof tailControls!=='function')throw Error('Unconnected chase tail controls');
 const controller=state.controller,camera=state.renderCamera;
 const result=stepMcmChaseController(controller,input,delta);
 const smoothed=finishMcmChaseSmoothing(controller,result,{mode:input.heading.mode,actorType:input.heading.actorType,usePrevious:input.base.usePrevious});
 const clearance=applyMcmChaseClearance(controller.camera,{...input.clearance,eye:smoothed.eye});
 finalizeMcmChaseCamera(camera,state.nodes,{...input.finalize,mode:input.heading.mode,enabled:result.headingState.enabled,eye:clearance.eye,target:smoothed.target});
 if(input.finalize.active){
  tailControls(controller);
  stepMcmChaseFov(camera,state.fovFilter,controller.camera.zoom,delta,input.finalize.ownerCounter);
  beginMcmCameraUpdate(camera);
  if(!camera.skipUpdate){
   const m=composeMcmCameraMatrices(camera);
   state.matrices=Float32Array.from([...m.projection,...m.view,...m.combined,...m.screen,m.screenScale]);
  }
 }
 return {result,smoothed,clearance};
}
