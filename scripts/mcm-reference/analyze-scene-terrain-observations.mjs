import fs from 'node:fs';import{brotliDecompressSync}from'node:zlib';import assert from'node:assert/strict';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(process.argv[2]))),rows=fixture.files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse);
const offsets=new Map(),within=new Map();let previous,identity;
for(const row of rows){
 const state=row.sceneTerrainObservation;assert.ok(state,'Missing terrain observation');const bytes=Buffer.from(state.hex,'hex');assert.equal(bytes.length,0x17d0);
 if(!identity)identity={address:state.address,camera:state.camera,debugEnabled:state.debugEnabled};else for(const key of Object.keys(identity))assert.equal(state[key],identity[key],'Terrain identity/context changed');
 if(previous){for(let o=0;o<bytes.length;o+=4)if(bytes.readUInt32LE(o)!==previous.bytes.readUInt32LE(o)){const key='0x'+o.toString(16);offsets.set(key,(offsets.get(key)??0)+1);if(previous.row.phase==='before-bike'&&row.phase==='after-bike'&&row.bike===previous.row.bike)within.set(key,(within.get(key)??0)+1);}}
 previous={row,bytes};
}
console.log(JSON.stringify({scope:'Read-only terrain change inventory, not a simulation parity result',observations:rows.length,...identity,changedWords:Object.fromEntries(offsets),withinBikeChangedWords:Object.fromEntries(within)},null,2));
