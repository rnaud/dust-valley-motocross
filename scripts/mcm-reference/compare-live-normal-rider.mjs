import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {checkpointMemory} from './live-checkpoint.mjs';
import {loadLiveNormalRider} from './live-normal-rider.mjs';
import {updateMcmNormalFrameRider} from '../../src/physics/mcm/normal-frame-rider.js';
import {floatBits} from '../../src/physics/mcm/math.js';
function prepare(checkpoint,observation){
 const loaded=loadLiveNormalRider(checkpoint,observation),blocks=[...checkpoint.blocks,...observation.blocks];
 checkpointMemory({...checkpoint,blocks,blockCount:blocks.length});
 return {...loaded,blocks};
}
export function encodeLiveNormalRiderInput(checkpoint,observation){
 const {blocks}=prepare(checkpoint,observation),head=Buffer.alloc(8),parts=[head];
 head.writeUInt32LE(checkpoint.bikeAddress);head.writeUInt32LE(blocks.length,4);
 for(const b of blocks){const h=Buffer.alloc(8);h.writeUInt32LE(b.address);h.writeUInt32LE(b.size,4);parts.push(h,Buffer.from(b.hex,'hex'));}
 return Buffer.concat(parts);
}
export function compareLiveNormalRider(checkpoint,observation,output){
 const {context,assets,visuals,blocks}=prepare(checkpoint,observation);
 const expected=blocks.map(b=>({...b,bytes:Buffer.from(b.hex,'hex')}));
 if(output.length!==expected.reduce((sum,b)=>sum+b.size,0))throw Error('Wrong original output size');
 updateMcmNormalFrameRider(context);
 const put=(address,bits)=>{const b=expected.find(b=>address>=b.address&&address+4<=b.address+b.size);if(!b)throw Error('Uncaptured output store');b.bytes.writeUInt32LE(bits>>>0,address-b.address);};
 const vector=(address,v)=>v.forEach((x,i)=>put(address+i*4,floatBits(x)));
 for(const n of visuals.nodes.values()){vector(n.address+0x84,n.local);vector(n.address+0xc4,n.world);put(n.address+0x104,n.cacheValid);}
 for(const child of assets.children.values()){vector(child.token+8,child.forward);vector(child.token+0x14,child.up);vector(child.token+0x20,child.position);}
 for(const [object,state] of [[visuals.bike,context.bikeAnimation],[visuals.rider,context.riderAnimation]]){
  put(object.address+0x10,state.record.token);put(object.address+0x14,state.frame.token);vector(object.address+0x218,state.boundsMin);vector(object.address+0x224,state.boundsMax);
 }
 put(checkpoint.bikeAddress+0x734,floatBits(context.bike.secondaryWeight));
 let offset=0,comparedWords=0,differences=0,changedWords=0;const firstDifferences=[];
 for(const block of expected){const before=Buffer.from(block.hex,'hex');for(let i=0;i<block.size;i+=4){
  const original=output.readUInt32LE(offset+i),recovered=block.bytes.readUInt32LE(i);comparedWords++;
  if(original!==before.readUInt32LE(i))changedWords++;
  if(original!==recovered){differences++;if(firstDifferences.length<20)firstDifferences.push({address:block.address,offset:i,original,recovered});}
 }offset+=block.size;}
 return {scope:'One original normal frame-rider update from a shared live checkpoint. All captured blocks compared, including unchanged bytes. Not complete bike-frame or trajectory parity.',captureId:checkpoint.captureId,blocks:blocks.length,comparedWords,changedWords,differences,firstDifferences};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [, ,cp,assets,output]=process.argv;if(!cp||!assets||!output)throw Error('Usage: compare-live-normal-rider.mjs checkpoint.json animations.json original-output.bin');
 const report=compareLiveNormalRider(JSON.parse(fs.readFileSync(cp)),JSON.parse(fs.readFileSync(assets)),fs.readFileSync(output));console.log(JSON.stringify(report,null,2));if(report.differences)process.exitCode=1;
}
