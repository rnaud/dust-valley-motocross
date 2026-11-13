import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {checkpointMemory} from './live-checkpoint.mjs';
import {loadLiveSubstepStart} from './live-substep-start.mjs';
import {loadLiveNormalRider} from './live-normal-rider.mjs';
import {beginMcmSubstep} from '../../src/physics/mcm/contact-preparation.js';
import {floatBits} from '../../src/physics/mcm/math.js';
export function compareLiveSubstepStart(checkpoint,observation,output){
 // The shared native input format includes the separately captured resources.
 if(observation)loadLiveNormalRider(checkpoint,observation);
 const blocks=[...checkpoint.blocks,...(observation?.blocks??[])];checkpointMemory({...checkpoint,blocks,blockCount:blocks.length});
 const loaded=loadLiveSubstepStart(checkpoint),c=loaded.context;
 c.engine.drawRandom=()=>{throw Error('Unexpected random draw in captured idle state');};
 const expected=blocks.map(b=>({...b,bytes:Buffer.from(b.hex,'hex')}));
 if(output.length!==expected.reduce((sum,b)=>sum+b.size,0))throw Error('Wrong original output size');
 const result=beginMcmSubstep(c);
 const put=(address,bits)=>{const b=expected.find(b=>address>=b.address&&address+4<=b.address+b.size);if(!b)throw Error('Uncaptured output store');b.bytes.writeUInt32LE(bits>>>0,address-b.address);};
 const scalar=(address,value)=>put(address,floatBits(value));
 const vector=(address,v)=>v.forEach((x,i)=>scalar(address+i*4,x));
 for(const [key,offset,integer] of [['shiftTimer',0x168],['released',0x150,true],['state',0x160],['rpmDemand',0x15c],['previousRpmDemand',0x7c],['shiftThreshold',0x154],['gear',0x158,true]])(integer?put:scalar)(loaded.engineAddress+offset,c.engine[key]);
 for(const [key,offset] of [['brake',0x5e4],['mass',0x558],['inverseMass',0x55c],['field694',0x694],['previousSpeed',0x564],['previousY',0x84c],['filteredAcceleration',0x848]])scalar(checkpoint.bikeAddress+offset,c[key]);
 vector(checkpoint.bikeAddress+0x510,c.velocity);vector(checkpoint.bikeAddress+0x504,c.referencePosition);
 scalar(loaded.filterAddress,c.accelerationFilter.value);
 for(const n of loaded.visuals.nodes.values()){vector(n.address+0x84,n.local);vector(n.address+0xc4,n.world);put(n.address+0x104,n.cacheValid);}
 put(loaded.frontAddress+0x44,c.suspension.front.limited);put(loaded.rearAddress+0x44,c.suspension.rear.limited);
 let cursor=0,comparedWords=0,changedWords=0,differences=0;const firstDifferences=[];
 for(const b of expected){const before=Buffer.from(b.hex,'hex');for(let i=0;i<b.size;i+=4){const original=output.readUInt32LE(cursor+i),recovered=b.bytes.readUInt32LE(i);comparedWords++;if(original!==before.readUInt32LE(i))changedWords++;if(original!==recovered){differences++;if(firstDifferences.length<20)firstDifferences.push({address:b.address,offset:i,original,recovered});}}cursor+=b.size;}
 return {scope:'One original engine-entry through contact-transform preparation slice, initialized from captured idle state with explicit released controls. No terrain/contact-solver or full-frame parity claim.',captureId:checkpoint.captureId,blocks:blocks.length,comparedWords,changedWords,differences,firstDifferences,queries:result.queries,randomCalls:result.randomCalls};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [,,cp,assets,out]=process.argv;if(!out)throw Error('Usage: compare-live-substep-start.mjs checkpoint.json animations.json output.bin');
 const r=compareLiveSubstepStart(JSON.parse(fs.readFileSync(cp)),JSON.parse(fs.readFileSync(assets)),fs.readFileSync(out));console.log(JSON.stringify(r,null,2));if(r.differences)process.exitCode=1;
}
