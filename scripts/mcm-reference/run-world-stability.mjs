// Fixed-rate runtime check. Only atomic initialization enters this driver.
// This is stability / cross-runtime agreement, not a native timing comparison.
export async function runWorldStability({files,t,frames=1500},base){
 const {createWorldBikeRuntime}=await import(base+'scripts/mcm-reference/world-bike-runtime.mjs');
 const {connectMcmWorldSimulation}=await import(base+'src/physics/mcm/world-simulation.js');
 const cache=new Map(),node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(node);return n;};
 const terrain={root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid},runtime=createWorldBikeRuntime(files,terrain,{throttle:0,brake:0});
 const simulation=connectMcmWorldSimulation(runtime,JSON.parse(files['world-camera-initial.json']),terrain,{initialFiles:files});
 let crashFrames=0,callbacks=0;const checkpoints=[];
 for(let frame=0;frame<frames;frame++){
  const phase=frame%500;
  simulation.step(Math.fround(.02),{throttle:phase<350?1:0,brake:phase>=450?1:0,steer:phase>=100&&phase<220?.2:phase>=250&&phase<350?-.2:0},{tailControls:()=>{}});
  callbacks+=runtime.ordered.trace.length;
  for(const [address,b]of runtime.bikes){const bike=b.loaded.context.bike;if(![...bike.position,...bike.velocity,...bike.forward,...bike.up].every(Number.isFinite))throw Error(`Nonfinite bike ${address} at update ${frame}`);if(bike.field844)crashFrames++;}
  if(frame%100===0||frame===frames-1)checkpoints.push({frame,random:runtime.random.state,bikes:[...runtime.bikes].map(([address,b])=>{const view=b.projection.projectBody();return{address,body:Array.from({length:view.byteLength/4},(_,i)=>view.getUint32(i*4,true))};})});
 }
 return {frames:simulation.frame,crashFrames,callbacks,heap:simulation.heap.report(),terrainTicks:simulation.terrainNodes.ticks,checkpoints};
}
