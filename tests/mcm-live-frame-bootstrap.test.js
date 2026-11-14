import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {loadLiveFrameBootstrap} from '../scripts/mcm-reference/live-frame-bootstrap.mjs';
import {compareLiveFrameTires,compareLiveFrameMotion,compareLiveFrameControls,compareLiveFrameLoopRider,compareLiveFrameFinish,compareLiveFrameEffects} from '../scripts/mcm-reference/compare-live-frame-tires.mjs';
import {advanceMcmRetainedFrame} from '../src/physics/mcm/retained-frame.js';
function fixture(boundary='tires'){
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`./fixtures/mcm/live-frame-${boundary}-wine11.json.br`,import.meta.url)))),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unrecorded terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error(`Unrecorded terrain edge ${id}:${String(key)}`);return node(target[key]);}});
  return n;};
 return {...f,input:{...f.input,terrain:{root:node(f.terrain.root),heightScale:f.terrain.heightScale,worldToGrid:f.terrain.worldToGrid}}};
}
test('connected captured frame matches original bike state at tire accumulation',()=>{
 const f=fixture(),report=compareLiveFrameTires(f.input,f.after);
 assert.equal(report.comparedWords,818);assert.equal(report.changedWords,14);assert.equal(report.differences,0);
 assert.deepEqual(report.stages,['entry','recovery','input','steering','reset','terrain','engine','contact','response','tires']);
 assert.equal(report.frontContact,1);assert.equal(report.rearContact,1);
});
test('frame bootstrap shares transform identities and fails at uninitialized continuation',()=>{
 const {input}=fixture(),loaded=loadLiveFrameBootstrap(input),c=loaded.context;
 assert.equal(c.bodyNode,loaded.visuals.bike.bodyNode);
 assert.equal(c.bodyNode,loaded.world.transformNodes.get(c.bodyNode.address));
 assert.equal(c.frameRider.bodyNode,c.bodyNode);
 assert.equal(Object.hasOwn(c.frameRider,'bike'),false);
 assert.equal(c.engineEntry.engine,c.engine);
 assert.equal(c.engineEntry.suspension,c.suspension);
 assert.equal(c.contactPhase.bodyNode,c.bodyNode);
 assert.throws(()=>advanceMcmRetainedFrame(c,{delta:Math.fround(.02),mode:loaded.mode,input:loaded.input}),/Unmapped live frame dependency: contactPhase.normalEventDecision/);
});
test('connected tire comparison rejects a whole-frame endpoint or absent explicit digital inputs',()=>{
 const f=fixture();assert.throws(()=>compareLiveFrameTires(f.input,{...f.after,phase:'after-update'}),/boundary differs/);
 assert.throws(()=>loadLiveFrameBootstrap({...f.input,throttle:undefined}),/Explicit digital/);
 const bad={...f.input.environment,captureId:'0123456789abcdef'};
 assert.throws(()=>loadLiveFrameBootstrap({...f.input,environment:bad}),/boundary differs/);
});

test('connected motion prefix matches bike, engine and body transform observations',()=>{
 const f=fixture('motion'),report=compareLiveFrameMotion(f.input,f.after);
 assert.equal(report.comparedWords,925);assert.equal(report.changedWords,24);assert.equal(report.differences,0);
 assert.equal(report.stages.at(-1),'motion');assert.equal(report.frontContact,1);assert.equal(report.rearContact,1);
 const raw=Buffer.from(f.after.matrixHex,'hex');raw.writeUInt32LE(raw.readUInt32LE(48)^1,48);
 const different=compareLiveFrameMotion(f.input,{...f.after,matrixHex:raw.toString('hex')});
 assert.equal(different.differences,1);assert.equal(different.firstDifferences[0].object,'body-local-matrix');
});

test('connected control boundary matches original bike, controller, engine and body state',()=>{
 const f=fixture('controls'),report=compareLiveFrameControls(f.input,f.after);
 assert.equal(report.comparedWords,1160);assert.equal(report.changedWords,24);assert.equal(report.differences,0);
 assert.equal(report.stages.at(-1),'controls');
 const raw=Buffer.from(f.after.riderHex,'hex');raw.writeUInt32LE((raw.readUInt32LE(0x70)^1)>>>0,0x70);
 const mismatch=compareLiveFrameControls(f.input,{...f.after,riderHex:raw.toString('hex')});
 assert.equal(mismatch.differences,1);assert.equal(mismatch.firstDifferences[0].object,'rider-controller');
 assert.throws(()=>compareLiveFrameControls(f.input,{...f.after,phase:'after-motion'}),/boundary differs/);
});

test('connected captured event/rider prefix matches original allocations, effect and random stream',()=>{
 const f=fixture('loop-rider'),report=compareLiveFrameLoopRider(f.input,f.after);
 assert.equal(report.comparedWords,1165);assert.equal(report.changedWords,25);assert.equal(report.differences,0);
 assert.deepEqual(report.stages.slice(-2),['event','rider']);
 const loaded=loadLiveFrameBootstrap(f.input);
 assert.equal(loaded.context.contactPhase.normalEventDecision.inputResult,loaded.environment.actions[8]);
 assert.equal(loaded.context.contactPhase.normalEventDecision.terrainMode,loaded.environment.terrainMode);
 assert.throws(()=>advanceMcmRetainedFrame(loaded.context,{delta:Math.fround(.02),mode:loaded.mode,input:loaded.input}),/Unmapped live frame dependency: context.frameTail/);
 const raw=Buffer.from(f.after.effectHex,'hex');raw.writeUInt32LE((raw.readUInt32LE(4)^1)>>>0,4);
 const mismatch=compareLiveFrameLoopRider(f.input,{...f.after,effectHex:raw.toString('hex')});
 assert.equal(mismatch.differences,1);assert.equal(mismatch.firstDifferences[0].object,'rider-effect');
 assert.equal(compareLiveFrameLoopRider(f.input,{...f.after,randomState:f.after.randomState^1}).differences,1);
});
test('event bootstrap rejects absent action state and terrain-mode memory',()=>{
 const {input}=fixture('loop-rider');
 assert.throws(()=>loadLiveFrameBootstrap({...input,environment:{...input.environment,actionsCaptured:false}}));
 const environment=structuredClone(input.environment);
 const local=Buffer.from(input.checkpoint.blocks.find(b=>b.address===input.checkpoint.bikeAddress).hex,'hex'),terrain=local.readUInt32LE(0x8f4);
 environment.blocks=environment.blocks.filter(b=>b.address!==terrain+0x954);environment.blockCount=environment.blocks.length;
 assert.throws(()=>loadLiveFrameBootstrap({...input,environment}),/Missing checkpoint memory/);
});

test('connected event setup matches a deliberate original crash trigger and shared random draws',()=>{
 const f=fixture('loop-rider-trigger'),report=compareLiveFrameLoopRider(f.input,f.after);
 assert.equal(report.comparedWords,1165);assert.equal(report.changedWords,46);assert.equal(report.differences,0);
 const loaded=loadLiveFrameBootstrap(f.input),stop={};
 try{advanceMcmRetainedFrame(loaded.context,{delta:Math.fround(.02),mode:loaded.mode,input:loaded.input},stage=>{if(stage==='rider')throw stop;});}catch(e){if(e!==stop)throw e;}
 assert.equal(loaded.context.bike.field844,1);assert.equal(loaded.context.bike.field8b8,3);assert.equal(loaded.context.bike.field8b4,6);
 assert.equal(loaded.random.state,3837989202);assert.equal(loaded.random.calls,3);
 assert.deepEqual(loaded.context.rider.selected,[27620160,27153472,27541184]);
 assert.equal(loaded.context.rider.kind,3);assert.equal(loaded.context.rider.flag13c,1);assert.equal(loaded.context.rider.active16c,1);
});

test('completed captured substep matches the original observed collision world',()=>{
 for(const [name,changed] of [['finish',105],['finish-trigger',146]]){
  const f=fixture(name),report=compareLiveFrameFinish(f.input,f.after);
  assert.equal(report.comparedWords,36543);assert.equal(report.changedWords,changed);assert.equal(report.differences,0);
  assert.deepEqual(report.callbackTrace,[]);assert.equal(report.stages.at(-1),'finish');
 }
 const f=fixture('finish'),afterWorld=structuredClone(f.input.afterWorld),block=afterWorld.blocks.find(b=>b.address===afterWorld.managerAddress);
 const bytes=Buffer.from(block.hex,'hex');bytes.writeUInt32LE((bytes.readUInt32LE(0xf8)^1)>>>0,0xf8);block.hex=bytes.toString('hex');
 const mismatch=compareLiveFrameFinish({...f.input,afterWorld},f.after);
 assert.equal(mismatch.differences,1);assert.equal(mismatch.firstDifferences[0].object,'collision-world');
 assert.throws(()=>compareLiveFrameFinish({...f.input,afterWorld:{...afterWorld,captureId:'other'}},f.after),/boundary differs/);
});
test('finish adapter shares player actor, rider state, transforms and grid identities',()=>{
 const {input}=fixture('finish'),loaded=loadLiveFrameBootstrap(input),c=loaded.context,w=loaded.ordered;
 const actor=w.actors.get(input.checkpoint.bikeAddress),rider=actor.rider;
 assert.equal(actor.transform,c.bodyNode);assert.equal(actor.riderTransform,c.proxy);
 assert.equal(c.collision,actor.collision);assert.equal(c.grid.cells,w.dispatch.cells);
 assert.equal(actor.velocity,c.bike.velocity);actor.velocity=[3,4,5];assert.equal(actor.velocity,c.bike.velocity);
 c.bike.velocity=[6,7,8];assert.equal(actor.velocity,c.bike.velocity);
 c.rider.flag13c=1;assert.equal(rider.flag13c,1);rider.alternateVelocity=[1,2,3];assert.equal(rider.alternateVelocity,c.rider.velocity);
 rider.angular=[4,5,6];assert.equal(rider.angular,c.rider.baseAngularVelocity);
});

test('connected normal and triggered frames match enabled effects and the real terrain query',()=>{
 for(const [name,changed] of [['effects',35],['effects-trigger',56]]){
  const f=fixture(name),report=compareLiveFrameEffects(f.input,f.after);
  assert.equal(report.comparedWords,1524);assert.equal(report.changedWords,changed);assert.equal(report.differences,0);
  assert.equal(report.stages.at(-1),'effects');assert.equal(f.after.effectQueryCount,1);
 }
});
test('effects comparison rejects emitter and query corruption and unavailable targets',()=>{
 const f=fixture('effects'),after=structuredClone(f.after);
 const bytes=Buffer.from(after.visualEffects[2].hex,'hex');bytes[0x4c]^=1;after.visualEffects[2].hex=bytes.toString('hex');
 assert.equal(compareLiveFrameEffects(f.input,after).differences,1);
 after.visualEffects=f.after.visualEffects;after.effectQueryCount=0;
 assert.equal(compareLiveFrameEffects(f.input,after).differences,1);
 const input={...f.input,row:structuredClone(f.input.row)};input.row.effectsEnvironment.shape++;
 assert.throws(()=>loadLiveFrameBootstrap(input),/target differs/);
});
