import {createCapturedFrameRuntime} from './captured-frame-runtime.mjs';
import {bitsFloat,floatBits} from '../../src/physics/mcm/math.js';

// A runnable input history contains initialization plus input/timing only.
// Expected native observations belong to the validator, never this runtime.
export function runCapturedHistory({input,row,child,terrain:observedTerrain,frames}){
 const cache=new Map(),node=id=>{
  if(id===null)return null;if(cache.has(id))return cache.get(id);
  const raw=observedTerrain.nodes[id];if(!raw)throw Error('Unobserved terrain node');
  const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});
  return n;
 };
 const terrain={root:node(observedTerrain.root),heightScale:observedTerrain.heightScale,worldToGrid:observedTerrain.worldToGrid};
 const runtime=createCapturedFrameRuntime({...input,terrain},row,child),results=[];
 const words=object=>Object.fromEntries(Object.entries(object).flatMap(([key,value])=>{
  if(typeof value==='number')return [[key,floatBits(value)]];
  if((Array.isArray(value)||ArrayBuffer.isView(value))&&value.every(v=>typeof v==='number'))return [[key,Array.from(value,floatBits)]];
  return [];
 }));
 for(const frame of frames){
  const result=runtime.stepBike({delta:bitsFloat(frame.dtBits),throttle:frame.throttle,brake:frame.brake,steerBits:frame.steerBits});
  if(result.status!=='returned')throw Error(`Incomplete bike frame: ${result.status}`);
  const bike=words(runtime.loaded.context.bike);
  for(const event of frame.events){
   const timing={delta:bitsFloat(event.dtBits),paused:event.paused};
   if(event.kind==='rider')runtime.stepRider(timing);
   else if(event.kind==='pool')runtime.stepPool(timing);
   else throw Error('Unknown world update');
  }
  results.push({bike,rider:words(runtime.external.context.rider),engine:words(runtime.loaded.context.engine),result});
 }
 return results;
}
