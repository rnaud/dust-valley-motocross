import fs from'node:fs';import{brotliDecompressSync}from'node:zlib';import assert from'node:assert/strict';import{createTerrainNodeObservationDecoder}from'./terrain-node-observations.mjs';
const f=JSON.parse(brotliDecompressSync(fs.readFileSync(process.argv[2]))),tree=JSON.parse(f.files['world-actor-tree.json']),actor=tree.nodes.find(n=>n.update===0x411000);assert.ok(actor?.terrainInitial?.nodeSnapshot);
const initial=actor.terrainInitial.nodeSnapshot,decoder=createTerrainNodeObservationDecoder(initial),histogram=new Map(),frames=[];
for(const row of f.files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse)){
 const snapshot=row.sceneTerrainObservation?.nodeSnapshot;if(!snapshot)continue;assert.equal(row.phase,'before-bike');const changes=decoder.apply(snapshot);
 for(const c of changes){const key='0x'+c.offset.toString(16);histogram.set(key,(histogram.get(key)??0)+1);}
 let selected=0;for(const b of decoder.nodes.values())if(b.readUInt32LE(0x184))selected++;
 frames.push({sequence:snapshot.sequence,changedNodes:snapshot.nodes.length,changedWords:changes.length,selectedNodes:selected});
}
console.log(JSON.stringify({scope:'Original terrain node observation inventory, not recovered traversal parity',nodes:decoder.nodes.size,childTables:decoder.tables.size,snapshots:frames.length,changedWordsByOffset:Object.fromEntries([...histogram].sort((a,b)=>parseInt(a[0])-parseInt(b[0]))),frames},null,2));
