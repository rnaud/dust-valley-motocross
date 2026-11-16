import {createMcmChaseState,createMcmChaseInput} from './chase-state.js';
import {stepMcmChaseFrame} from './chase-frame.js';
import {resolveMcmWorldMatrix} from './world-transform.js';
const bits=value=>new Uint32Array(Float32Array.of(value).buffer)[0];

// A camera initialized once, then driven by retained bike/rider state. The
// initialized world/device context is stable unless explicitly replaced by
// caller-owned control inputs; no later camera observations are accepted.
export function connectMcmWorldChase(runtime,initial,terrain,{target,riderPoint}){
 const bike=runtime.bikes.get(target);
 if(!bike||!riderPoint)throw Error('Missing retained chase source');
 const state=createMcmChaseState(initial);
 const input=(controls={})=>{
  const words=initial.inputs.slice(),view=bike.projection.projectBody(),rider=bike.external.context.rider;
  for(const [i,o,n]of [[17,0x4ec,1],[18,0x4dc,1],[29,0x560,1],[32,0x844,1],[36,0x510,3],[39,0x5ec,1],[40,0x6a4,1],[42,0x6b0,1],[43,0xbfc,1],[45,0x8b4,1],[54,0x4c0,3],[57,0x620,1],[86,0x4e8,1],[87,0x4d8,1]])for(let j=0;j<n;j++)words[i+j]=view.getUint32(o+j*4,true);
  for(const [i,value]of [[46,rider.field144],[47,bike.loaded.context.rider.kind],[48,rider.field140]])words[i]=value>>>0;
  for(let j=0;j<3;j++)words[58+j]=bits(bike.loaded.visuals.bike.bodyNode.local[12+j]);
  words[63]=bits(state.renderCamera.fov);
  words[44]=runtime.world.context.world.remoteCount;
  words[76]=runtime.world.context.world.raceKind;
  const indices={keys:64,joystick:65,count:66,pov:67,button2:68,button3:69,modifierA:70,modifierB:71,active:62,ownerCounter:89};
  for(const [key,value]of Object.entries(controls)){
   if(!Object.hasOwn(indices,key)||!Number.isInteger(value))throw Error('Invalid chase control '+key);
   words[indices[key]]=value>>>0;
  }
  const alternate=initial.alternate?{...initial.alternate,height:state.controller.camera.height,bike890:view.getFloat32(0x890,true),bike8a4:view.getUint32(0x8a4,true),rider13c:rider.flag13c}:undefined;
  const mode=words[11],enabled=mode===5||mode===2||!words[32]||(words[45]===6&&!words[46])||(words[47]===2&&words[48]!==0);
  if(alternate&&!enabled)alternate.riderPoint=resolveMcmWorldMatrix(riderPoint).slice(12,15);
  return createMcmChaseInput({inputs:words,alternate},terrain,state);
 };
 return {state,input,get position(){return state.renderCamera.values.slice(0,3);},get projection(){return state.matrices.slice(32,48);},step(delta,{controls={},tailControls}={}){
  return stepMcmChaseFrame(state,input(controls),delta,{tailControls});
 }};
}
