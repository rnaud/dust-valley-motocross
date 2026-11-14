import test from 'node:test';
import assert from 'node:assert/strict';
import waitPagesArtifact from '../.github/scripts/wait-pages-artifact.cjs';
const artifact={name:'pages-current-attempt',id:123};
test('Pages readiness uses consecutive matching artifact-service observations',async()=>{
 const observations=[[],[artifact],[],[{...artifact,id:124}],[artifact],[artifact]],waits=[];
 const id=await waitPagesArtifact({client:{listArtifacts:async()=>({artifacts:observations.shift()})},name:artifact.name,wait:async ms=>waits.push(ms),log:()=>{}});
 assert.equal(id,123);assert.equal(waits.length,5);assert.ok(waits.every(ms=>ms===5000));
});
test('Pages readiness retries service errors and ignores other attempts',async()=>{
 let calls=0;const id=await waitPagesArtifact({client:{listArtifacts:async()=>{calls++;if(calls===1)throw Error('temporary service failure');return {artifacts:calls===2?[{...artifact,name:'older-attempt'}]:[artifact]};}},name:artifact.name,wait:async()=>{},log:()=>{}});
 assert.equal(id,123);assert.equal(calls,4);
});
test('Pages readiness fails after bounded unsuccessful observations',async()=>{
 let calls=0,waits=0;
 await assert.rejects(waitPagesArtifact({client:{listArtifacts:async()=>{calls++;return {artifacts:[]};}},name:artifact.name,attempts:3,wait:async()=>{waits++;},log:()=>{}}),/not consistently visible/);
 assert.equal(calls,3);assert.equal(waits,2);
});
