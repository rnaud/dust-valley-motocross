import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {queryMcmTerrainHeight} from '../src/physics/mcm/terrain-height.js';
import {queryMcmTerrainNormal} from '../src/physics/mcm/terrain-normal.js';
import {floatBits} from '../src/physics/mcm/math.js';

test('failing retained scene trajectory terrain queries match original Dunes execution',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/scene-terrain-queries-wine11.json',import.meta.url)));
 const sceneBytes=fs.readFileSync(new URL('./fixtures/mcm/ai-frame-scene-wine11.json.br',import.meta.url));
 assert.equal(createHash('sha256').update(sceneBytes).digest('hex'),fixture.provenance.sceneFixtureSha256);
 const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url))));
 const cache=new Map(),node=id=>{
  if(cache.has(id))return cache.get(id);
  const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);
  if(raw.children)n.children=raw.children.map(id=>id===null?null:node(id));return n;
 };
 const terrain={root:node(t.root),worldToGrid:t.worldToGrid,heightScale:t.heightScale};
 assert.equal(cache.size,fixture.nodeCount);assert.equal(fixture.queries.length,354);
 fixture.queries.forEach(({point,expectedWords},index)=>{
  const args={...terrain,point,normal:[1,2,3]};
  const actual=[...queryMcmTerrainHeight(args),...queryMcmTerrainNormal(args)].map(floatBits);
  assert.deepEqual(actual,expectedWords,`query ${index} at ${point}`);
 });
});
