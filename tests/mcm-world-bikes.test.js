import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {analyzeWorldBikes} from '../scripts/mcm-reference/analyze-world-bikes.mjs';
import {createWorldBikeRuntime} from '../scripts/mcm-reference/world-bike-runtime.mjs';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-bikes-wine11.json.br',import.meta.url))));
function terrain(){
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),cache=new Map();
 const node=id=>{if(cache.has(id))return cache.get(id);const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;};
 return {root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale};
}
test('combined bike capture retains initial RNG, both bike boundaries and verified cleanup',()=>{
 for(const [name,value] of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
 assert.equal(fixture.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
 assert.equal((fixture.files['cleanup.log'].match(/restored=1/g)||[]).length,46);
 assert.match(fixture.files['cleanup.log'],/debugger=0 clean=1/);
 const entry=JSON.parse(fixture.files['world-entry.json']);assert.ok(entry.randomAddress);assert.ok(Number.isInteger(entry.randomState));
 const rows=fixture.files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse);
 assert.equal(rows.length,16);assert.deepEqual(rows.slice(0,4).map(r=>[r.bike,r.phase]),entry.bikes.flatMap(bike=>[[bike,'before-bike'],[bike,'after-bike']]));
});
test('first player and AI physics calls match complete bodies and RNG from one atomic world initialization',()=>{
 // Deliberately exclude every observed output from runtime initialization.
 const initial=Object.fromEntries(Object.entries(fixture.files).filter(([name])=>name.startsWith('world-')&&name.endsWith('.json')));
 const runtime=createWorldBikeRuntime(initial,terrain(),{throttle:0,brake:0});
 const rows=fixture.files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse);
 const [player,ai]=runtime.world.entry.bikes.map(a=>runtime.bikes.get(a));
 assert.equal(player.loaded.random,ai.loaded.random);assert.equal(player.loaded.ordered,ai.loaded.ordered);
 assert.equal(player.external.pool,ai.external.pool);
 let words=0;
 for(const address of runtime.world.entry.bikes){
  let boundary;
  const result=runtime.stepBike(address,runtime.world.delta,stage=>{
   // Original hook 0x4ad0e1 precedes the final saved-position stores.
   if(stage==='frame-tail')boundary=runtime.bikes.get(address).projection.projectBody();
  });
  assert.equal(result.status,'returned');assert.equal(result.substeps,5);
  const expected=rows.find(r=>r.bike===address&&r.phase==='after-bike'),body=Buffer.from(expected.bodyHex,'hex');
  assert.equal(body.length,0xcc8);
  for(let offset=0;offset<body.length;offset+=4){assert.equal(boundary.getUint32(offset,true),body.readUInt32LE(offset),`bike ${address.toString(16)} +${offset.toString(16)}`);words++;}
  assert.equal(runtime.random.state,expected.randomState);
 }
 assert.equal(words,1636);
 // This proves one pair of physics calls, not retained world-loop parity.
});

test('both retained rider ticks eliminate AI rider collider divergence across four bike updates',()=>{
 const result=analyzeWorldBikes(fixture.files,terrain());
 assert.equal(result.reports.length,8);
 for(const report of result.reports)assert.equal(report.random.actual,report.random.expected);
 assert.equal(result.collisionReports.length,7);
 for(const report of result.collisionReports){assert.equal(report.words,213);assert.deepEqual(report.differences,[]);}
 assert.equal(result.riderReports.length,3);
 for(const report of result.riderReports){assert.equal(report.words,(0x3ac+0x610)/4);assert.deepEqual(report.differences,[]);}
 assert.equal(result.visualReports.length,7);
 assert.deepEqual(result.visualReports[0].differences,[]);
 assert.deepEqual(result.visualReports[1].differences,[]);
 // Later visual/body differences remain diagnostic output, not a parity pass.
});
