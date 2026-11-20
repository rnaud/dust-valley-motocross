import {Vector3,Quaternion,Matrix4} from 'three';
import {createWorldBikeRuntime} from '../scripts/mcm-reference/world-bike-runtime.mjs';
import {connectMcmWorldSimulation} from './physics/mcm/world-simulation.js';
import {createCapturedFrameRuntime} from '../scripts/mcm-reference/captured-frame-runtime.mjs';
import {queryMcmTerrainHeight} from './physics/mcm/terrain-height.js';
import {composeMcmWorldMatrix} from './physics/mcm/world-transform.js';
import {floatBits} from './physics/mcm/math.js';
import {displayMcmHeight} from './mcm-display-terrain.js';
import {deformableMcmTerrain} from './mcm-sand-terrain.js';
import {resetMcmBikePose} from './physics/mcm/reset-pose.js';
import {SandSurface} from './sand-physics.js';
const sceneUrl=new URL('./assets/mcm-core-scene.bin',import.meta.url).href;
const METRES=.3048;
// Rendering must not mark native lazy transform caches valid: doing so changes
// the descendant invalidation path on subsequent physics frames.
const displayMatrix=node=>node.cacheValid?node.world:node.parent?composeMcmWorldMatrix(displayMatrix(node.parent),node.local):node.local;
let scenePromise;
export function loadMcmCoreScene(){
 return scenePromise??=fetch(sceneUrl).then(async response=>{
  if(!response.ok)throw Error(`Recovered scene download failed (${response.status})`);
  const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
  const scene=await new Response(stream).json();if(scene.version!==1)throw Error('Unsupported recovered scene');return scene;
 }).catch(error=>{scenePromise=null;throw error;});
}
let worldPromise;
export function loadMcmWorldScene(){
 return worldPromise??=fetch(new URL('./assets/mcm-world-scene.bin',import.meta.url).href).then(async response=>{
  if(!response.ok)throw Error('Original shared world download failed');
  const asset=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();
  if(asset.version!==1||asset.mapId!=='quarries-dunes')throw Error('Unsupported original shared world');
  return asset.files;
 }).catch(error=>{worldPromise=null;throw error;});
}
export function createMcmCoreState(scene,{spawn={x:0,z:0,yaw:0},sand:trueSand=true,sandSurface=null}={}){
 const cache=new Map(),node=id=>{
  if(id===null)return null;if(cache.has(id))return cache.get(id);
  const raw=scene.terrain.nodes[id];if(!raw)throw Error('Missing original terrain node');
  const n={...raw,...scene.terrain.banks[raw.bankIndex]};cache.set(id,n);
  if(raw.children)n.children=raw.children.map(node);return n;
 };
 const terrain={root:node(scene.terrain.root),heightScale:scene.terrain.heightScale,worldToGrid:scene.terrain.worldToGrid};
 const shared=scene.worldFiles?createWorldBikeRuntime(scene.worldFiles,terrain,{throttle:0,brake:0}):null;
 if(shared&&scene.mapId!=='quarries-dunes')throw Error('Shared world requires its original terrain');
 const simulation=shared?connectMcmWorldSimulation(shared,JSON.parse(scene.worldFiles['world-camera-initial.json']),terrain,{initialFiles:scene.worldFiles}):null;
 const child=scene.particleAssets&&!scene.child.sprayHex?{...scene.child,sprayAddress:scene.row.visualEffects[1].address,sprayHex:scene.row.visualEffects[1].hex+scene.particleAssets.sprayTail}:scene.child;
 const runtime=shared?shared.bikes.get(shared.world.entry.bikes[0]):createCapturedFrameRuntime({...scene.input,terrain},scene.row,child),c=runtime.loaded.context;
 if(scene.mapId&&scene.mapId!=='quarries-dunes'&&!scene.terrainFactory){const center=(16**(terrain.root.level+1)/2)/terrain.worldToGrid;c.pose={position:[...(scene.sceneSettings?.defaultStartPosition??[center,100,center])],forward:[...(scene.sceneSettings?.defaultStartDirection??[0,0,1])],up:[0,1,0]};resetMcmBikePose(c);c.contactPhase.normalEventDecision.terrainMode=scene.terrainMode;runtime.loaded.environment.terrainMode=scene.terrainMode;c.frameEffects.occlusion=!!scene.shadowTarget;if(scene.shadowTarget)c.frameEffects.resolveTarget=()=>scene.shadowTarget.map(Math.fround);}
 const initial=[...c.bike.position];
 const angle=(spawn.yaw??0)-Math.atan2(c.bike.forward[0],c.bike.forward[2]),rotation=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),angle),inverse=rotation.clone().invert();
 const vector=v=>new Vector3(...v).applyQuaternion(rotation);
 const horizontal=(nx,nz)=>vector([nx-initial[0],0,nz-initial[2]]).multiplyScalar(METRES).add(new Vector3(spawn.x,0,spawn.z));
 // A custom map replaces the original terrain tree before any height is read;
 // the bootstrap above only needed a placeholder so the wheel contacts could load.
 // The contact phase and rider tick keep this terrain object, so a custom map
 // must replace its root in place rather than hand back a new object.
 if(scene.terrainFactory){
  const built=scene.terrainFactory({initial,nativeToWorld:horizontal});terrain.root=built.root;terrain.heightScale=built.heightScale;terrain.worldToGrid=built.worldToGrid;
  // The captured pose was taken standing on the original course; drop the bike
  // onto the generated one at the same place with the recovered reset routine.
  c.pose={position:[initial[0],100,initial[2]],forward:[...c.bike.forward],up:[0,1,0]};resetMcmBikePose(c);
 }
 const active=terrain;
 const ground=queryMcmTerrainHeight({...active,point:initial})[1];
 const position=v=>vector([v[0]-initial[0],v[1]-ground,v[2]-initial[2]]).multiplyScalar(METRES).add(new Vector3(spawn.x,0,spawn.z));
 const nativePoint=(x,z)=>new Vector3(x-spawn.x,0,z-spawn.z).multiplyScalar(1/METRES).applyQuaternion(inverse).add(new Vector3(initial[0],ground,initial[2]));
 const originalTerrain={...active};
 const baseHeight=(x,z)=>{const p=nativePoint(x,z);return (displayMcmHeight(originalTerrain,p.x,p.z)-ground)*METRES;};
 // A GPU fine field can be supplied as the single sand surface; otherwise the
 // CPU soil is the surface (original courses, or sand disabled).
 const renderSurface=sandSurface??new SandSurface(baseHeight),sand=trueSand?renderSurface:null;
 if(sand){const original={...active};active.root=deformableMcmTerrain(original,sand,position).root;}
 // Sand mesh tiles use their existing display cache. Cannon never advances this bike.
 const tileWorld={addBody(){},removeBody(){}};
 const state={physicsMode:'mcm-preview',physicsBackend:'recovered-core',x:0,y:0,z:0,yaw:0,pitch:0,roll:0,speed:0,vy:0,yawRate:0,gear:1,rpm:0,boost:100,steer:0,throttle:0,contacts:0,crashed:false,crashTime:0,air:false,airtime:0,slip:0,slipRatio:[0,0],wheelOmega:[0,0],tireLoads:[0,0],compression:[0,0],wheelContacts:[],wheelTransforms:[],quaternion:{x:0,y:0,z:0,w:1},landingRecovery:0,requestedLean:0,frame:0,
  engine:{gear:1,rpm:0,force:0,recovered:{released:1,randomState:12345}},visualWheelRadii:[c.contactPhase.rearRadius*METRES,c.contactPhase.radius*METRES]};
 Object.defineProperty(state,'physics',{value:{runtime,simulation,shared,terrain:active,height:sand?(x,z)=>sand.height(x,z):baseHeight,baseHeight,sand,renderSurface,nativePoint,position,vector,rotation,tileWorld,scene,spawn},enumerable:false});
 state.opponents=[];
 if(shared)for(const address of shared.world.entry.bikes.slice(1)){
  const opponent={...state,opponents:[],engine:{gear:1,rpm:0,force:0,recovered:{}}};
  Object.defineProperty(opponent,'physics',{value:{...state.physics,runtime:shared.bikes.get(address)},enumerable:false});
  sync(opponent);state.opponents.push(opponent);
 }
 sync(state);renderSurface.follow(state.x,state.z,tileWorld);return state;
}
function sync(s){
 const {runtime,position,vector}=s.physics,c=runtime.loaded.context,b=c.bike;
 const forward=vector(b.forward).normalize(),up=vector(b.up).normalize(),right=new Vector3().crossVectors(up,forward).normalize();
 up.crossVectors(forward,right).normalize();
 const q=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right,up,forward));
 // The original mesh origin sits below the wheels; adapt only the displayed
// procedural model's pivot, never the simulation's position or contact state.
 const p=position(b.position).addScaledVector(up,.88);
 s.x=p.x;s.y=p.y-.5;s.z=p.z;s.quaternion={x:q.x,y:q.y,z:q.z,w:q.w};
 s.yaw=Math.atan2(forward.x,forward.z);s.pitch=Math.asin(Math.max(-1,Math.min(1,forward.y)));s.roll=Math.atan2(-up.x*Math.cos(s.yaw)+up.z*Math.sin(s.yaw),up.y);
 const velocity=vector(b.velocity).multiplyScalar(METRES);s.speed=Math.hypot(velocity.x,velocity.z);s.vy=velocity.y;s.yawRate=vector(b.worldAngularVelocity).y;
 s.crashed=!!b.field844;s.gear=c.engine.gear+1;s.rpm=Math.round(c.engine.rpmDemand);s.throttle=c.engine.state;
 s.engine.gear=s.gear;s.engine.rpm=s.rpm;s.engine.force=c.engine.released?0:c.engine.state;
 Object.assign(s.engine.recovered,{released:c.engine.released,state:c.engine.state,gear:c.engine.gear,randomState:runtime.loaded.random.state});
 const contact=c.contactPhase;
 s.wheelTransforms=[contact.rearNode,contact.frontNode].map(n=>{
  const m=displayMatrix(n),point=position(m.slice(12,15));
  const basis=new Matrix4().fromArray(m);basis.setPosition(0,0,0);
  const nativeQ=new Quaternion().setFromRotationMatrix(basis);
  const worldRotation=s.physics.rotation.clone();
  const wheelQ=worldRotation.multiply(nativeQ);
  return {position:{x:point.x,y:point.y,z:point.z},quaternion:{x:wheelQ.x,y:wheelQ.y,z:wheelQ.z,w:wheelQ.w},direction:{x:-up.x,y:-up.y,z:-up.z}};
 });
 s.wheelContacts=[1,0].map(i=>{
  if(!(contact.heights[i]>0))return null;
  const point=position(contact.points[i+2]),normal=vector(contact.points[i+4]??b.normal).normalize();
  return {x:point.x,y:point.y,z:point.z,normal:{x:normal.x,y:normal.y,z:normal.z}};
 });
 s.tireLoads=[contact.suspensionForces.rear.force,contact.suspensionForces.front.force].map((force,i)=>{const normal=s.wheelContacts[i]?.normal;return normal?Math.max(0,vector(force).dot(new Vector3(normal.x,normal.y,normal.z))*4.4482216152605):0;});
 s.contacts=s.wheelContacts.filter(Boolean).length;s.air=s.contacts===0;
 s.compression=[contact.heights[1],contact.heights[0]].map(h=>Math.max(0,Math.min(1,h)));
 s.steer=c.componentAngle;
}
export function stepMcmCoreState(s,input,dt,{worldEvents,observe}={}){
 const {runtime,sand,renderSurface,tileWorld}=s.physics,previousAir=s.airtime;
 const steer=input.steer??((input.right?1:0)-(input.left?1:0));
 const lean=input.lean??((input.leanBack?1:0)-(input.leanForward?1:0));
 if(s.physics.simulation){
  if(worldEvents||observe)throw Error('Single-bike replay services cannot drive the shared world');
  s.physics.simulation.step(dt,{throttle:input.gas?1:0,brake:input.brake?1:0,steer:steer===0?0:-steer,lean},{tailControls:()=>{}});
  for(const opponent of s.opponents){sync(opponent);opponent.frame++;}
 }else{
 runtime.loaded.ordered.trace.length=0;
 runtime.loaded.input.longitudinalBits=floatBits(lean);
 const result=runtime.stepBike({delta:dt,throttle:input.gas?1:0,brake:input.brake?1:0,steerBits:floatBits(-steer)},observe);
 if(result.status!=='returned')throw Error(`Recovered bike stopped: ${result.status}`);
 for(const event of worldEvents??[{kind:'rider',delta:dt,paused:0},...(s.physics.scene.particleAssets?['dust','spray','exhaust'].map(kind=>({kind,delta:dt,paused:0})):[]),{kind:'pool',delta:dt,paused:0}]){
  if(event.kind==='rider')runtime.stepRider(event);
  else if(event.kind==='dust')runtime.stepDust(event);
  else if(event.kind==='spray')runtime.stepSpray(event);
  else if(event.kind==='exhaust')runtime.stepExhaust(event);
  else if(event.kind==='pool')runtime.stepPool(event);
  else throw Error('Unknown recovered world update');
 }
 }
 sync(s);s.frame++;s.crashTime=s.crashed?s.crashTime+dt:0;s.airtime=s.air?previousAir+dt:0;
 renderSurface.follow(s.x,s.z,tileWorld);
 if(sand)for(const rider of [s,...s.opponents])sand.deform(rider.wheelContacts.map((hit,i)=>hit?{...hit,load:rider.tireLoads[i],demand:i===0?rider.throttle:0}:null),dt);
 return {landed:!s.air?previousAir:0,crashed:s.crashed,boosting:false};
}
