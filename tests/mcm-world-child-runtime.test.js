import test from 'node:test';
import assert from 'node:assert/strict';
import {connectWorldChildRuntime} from '../scripts/mcm-reference/world-child-runtime.mjs';
function setup(){
 const node=(address,update)=>({address,update,enabled:1,paused:0,removed:0,ownerAddress:0,first:null,next:null,previous:null,parent:null});
 const root=node(1,0x4590b0),group=node(2,0x420760),first=node(3,0x40e990),custom=node(4,0x438e10),second=node(5,0x40e990);
 root.first=group;group.parent=root;group.first=first;first.parent=group;first.next=custom;custom.previous=first;custom.parent=group;custom.next=second;second.previous=custom;second.parent=group;
 const nodes=new Map([root,group,first,custom,second].map(n=>[n.address,n]));
 return {world:{entry:{actor:1},tree:{nodes,owners:new Map()}},bikes:new Map([[100,{external:{context:{rider:{address:3}}}}],[200,{external:{context:{rider:{address:5}}}}]])};
}
test('child scheduler uses linked order, runtime pause gates and custom-update mutations',()=>{
 const runtime=setup(),step=connectWorldChildRuntime(runtime),calls=[];
 step(.02,{rider:bike=>calls.push(bike),actor:node=>calls.push(node.address)});assert.deepEqual(calls,[100,4,200]);
 runtime.world.tree.nodes.get(3).paused=1;calls.length=0;
 step(.02,{rider:bike=>calls.push(bike),actor:node=>{calls.push(node.address);node.next=null;}});assert.deepEqual(calls,[4]);
});
test('custom child methods and active polling require connected services',()=>{
 const runtime=setup(),step=connectWorldChildRuntime(runtime);
 assert.throws(()=>step(.02,{rider(){}}),/Unconnected child service: actor/);
 runtime.world.tree.owners.set(9,{gate:1});
 assert.throws(()=>connectWorldChildRuntime(runtime),/active world child polling/);
});
