import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync,brotliDecompressSync} from 'node:zlib';
import {createMcmCoreState,stepMcmCoreState} from '../src/mcm-core-preview.js';
const assets=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-particles.bin',import.meta.url))));
test('particle sprite coordinates match original captured draw inputs and recovered tail',()=>{
 const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-particles-wine11.json.br',import.meta.url))));
 const row=fixture.files['particle-observations.jsonl'].trim().split('\n').map(JSON.parse).find(r=>r.uvHex);
 const bytes=Buffer.from(row.uvHex,'hex');for(let i=0;i<bytes.length/4;i++)assert.equal(assets.uv[i],bytes.readFloatLE(i*4),`UV word ${i}`);
 const tail=fs.readFileSync(new URL('./fixtures/mcm/particle-uv-tail-wine11.bin',import.meta.url));
 for(let i=0;i<tail.length/4;i++)assert.equal(assets.uv[45*8+i],tail.readFloatLE(i*4));
 assert.equal(row.textureFormat,0x115c);
});
test('every scene particle sheet exists and retains graded four-bit alpha',()=>{
 const settings=JSON.parse(fs.readFileSync(new URL('../src/mcm-scene-variants.json',import.meta.url)));
 for(const scenes of Object.values(settings))for(const scene of scenes)assert.ok(assets.textures[scene.particleTexture],scene.source);
 assert.equal(Object.keys(assets.textures).length,17);
 for(const texture of Object.values(assets.textures)){const bytes=Buffer.from(texture.rgba,'base64');assert.equal(bytes.length,texture.width*texture.height*4);const alpha=new Set();for(let i=3;i<bytes.length;i+=4){assert.equal(bytes[i]%17,0);alpha.add(bytes[i]);}assert.ok(alpha.size>4);assert.ok(alpha.has(0));}
});
test('single-bike acceleration/release emits original dust, exhaust and grit without changing bike trajectory',()=>{
 const scene=JSON.parse(gunzipSync(fs.readFileSync(new URL('../src/assets/mcm-core-scene.bin',import.meta.url))));
 const baseline=createMcmCoreState(scene,{sand:false}),withParticles=createMcmCoreState({...scene,particleAssets:assets},{sand:false}),seen=new Set();
 for(let frame=0;frame<120;frame++){
  const input={gas:frame<60};stepMcmCoreState(baseline,input,.02);stepMcmCoreState(withParticles,input,.02);
  for(const key of ['position','velocity','forward','up','angularVelocity'])assert.deepEqual([...withParticles.physics.runtime.loaded.context.bike[key]],[...baseline.physics.runtime.loaded.context.bike[key]],`frame ${frame} ${key}`);
  const pool=withParticles.physics.runtime.external.pool;for(let i=0;i<pool.count;i++)seen.add(pool.particle(i).getUint32(0x10,true));
 }
 assert.ok([...seen].some(n=>n<=12));for(const n of [14,15,16,17])assert.ok(seen.has(n),'exhaust '+n);assert.ok([...seen].some(n=>n>=29&&n<=44));
});
