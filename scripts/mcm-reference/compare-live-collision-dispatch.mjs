import {loadLiveCollisionDispatch} from './live-collision-dispatch.mjs';
import {dispatchMcmCollisions} from '../../src/physics/mcm/collision-dispatch.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function compareLiveCollisionDispatch(checkpoint,observation,output){
 const world=loadLiveCollisionDispatch(checkpoint,observation),m=world.dispatch,blocks=observation.blocks.map(b=>({...b,bytes:Buffer.from(b.hex,'hex')}));
 if(output.length!==12+blocks.reduce((n,b)=>n+b.size,0))throw Error('Wrong dispatch oracle output length');
 const boundary=[0,0,0],stop=Symbol('original gameplay callback');
 for(const o of m.objects){if(o.callbackAddresses[0])o.onPrimary=()=>{boundary.splice(0,3,1,o.ownerAddress,0);throw stop;};if(o.callbackAddresses[1])o.onSecondary=()=>{boundary.splice(0,3,1,o.ownerAddress,1);throw stop;};}
 let dispatched=0;try{for(const o of m.objects){dispatched++;dispatchMcmCollisions(m,o.owner);}}catch(error){if(error!==stop)throw error;}
 const put=(a,v)=>{const b=blocks.find(b=>a>=b.address&&a+4<=b.address+b.size);if(!b)throw Error('Uncaptured dispatch store');b.bytes.writeUInt32LE(v>>>0,a-b.address);},vector=(a,v)=>v.forEach((x,i)=>put(a+i*4,floatBits(x)));
 for(const o of m.objects){put(o.address+0x88,o.other?.address??0);vector(o.address+0xcc,o.contactCC);vector(o.address+0xd8,o.contactD8);vector(o.address+0xe4,o.contactE4);}
 for(let i=0;i<60;i++)for(let j=0;j<60;j++)put(world.manager+0xf8+(i*60+j)*4,m.pairs[i][j]);
 put(world.manager+0x394c,floatBits(m.depth));for(const [key,offset] of [['contactCC',0x3950],['contactD8',0x395c],['contactE4',0x3968],['otherE4',0x3974]])vector(world.manager+offset,m[key]);
 put(world.manager+0x3980,m.currentA===undefined?0:m.objects[m.currentA].address);put(world.manager+0x3984,m.currentB===undefined?0:m.objects[m.currentB].address);
 let differences=0,changedWords=0,comparedWords=0,cursor=12;const firstDifferences=[];
 const check=(actual,expected,field)=>{comparedWords++;if(actual!==expected){differences++;if(firstDifferences.length<20)firstDifferences.push({field,original:expected,recovered:actual});}};
 boundary.forEach((v,i)=>check(v,output.readUInt32LE(i*4),`boundary[${i}]`));
 for(const b of blocks){const before=Buffer.from(b.hex,'hex');for(let i=0;i<b.size;i+=4){const original=output.readUInt32LE(cursor+i);if(original!==before.readUInt32LE(i))changedWords++;check(b.bytes.readUInt32LE(i),original,`0x${(b.address+i).toString(16)}`);}cursor+=b.size;}
 return {scope:'Captured live dispatch through first gameplay callback, where execution stops; actor response is not substituted or validated.',dispatched,stoppedAtCallback:!!boundary[0],callbackOwner:boundary[1],callbackKind:boundary[2],actors:world.actors.size,comparedWords,changedWords,differences,firstDifferences};
}
