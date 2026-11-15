import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {evaluateRecoveryFrameRider} from '../scripts/mcm-reference/recovery-frame-rider-case.mjs';
import {updateMcmRetainedFrameRider} from '../src/physics/mcm/retained-frame-rider.js';

const corpus=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/recovery-frame-rider-wine11.json.br',import.meta.url))));
// Adapt the oracle's semantic inputs to the retained bike layout. All expected
// bytes remain the original executable's outputs, including four frame calls.
function retainedAdvance(context,delta){
 const {bike:source,sourceNode,bodyNode,riderBodyNode,boundsFrame,...animation}=context;
 const bike={};
 const fields={844:'state',724:'pose',728:'weight','72c':'nextPose',730:'fraction',734:'secondaryWeight',820:'enabled',848:'speed',710:'field710',714:'field714',bfc:'fieldbfc',814:'animation','540':'scratch540','54c':'scratch54c'};
 for(const [offset,key]of Object.entries(fields))Object.defineProperty(bike,'field'+offset,{get:()=>source[key],set:v=>{source[key]=v;}});
 for(const [key,field]of [['offset','scratch540'],['normal','scratch54c']])Object.defineProperty(bike,key,{get:()=>source[field],set:v=>{source[field]=v;}});
 const children=[];for(let child=boundsFrame.firstChild;child;child=child.next)children.push(child);
 const c={bike,frameRider:animation,baseNode:sourceNode,bodyNode,proxy:riderBodyNode,componentAngle:0,loopRider:{buttons:[0,0,0]},
  bounds:{min:boundsFrame.boundsMin,max:boundsFrame.boundsMax,children,count:children.length,components:animation.components.map(c=>c?.node)}};
 updateMcmRetainedFrameRider(c,delta);
}
test('retained recovery completion uses the original component source across four frames',()=>{
 assert.equal(corpus.source.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 for(const [index,{input,outputBits}]of corpus.fixtures.entries())assert.deepEqual(evaluateRecoveryFrameRider(input,{advance:retainedAdvance}),outputBits,`native recovery case ${index}`);
});
test('using the body root as recovery source reproduces the native mismatch',()=>{
 const {input,outputBits}=corpus.fixtures[11];
 const actual=evaluateRecoveryFrameRider(input,{advance(context,delta){retainedAdvance({...context,sourceNode:context.bodyNode},delta);}});
 assert.notDeepEqual(actual,outputBits);
});
