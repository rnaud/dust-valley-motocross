import {advanceMcmAiController} from './ai-controller.js';
import {connectMcmRetainedBikeBody} from './retained-bike-body.js';
import {startMcmAnimation} from './animation-seek.js';
// Bridge owned raw AI state to the retained frame's shared semantic objects.
// The body is initialized once. Subsequent synchronization reads only live
// simulation state; it never accepts observed controller/frame outputs.
export function connectMcmRetainedAiController(c,runtime,environment){
 const body=runtime.body,projection=connectMcmRetainedBikeBody(c,body),{sync,animationWords}=projection;
 const bridge={body:runtime.body,runtime,environment,projectBody:projection.projectBody,storeRenderState:projection.storeRenderState,syncToBody:()=>{sync(true);animationWords(body,c.frameRider.bikeAnimation);animationWords(runtime.proxy,c.frameRider.riderAnimation);},advance(delta){
  bridge.syncToBody();environment.refreshActors?.();c.effect.forEach((value,i)=>runtime.envelope.setFloat32(i*4,value,true));
  const result=advanceMcmAiController(runtime,environment,delta);sync(false);
  if(result.trickSelected!==null&&result.trickSelected!==undefined){
   const i=result.trickSelected;startMcmAnimation(c.frameRider.bikeAnimation,c.frameRider.tricks[0][i]);startMcmAnimation(c.frameRider.riderAnimation,c.frameRider.tricks[1][i]);
   for(let k=0;k<4;k++)c.effect[k]=runtime.envelope.getFloat32(k*4,true);
  }
  const tokens=o=>[o.stopped,o.record?.token??0,o.frame.token,o.field30,o.blending];
  c.loopRider.bikeAnimation=tokens(c.frameRider.bikeAnimation);c.loopRider.riderAnimation=tokens(c.frameRider.riderAnimation);
  return result;
 }};
 c.aiController=bridge;return bridge;
}
