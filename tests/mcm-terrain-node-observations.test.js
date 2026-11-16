import test from'node:test';import assert from'node:assert/strict';import{createTerrainNodeObservationDecoder}from'../scripts/mcm-reference/terrain-node-observations.mjs';
const node=(address,table=0)=>{const bytes=Buffer.alloc(0x210);bytes.writeUInt32LE(table,0x54);bytes.writeUInt32LE(99,0x5c);return{address,hex:bytes.toString('hex')};};
const initial=()=>{const root=node(100,300),table=Buffer.alloc(1024);table.writeUInt32LE(200);root.childTable={address:300,hex:table.toString('hex')};return{sequence:0,full:true,root:100,nodeCount:2,nodes:[root,node(200)]};};
test('terrain delta decoder retains unchanged nodes and applies every changed word',()=>{
 const decoder=createTerrainNodeObservationDecoder(initial()),changed=node(200),b=Buffer.from(changed.hex,'hex');b.writeUInt32LE(31,0x184);changed.hex=b.toString('hex');
 assert.deepEqual(decoder.apply({sequence:1,full:false,root:100,nodeCount:2,nodes:[changed]}),[{address:200,offset:0x184,before:0,after:31}]);
 assert.deepEqual(decoder.apply({sequence:2,full:false,root:100,nodeCount:2,nodes:[]}),[]);assert.equal(decoder.nodes.get(200).readUInt32LE(0x184),31);
});
test('terrain decoder rejects gaps, duplicate nodes and uncaptured topology without partial application',()=>{
 const decoder=createTerrainNodeObservationDecoder(initial()),snapshot={sequence:1,full:false,root:100,nodeCount:2,nodes:[]};
 assert.throws(()=>decoder.apply({...snapshot,sequence:2}),/Nonsequential/);
 assert.throws(()=>decoder.apply({...snapshot,nodes:[node(200),node(200)]}),/Duplicate/);
 assert.throws(()=>decoder.apply({...snapshot,nodes:[node(200,400)]}),/topology changed/);assert.equal(decoder.sequence,0);
 const bad=initial();bad.nodes[1].address=100;assert.throws(()=>createTerrainNodeObservationDecoder(bad),/Duplicate/);
});
test('original terrain graph reconstructs all 65 sequential lossless snapshots',async()=>{
 const fs=await import('node:fs'),{brotliDecompressSync}=await import('node:zlib'),{createHash}=await import('node:crypto');
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-terrain-nodes-wine11.json.br',import.meta.url))));
 for(const[name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 const tree=JSON.parse(fixture.files['world-actor-tree.json']),seed=tree.nodes.find(n=>n.update===0x411000).terrainInitial.nodeSnapshot,decoder=createTerrainNodeObservationDecoder(seed);
 assert.equal(decoder.nodes.size,12594);assert.equal(decoder.tables.size,50);let changed=0;
 for(const row of fixture.files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse))if(row.sceneTerrainObservation.nodeSnapshot){assert.equal(row.phase,'before-bike');changed+=decoder.apply(row.sceneTerrainObservation.nodeSnapshot).length;}
 assert.equal(decoder.sequence,65);assert.ok(changed>100000);assert.equal([...decoder.nodes.values()].filter(b=>b.readUInt32LE(0x184)).length,310);
 assert.equal((fixture.files['cleanup.log'].match(/restored=1/g)||[]).length,52);assert.match(fixture.files['cleanup.log'],/debugger=0 clean=1/);
});
