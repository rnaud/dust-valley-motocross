import test from 'node:test';
import assert from 'node:assert/strict';
import {connectWorldActorRuntime} from '../scripts/mcm-reference/world-actor-runtime.mjs';
function setup(){
 const player={address:100,position504:[0,0,0]},ai={address:200,position504:[0,0,0]};
 const state=()=>({referencePosition:[1,2,3],fieldc30:0,field844:0});
 const runtime={world:{entry:{refreshDevice:{controller:300,address:0,kind:0}},bikes:[player,ai],context:{world:{menu:0,paused:0,refresh:1,aiCount:1,remoteCount:1,network:0,raceKind:0},view:{target:player},player,ai:[ai],remote:[null],running:1,countdownBits:0,stopRequested:0,raceEnabled:0,marker:{address:400,enabled:1}}},bikes:new Map([100,200].map(address=>[address,{loaded:{context:{bike:state()},environment:{controllerAddress:300}}}]))};
 return runtime;
}
test('world connection follows native gates, orders physics before children and reads live marker position',()=>{
 const runtime=setup(),step=connectWorldActorRuntime(runtime),calls=[];
 step(.02,{physics(address){calls.push(address);if(address===100)runtime.bikes.get(100).loaded.context.bike.referencePosition=[10,20,30];},marker(_marker,p){calls.push(p);},children(){calls.push('children');}});
 assert.deepEqual(calls,[100,200,[10,24.25,30],'children']);
 runtime.world.context.world.paused=1;calls.length=0;step(.02,{children(){calls.push('children');}});assert.deepEqual(calls,['children']);
});
test('active force feedback, marker and network work cannot silently disappear',()=>{
 const runtime=setup();runtime.world.entry.refreshDevice={controller:300,address:500,kind:3};
 const step=connectWorldActorRuntime(runtime);
 assert.throws(()=>step(.02,{}),/forceFeedback/);
 runtime.bikes.get(100).loaded.context.bike.field844=1;
 assert.throws(()=>step(.02,{physics(){}}),/marker/);
 runtime.world.context.world.network=1;
 assert.throws(()=>step(.02,{physics(){}}),/networkPresentation/);
});
test('world connection rejects missing or conflicting initial device evidence',()=>{
 const runtime=setup();delete runtime.world.entry.refreshDevice;
 assert.throws(()=>connectWorldActorRuntime(runtime),/Missing world refresh/);
 runtime.world.entry.refreshDevice={controller:301,address:0,kind:0};
 assert.throws(()=>connectWorldActorRuntime(runtime),/controller differs/);
});
