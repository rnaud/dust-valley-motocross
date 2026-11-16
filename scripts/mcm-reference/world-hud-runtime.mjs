import {CapturedBytes} from '../../src/physics/mcm/captured-bytes.js';
import assert from '../../src/physics/mcm/captured-invariants.js';
// Original 426490 and inactive 403030 paths. Active display content/animation
// is not silently skipped: it requires further recovery and fails explicitly.
export function connectWorldHudRuntime(runtime){
 const actors=new Map(),children=new Set(),world=runtime.world;
 for(const actor of world.tree.nodes.values()){
  if(actor.update!==0x426490||!actor.hudEnvironment)continue;
  const e=actor.hudEnvironment,b=CapturedBytes.from(world.entry.worldHex,'hex');
  assert.equal(actor.stateBytes?.length,0x128);
  assert.equal(e.app,world.entry.world);assert.equal(e.view,b.readUInt32LE(0x30c));
  assert.equal(e.enabled,b.readUInt32LE(0x700));assert.equal(e.menu,b.readUInt32LE(0x614));
  assert.ok(Number.isInteger(e.viewEnabled)&&e.viewEnabled>=0&&e.viewEnabled<=0xffffffff);
  const descendants=new Set();
  const visit=node=>{for(let child=node.first;child;child=child.next){assert.ok(!descendants.has(child.address));descendants.add(child.address);children.add(child.address);visit(child);}};
  visit(actor);actors.set(actor.address,{actor,environment:{...e},descendants});
 }
 return {actors,step(node,dt,traverse){
  const hud=actors.get(node.address);
  if(hud){
   traverse();
   if(node.stateBytes.readUInt32LE(0xfc))throw Error('Active HUD refresh is not recovered');
   if(hud.environment.viewEnabled&&hud.environment.enabled&&!world.context.world.menu)throw Error('Active HUD content update is not recovered');
   return true;
  }
  if(children.has(node.address)&&node.update===0x403030){
   assert.equal(node.stateBytes?.length,0x1e0);traverse();
   if(node.stateBytes.readUInt32LE(0x1a4)&&!node.stateBytes.readUInt32LE(0x28))throw Error('Active HUD child animation is not recovered');
   return true;
  }
  return false;
 },compare(row){
  const hud=actors.get(row.address);assert.ok(hud,'Unknown HUD assertion');
  const differences=[];let words=0;
  const compare=(address,hex)=>{
   const actual=world.tree.nodes.get(address)?.stateBytes,expected=CapturedBytes.from(hex,'hex');assert.ok(actual);assert.equal(actual.length,expected.length);
   for(let o=0;o<expected.length;o+=4){words++;const a=actual.readUInt32LE(o),e=expected.readUInt32LE(o);if(a!==e)differences.push({address,offset:o,actual:a,expected:e});}
  };
  compare(row.address,row.hex);
  const actualEnvironment={...hud.environment,menu:world.context.world.menu};
  for(const key of ['app','view','viewEnabled','enabled','menu']){words++;if(actualEnvironment[key]!==row.hudEnvironment[key])differences.push({environment:key,actual:actualEnvironment[key],expected:row.hudEnvironment[key]});}
  const seen=new Set();let outsideWorldChildren=0;
  for(const child of row.children){assert.ok(!seen.has(child.address),'Duplicate HUD assertion');seen.add(child.address);if(hud.descendants.has(child.address))compare(child.address,child.hex);else outsideWorldChildren++;}
  for(const address of hud.descendants)assert.ok(seen.has(address),'Missing HUD child assertion');
  return {words,children:hud.descendants.size,outsideWorldChildren,differences};
 }};
}
