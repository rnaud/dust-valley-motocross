// Validation driver: initial checkpoint and clock/input protocol only.
export async function runWorldTrajectory({files,t,deltas},base){
 const {createWorldBikeRuntime}=await import(base+'scripts/mcm-reference/world-bike-runtime.mjs');
 const {connectMcmWorldSimulation}=await import(base+'src/physics/mcm/world-simulation.js');
 const cache=new Map(),node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(node);return n;};
 const terrain={root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid};
 const runtime=createWorldBikeRuntime(files,terrain,{throttle:1,brake:0}),simulation=connectMcmWorldSimulation(runtime,JSON.parse(files['world-camera-initial.json']),terrain),outputs=[];
 for(let frame=0;frame<deltas.length;frame++)simulation.step(deltas[frame],{throttle:frame<12?1:0},{
  tailControls:()=>{},stopAfterPhysics:frame===deltas.length-1,
  observeBike(address,phase,view){outputs.push({frame,address,phase,random:runtime.random.state,body:Array.from({length:view.byteLength/4},(_,i)=>view.getUint32(i*4,true))});},
 });
 return {frames:simulation.frame,outputs};
}
