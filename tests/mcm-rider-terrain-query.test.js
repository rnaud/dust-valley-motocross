import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import {compareRiderTerrainQuery} from '../scripts/mcm-reference/compare-rider-terrain-query.mjs';
import {compareLiveRiderTerrainQuery} from '../scripts/mcm-reference/compare-live-rider-terrain-query.mjs';
const read=name=>JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/'+name+'-wine11.json.br',import.meta.url))));
test('eleven-point rider terrain query matches full original routine and all regions',()=>{
 const data=read('rider-terrain-query'),input=Buffer.from(data.input,'base64'),output=Buffer.from(data.output,'base64'),report=compareRiderTerrainQuery(input,output);
 assert.equal(report.cases,176);assert.equal(report.hits,154);assert.deepEqual(report.regions,[0,1,2,3]);assert.equal(report.comparedWords,188848);assert.equal(report.changedWords,2126);assert.deepEqual(report.differences,[]);
});
function liveFixture(){
 const f=read('live-rider-terrain-query'),cache=new Map();
 const node=id=>{if(id===null)return null;if(cache.has(id))return cache.get(id);const raw=f.terrain.nodes[id];assert.ok(raw,'Unobserved terrain node');const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});return n;};
 return {...f,terrain:{...f.terrain,root:node(f.terrain.root)}};
}
test('live crash-rider query matches full parent transform graph and untouched outputs',()=>{
 const f=liveFixture();for(let i=0;i<f.rows.length;i+=2){const report=compareLiveRiderTerrainQuery(f.rows[i],f.rows[i+1],f.terrain);assert.equal(report.hit,0);assert.equal(report.nodes,16);assert.equal(report.comparedWords,1349);assert.equal(report.changedWords,195);assert.deepEqual(report.differences,[]);}
 const bytes=Buffer.from(f.rows[1].outputHex,'hex');bytes[0]^=1;const altered={...f.rows[1],outputHex:bytes.toString('hex')};
 assert.equal(compareLiveRiderTerrainQuery(f.rows[0],altered,f.terrain).differences.length,1);
 assert.throws(()=>compareLiveRiderTerrainQuery({...f.rows[0],nodes:f.rows[0].nodes.slice(1)},f.rows[1],f.terrain),/Uncaptured/);
 assert.throws(()=>compareLiveRiderTerrainQuery(f.rows[0],{...f.rows[1],frame:106},f.terrain),/boundary differs/);
});
