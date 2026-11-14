import {loadLiveOrderedDispatch} from './live-ordered-dispatch.mjs';
import {dispatchMcmCollisions} from '../../src/physics/mcm/collision-dispatch.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function compareLiveOrderedDispatch(checkpoint,observation,output){
 const w=loadLiveOrderedDispatch(checkpoint,observation),m=w.dispatch,start=m.currentA;
 if(start===undefined)throw Error('Captured primary missing');
 dispatchMcmCollisions(m,start);
 const blocks=serializeLiveOrderedDispatch(w,observation),header=257*4;
 if(output.length!==header+blocks.reduce((n,b)=>n+b.size,0))throw Error('Wrong ordered oracle output length');
 const trace=[w.trace.length,...w.trace.flat()];while(trace.length<257)trace.push(0);
 let differences=0,changedWords=0,comparedWords=0,cursor=header;const firstDifferences=[];
 const check=(actual,expected,field)=>{comparedWords++;if(actual!==expected){differences++;if(firstDifferences.length<20)firstDifferences.push({field,original:expected,recovered:actual});}};
 trace.forEach((v,i)=>check(v,output.readUInt32LE(i*4),`trace[${i}]`));
 for(const b of blocks){const before=Buffer.from(b.hex,'hex');for(let i=0;i<b.size;i+=4){const original=output.readUInt32LE(cursor+i);if(original!==before.readUInt32LE(i))changedWords++;check(b.bytes.readUInt32LE(i),original,`0x${(b.address+i).toString(16)}`);}cursor+=b.size;}
 return {scope:'Dispatch from captured current primary through original rider and bike callbacks, with callback order and all captured memory compared. Re-executes dispatch from the snapshot; not continuation of the interrupted native stack. Active audio/tag transfer and whole trajectories excluded.',startObject:start,callbackTrace:w.trace,comparedWords,changedWords,differences,firstDifferences};
}

export function serializeLiveOrderedDispatch(w,observation){
 const m=w.dispatch;
 const blocks=observation.blocks.map(b=>({...b,bytes:Buffer.from(b.hex,'hex')}));
 const put=(a,v)=>{const b=blocks.find(b=>a>=b.address&&a+4<=b.address+b.size);if(!b)throw Error('Uncaptured ordered dispatch store');b.bytes.writeUInt32LE(v>>>0,a-b.address);},vector=(a,v)=>v.forEach((x,i)=>put(a+i*4,floatBits(x)));
 for(const a of w.actors.values())if(a.kind==='bike'){
  for(const [key,offset] of [['position',0x4f8],['velocity',0x510],['angularVelocity',0x534],['worldAngularVelocity',0x528],['scratch540',0x540],['field654',0x654]])vector(a.address+offset,a[key]);
  for(const [key,offset] of [['field8a8',0x8a8],['field8ac',0x8ac]])put(a.address+offset,a[key]);
  put(a.address+0x6a4,floatBits(a.speed));put(a.address+0x888,floatBits(a.field888));
 }else{vector(a.address+0x58,a.velocity);vector(a.address+0x64,a.angular);vector(a.address+0xb8,a.matrix);put(a.address+0x154,a.contactClass);}
 for(const o of w.objects){o.callbackAddresses.forEach((v,i)=>put(o.address+0x108+i*4,v));vector(o.address+0x1c,o.matrix);vector(o.address+0x64,o.extents);vector(o.address+0x70,o.localCenter);vector(o.address+0x7c,o.worldCenter);put(o.address+0x5c,floatBits(o.radius));if(o.radiusSquared!==undefined)put(o.address+0x60,floatBits(o.radiusSquared));put(o.address+0x88,o.other?.address??0);vector(o.address+0xcc,o.contactCC);vector(o.address+0xd8,o.contactD8);vector(o.address+0xe4,o.contactE4);}
 for(const n of w.transformNodes.values()){vector(n.address+0x84,n.local);vector(n.address+0xc4,n.world);put(n.address+0x104,n.cacheValid);}
 for(const n of w.nodes.values())for(const [i,v] of [n.previous?.token??0,n.next?.token??0,n.owner,n.cell,n.other,n.active].entries())put(n.token+i*4,v);
 for(let i=0;i<60;i++)for(let j=0;j<60;j++)put(w.manager+0xf8+(i*60+j)*4,m.pairs[i][j]);
 put(w.manager+0x394c,floatBits(m.depth));for(const [key,offset] of [['contactCC',0x3950],['contactD8',0x395c],['contactE4',0x3968],['otherE4',0x3974]])vector(w.manager+offset,m[key]);
 put(w.manager+0x3980,m.currentA===undefined?0:m.objects[m.currentA].address);put(w.manager+0x3984,m.currentB===undefined?0:m.objects[m.currentB].address);
 if(w.tag)put(w.tag.address+0x80,w.tag.holder?.address??0);
 return blocks;
}
