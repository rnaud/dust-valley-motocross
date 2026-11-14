import {loadLiveCollisionWorld} from './live-collision-world.mjs';
import {updateMcmCollisionGrid} from '../../src/physics/mcm/collision-grid.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function encodeLiveCollisionGridInput(checkpoint,observation){
 const w=loadLiveCollisionWorld(checkpoint,observation),h=Buffer.alloc(8);h.writeUInt32LE(w.manager);h.writeUInt32LE(observation.blocks.length,4);
 return Buffer.concat([h,...observation.blocks.flatMap(b=>{const head=Buffer.alloc(8);head.writeUInt32LE(b.address);head.writeUInt32LE(b.size,4);return [head,Buffer.from(b.hex,'hex')];})]);
}
export function compareLiveCollisionGrid(checkpoint,observation,output){
 const w=loadLiveCollisionWorld(checkpoint,observation),blocks=observation.blocks.map(b=>({...b,bytes:Buffer.from(b.hex,'hex')}));
 if(output.length!==blocks.reduce((n,b)=>n+b.size,0))throw Error('Wrong collision oracle output length');
 const put=(a,v)=>{const b=blocks.find(b=>a>=b.address&&a+4<=b.address+b.size);if(!b)throw Error('Uncaptured collision store');b.bytes.writeUInt32LE(v>>>0,a-b.address);};
 for(const object of w.objects){updateMcmCollisionGrid(object,w.grid,w.enabled);object.worldCenter.forEach((v,i)=>put(object.address+0x7c+i*4,floatBits(v)));}
 for(const n of w.nodes.values())for(const [i,v] of [n.previous?.token??0,n.next?.token??0,n.owner,n.cell,n.other,n.active].entries())put(n.token+i*4,v);
 let cursor=0,differences=0,changedWords=0,comparedWords=0;const firstDifferences=[];
 for(const b of blocks){const before=Buffer.from(b.hex,'hex');for(let i=0;i<b.size;i+=4){const original=output.readUInt32LE(cursor+i),recovered=b.bytes.readUInt32LE(i);comparedWords++;if(original!==before.readUInt32LE(i))changedWords++;if(original!==recovered){differences++;if(firstDifferences.length<20)firstDifferences.push({address:b.address,offset:i,original,recovered});}}cursor+=b.size;}
 return {scope:'Original grid refresh 0x42a550/0x42a6e0 for each captured type 0/1 object in manager order. Shared graph and all captured bytes compared; collision dispatch, actor response and trajectories excluded.',objects:w.objects.length,cells:w.grid.cells.length,entries:w.objects.reduce((n,o)=>n+o.entries.length,0),blocks:blocks.length,comparedWords,changedWords,differences,firstDifferences};
}
