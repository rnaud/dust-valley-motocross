import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import assert from 'node:assert/strict';
// Diagnostic only: compare observed cache states to earlier observed local
// matrices. No scheduling decision or simulation state is produced here.
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(process.argv[2]))),rows=fixture.files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse),history=[];
const transitions=[];let previous;
for(let i=0;i<rows.length;i++){
 const row=rows[i],observation=row.markerObservation;assert.ok(observation);const bytes=Buffer.from(observation.shapeHex,'hex'),local=bytes.subarray(0x84,0xc4).toString('hex'),world=bytes.subarray(0xc4,0x104).toString('hex'),valid=bytes.readUInt32LE(0x104);
 const earlier=history.findLastIndex(x=>x.local===world),changed=!previous||previous.world!==world||previous.valid!==valid;
 if(changed)transitions.push({boundary:i,frame:Math.floor(i/4),phase:row.phase,bike:row.bike,valid,worldEqualsLocal:world===local,latestEarlierLocalBoundary:earlier,localChangedSincePrevious:!!previous&&local!==previous.local,priorValid:previous?.valid});
 history.push({local,world,valid});previous=history.at(-1);
}
// Optional direct native resolver-entry evidence. This only checks the observed
// input against the next observed boundary; it never drives the world runtime.
const queries=fixture.files['world-marker-queries.jsonl']?.trim().split('\n').filter(Boolean).map(JSON.parse)??[];
const queryComparisons=[];
for(const query of queries){
 assert.equal(query.phase,'before-world-query');
 const input=Buffer.from(query.shapeHex,'hex');assert.equal(input.length,0x114);
 assert.equal(input.readUInt32LE(0x108),0,'Parented marker needs separate composition evidence');
 const boundary=query.completedBikeFrames*4,row=rows[boundary];
 if(!row){queryComparisons.push({frame:query.completedBikeFrames,pending:true});continue;}
 assert.equal(row.phase,'before-bike');assert.equal(query.node,row.markerObservation.shape);
 const output=Buffer.from(row.markerObservation.shapeHex,'hex');
 const expected=input.subarray(input.readUInt32LE(0x104)?0xc4:0x84,input.readUInt32LE(0x104)?0x104:0xc4);
 const differences=[];
 for(let i=0;i<16;i++)if(output.readUInt32LE(0xc4+i*4)!==expected.readUInt32LE(i*4))differences.push(i);
 if(output.readUInt32LE(0x104)!==1)differences.push('cacheValid');
 queryComparisons.push({frame:query.completedBikeFrames,caller:'0x'+query.caller.toString(16),bikeActive:query.bikeActive,riderActive:query.riderActive,inputCacheValid:input.readUInt32LE(0x104),comparedWords:17,differences});
}
console.log(JSON.stringify({scope:'Observation-only marker cache investigation. Native resolver-entry inputs explain subsequent boundary values; draw eligibility and invocation scheduling are not recovered or replayed by this diagnostic.',boundaries:rows.length,transitions,queryComparisons},null,2));
