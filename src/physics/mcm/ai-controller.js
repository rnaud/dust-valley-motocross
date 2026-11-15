import {prepareMcmAiEntry} from './ai-entry.js';
import {selectMcmAiRouteSegment} from './ai-route-segment.js';
import {advanceMcmAiRouteTarget} from './ai-route-target.js';
import {computeMcmAiRaceHandicap} from './ai-race-handicap.js';
import {computeMcmAiRouteGuidance} from './ai-route-guidance.js';
import {computeMcmAiHeadingOverride,computeMcmAiAirborneSteering} from './ai-heading.js';
import {writeMcmAiAvoidanceRecord} from './ai-avoidance-record.js';
import {scanMcmAiAvoidance} from './ai-avoidance-scan.js';
import {computeMcmAiLookahead} from './ai-lookahead.js';
import {computeMcmAiJumpState,AI_JUMP_OFFSETS} from './ai-jump-state.js';
import {selectMcmAiTrick} from './ai-trick-select.js';
import {startMcmTrick} from './trick-start.js';
import {computeMcmAiSteeringControl} from './ai-steering-control.js';
import {computeMcmAiBasePitch,computeMcmAiPitchControl} from './ai-pitch-control.js';
import {computeMcmAiLandingPitch} from './ai-landing-pitch.js';
import {computeMcmAiThrottle} from './ai-throttle.js';
import {advanceMcmAiMotion} from './ai-motion.js';
import {allocateMcmOwnedArray,freeMcmOwned} from './owned-allocation.js';
import {initializeMcmAiParameters} from './ai-initial-parameters.js';
import {floatBits as bits,bitsFloat as float} from './math.js';
// Runtime controller for the validated mode-0, difficulty-zero environment.
// All mutable bike data is in a DataView. World/terrain, route, shared RNG,
// allocator and graph resources are explicit runtime dependencies, not traces.
// Other controller modes and nearby-actor interaction remain guarded.
// c owns body/proxy/envelope DataViews, route {nodes,table}, the mutable
// setup.graph (target/source/components/boundsChildren), setup bounds, and 16
// animation tuples [bikePointer,riderPointer,bikePayload,riderPayload].
// env supplies mode/race settings, routeDataLoaded/loadRouteData, player and
// actor body views, terrain queries/worldHeight/margin, shared random.draw(),
// heap {calloc,size,free}, and mutable accounting.bytes. Keep these objects
// across calls; the controller never constructs or refreshes them from outputs.
// Returns the original integer result plus diagnostic status/event flags.
// Allocation failure preserves original partial writes (and the original first
// allocation leak when the second allocation fails). Heap policy is external.
export function advanceMcmAiController(c,env,dt){
 const b=c.body;if(!(b instanceof DataView)||b.byteLength<0xcc8)throw Error('Missing AI bike body');
 const u=o=>b.getUint32(o,true),v=o=>b.getFloat32(o,true),w=(o,x)=>b.setUint32(o,x>>>0,true),put=(o,x)=>w(o,bits(x)),vec=o=>[v(o),v(o+4),v(o+8)],set=(o,a)=>a.forEach((x,i)=>put(o+i*4,x));
 if(env.mode!==0)throw Error('Unvalidated runtime AI mode');
 const {nodes,table}=c.route,head=u(0xaf0),speed=v(0x6a4),x=v(0x4f8),z=v(0x500),heading=v(0x4e0),airborne=!!u(0x4bc),velocity=vec(0x510),forward=vec(0x4c0),up=vec(0x4cc);
 if(head&&u(0xbf8)!==0)throw Error('Unvalidated runtime nearby AI interaction');
 const oldJumpCount=u(0xc44);if(head&&(u(0xb6c)&255))w(0xc44,(oldJumpCount+1)>>>0);
 const entry=prepareMcmAiEntry({routeHead:head,fieldb6c:u(0xb6c),jumpCount:oldJumpCount,routeIndex:u(0xafc),routeCount:u(0xb00),routeTable:table,pitch:v(0x4dc),upY:up[1],speed,vx:velocity[0],vz:velocity[2],heading,mode:env.mode,raceSetting:env.raceSetting,raceContext:env.raceContext,routeDataLoaded:env.routeDataLoaded},()=>env.loadRouteData(c));
 put(0xb04,entry.throttle);put(0xb08,entry.brake);if(!entry.proceed)return {status:'empty-route',result:0};
 if(!env.player||!env.random||!c.setup?.graph?.target)throw Error('Missing runtime AI environment');
 env.routeDataLoaded=entry.routeDataLoaded;w(0xc44,entry.jumpCount);w(0xafc,entry.routeIndex);
 const segment=selectMcmAiRouteSegment({head,nodes,table,x,z}),near=nodes.get(segment.address),next=nodes.get(segment.next),player=env.player.body;
 const handicap=computeMcmAiRaceHandicap({raceActive:entry.stage.raceActive,initialProgress:env.initialProgress,lap:b.getInt32(0xbe4,true),otherLap:player.getInt32(0xbe4,true),index:b.getInt32(0xc10,true),otherIndex:player.getInt32(0xc10,true),routeCount:table.length,maxProgress:v(0xb90),minProgress:v(0xb94),maxDistance:v(0xb98),minDistance:v(0xb9c),maxScale:v(0xba0),minScale:v(0xba4),currentDistance:v(0xc04),route:table.map(a=>nodes.get(a).distance),otherRoute:env.player.routeDistances});put(0xba8,handicap.scale);
 const target=advanceMcmAiRouteTarget({mode:env.mode,head,nodes,table,nearest:segment,index:u(0xafc),reference:b.getInt32(0xc08,true),x,y:v(0x4fc),z,heading,fieldBB8:u(0xbb8),fieldC3C:u(0xc3c)});w(0xafc,target.index);w(0xc3c,target.fieldC3C);
 const lookahead=initializeMcmAiParameters(env.worldHeight,0).lookahead;
 const guidance=computeMcmAiRouteGuidance({mode:env.mode,target:nodes.get(target.address),targetNext:nodes.get(target.next),nearest:near,previous:nodes.get(segment.previous),next,x,z,heading,lookahead,inverseLength:segment.inverseLength});
 const targetHeading=computeMcmAiHeadingOverride({enabled:!!u(0xbfc),threshold:segment.speed,lateralError:guidance.lateralError,segmentHeading:target.segmentHeading,targetHeading:guidance.targetHeading,heading});
 let difference,speedLimit=guidance.speedLimit,avoidance=u(0xb48);
 if(airborne)difference=computeMcmAiAirborneSteering({class27:segment.class27,targetHeading,heading,velocityHeading:entry.stage.velocityHeading,vx:velocity[0],vz:velocity[2],matrix4c0:forward[0],matrix4c8:forward[2]});
 else{
  const owner={get bytes(){return u(0x40c);},set bytes(value){w(0x40c,value);}},self={x,y:v(0x4fc),z,vx:velocity[0],vy:velocity[1],vz:velocity[2]},record=(actor,isPlayer=false)=>{const a=actor.body;return writeMcmAiAvoidanceRecord({}, {self,other:{x:a.getFloat32(0x4f8,true),y:a.getFloat32(0x4fc,true),z:a.getFloat32(0x500,true),vx:a.getFloat32(0x510,true),vy:a.getFloat32(0x514,true),vz:a.getFloat32(0x518,true)},radius:v(0xb54),player:isPlayer});};
  const playerRecord=record(env.player,true),first=allocateMcmOwnedArray(owner,env.accounting,env.heap,env.firstActors.length,20);if(!first)return {status:'allocation-failed',result:0};
  const firstActors=env.firstActors.map(a=>({self:a.id===c.id,record:record(a)})),second=allocateMcmOwnedArray(owner,env.accounting,env.heap,env.secondActors.length,20);if(!second)return {status:'allocation-failed',result:0};
  const secondActors=env.secondActors.map(a=>({self:a.id===c.id,record:record(a)}));
  const scan=scanMcmAiAvoidance({heading,targetHeading,speedLimit,lateralError:guidance.lateralError,threshold:segment.speed,range:speed,x,z,player:playerRecord,firstActors,secondActors,head,nodes});
  difference=scan.steeringDifference;speedLimit=scan.speedLimit;avoidance=scan.flag;w(0xb48,avoidance);
  freeMcmOwned(owner,env.accounting,env.heap,first);freeMcmOwned(owner,env.accounting,env.heap,second);
 }
 const look=computeMcmAiLookahead({nodes,table,head,speed,sin:entry.stage.sin,cos:entry.stage.cos,enabled:!!u(0xbb8),airborne,x,z,heading,avoidance,queryHeight:env.queryHeight,worldHeight:env.worldHeight,margin:env.margin,lookahead,routeDifference:target.routeDifference,nearestIndex:segment.index,targetIndex:target.index,point:vec(0xb80),speedLimit,steering:difference,targetHeading,turnScale:0,jumpFlag:u(0xb8c)});
 set(0xb80,look.point);w(0xb8c,look.jumpFlag);
 const oldNode=u(0xb40),ids=[0,oldNode,segment.address],words=new Uint32Array(34);words[1]=env.mode;words[2]=Number(segment.class3456);words[3]=Number(entry.stage.raceActive);words[4]=bits(handicap.progress);/* Ground-only scratch is unused; airborne flight is recomputed below. */words[5]=bits(0);words[6]=2;AI_JUMP_OFFSETS.forEach((o,i)=>words[7+i]=u(o));words[11]=oldNode?(oldNode===segment.address?2:1):0;words[32]=oldNode?nodes.get(oldNode).flag:0;words[33]=near.flag;
 const jump=computeMcmAiJumpState(words,env.random);jump[4]=ids[jump[4]];if(oldNode)nodes.get(oldNode).flag=jump[9];near.flag=jump[10];
 [0x514,0xb44,0xb64,0xb68,0xb40,0xb18,0xb20,0xb4c,0xb38].forEach((o,i)=>w(o,jump[i]));
 let trickSelected=null;
 if(airborne&&u(0xb4c)&&(bits(entry.stage.pitchAngle)|0)>=0x3f490fdb&&nodes.get(u(0xb40))?.flag){
  const trick=selectMcmAiTrick({flightTime:float(jump[11]),selector:0,delayEnabled:u(0x614),selected:0,delay:v(0x81c)},env.random);put(0x81c,trick.delay);w(0xb4c,0);
  if(trick.success){
   trickSelected=trick.selected;const setup={...c.setup,liveBoundsMin:vec(0x218),liveBoundsMax:vec(0x224),scratch540:vec(0x540),scratch54c:vec(0x54c)},r=startMcmTrick({setup,field820:u(0x820),trickIndex:trick.selected,time:v(0x8cc),bikeAnimationRecords:c.animations.map(a=>a[2]),riderAnimationRecords:c.animations.map(a=>a[3])});
   w(0x820,r.field820);w(0x710,r.field710);w(0x818,r.awardBase);w(0xb4c,r.fieldb4c);b.setUint8(0x814,r.animation);set(0x218,r.boundsMin);set(0x224,r.boundsMax);set(0x540,r.scratch540);set(0x54c,r.scratch54c);
   [4,0x10,0x14,0x30,0x2c].forEach((o,i)=>{w(o,i===1?c.animations[trick.selected][0]:r.bikeAnimation[i]);c.proxy.setUint32(o,(i===1?c.animations[trick.selected][1]:r.riderAnimation[i])>>>0,true);});r.envelope.forEach((value,i)=>c.envelope.setFloat32(i*4,value,true));
  }
 }
 const steering=computeMcmAiSteeringControl({dt,difference:look.steering,current:v(0x6f4)});put(0x6f4,steering.steering);
 let pitch=computeMcmAiBasePitch([bits(speed),u(0x6ec),bits(dt)]);
 const landing=computeMcmAiLandingPitch({airborne,flag:u(0xb64),angle:v(0xb68),verticalBias:v(0x6c8),vy:v(0x514),vx:velocity[0],vz:velocity[2],x,z,matrix4c0:forward[0],matrix4c8:forward[2],queryNormal:env.queryNormal});w(0xb64,landing.flag);put(0xb68,landing.angle);
 const command=computeMcmAiPitchControl([bits(dt),pitch,u(0x590),u(0x594),Number(airborne),avoidance,bits(landing.angle),u(0xbb8),u(0xbac),look.jumpFlag,bits(x),bits(z),bits(entry.stage.pitchAngle),Number(segment.class3456),Number(entry.stage.raceActive),bits(handicap.progress),bits(look.turnScale),bits(segment.inverseLength),bits(near.x),bits(near.z),bits(next.x),bits(next.z),next.kind]);
 let limit=bits(look.speedLimit);if(avoidance!==1&&!u(0xbfc)&&(limit|0)<0x41f00000)limit=bits(30);
 const throttle=computeMcmAiThrottle([env.mode,Number(airborne),bits(velocity[0]),bits(velocity[2]),bits(forward[0]),bits(forward[2]),bits(speed),bits(segment.speed),bits(guidance.lateralError),bits(near.speed),u(0xbfc),bits(guidance.distance),bits(steering.absoluteDifference),bits(speed),bits(dt),command[0],command[1],limit]);
 [0xb04,0xb08,0x6ec].forEach((o,i)=>w(o,throttle[i]));
 const motion=advanceMcmAiMotion({airborne,speed,turnScale:float(throttle[3]),difference:look.steering,dt,pitchAngle:entry.stage.pitchAngle,throttle:float(throttle[0]),oldSpeed:speed,heading,velocity:[velocity[0],v(0x514),velocity[2]],forward,up,fieldb6c:u(0xb6c)},c.setup.graph.target);
 set(0x510,motion.velocity);set(0x4c0,motion.forward);set(0x4cc,motion.up);put(0x6a4,motion.speed);put(0xb14,motion.oldSpeed);put(0xb0c,motion.difference);put(0xb10,motion.heading);w(0xb6c,motion.fieldb6c);
 return {status:'complete',result:1,trickSelected,rotated:motion.rotated,boosted:motion.boosted};
}
