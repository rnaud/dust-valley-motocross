import fs from 'node:fs';
import {brotliDecompressSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('../../tests/fixtures/mcm/world-full-allocator-wine11.json.br',import.meta.url))));
// Initial checkpoint resources only. No later bike/allocator observation rows.
const names=['actor-tree','ai-environment-1','animations-0','animations-1','audio-0','audio-1','bike-0','bike-1','camera-initial','child-0','child-1','collision-0','collision-1','effects-0','effects-1','entry','environment-0','environment-1','heap-thread','rider-heap-0','rider-heap-1'].map(n=>`world-${n}.json`).concat(['world-mesh-0.jsonl','world-mesh-1.jsonl']);
const files=Object.fromEntries(names.map(name=>{const value=fixture.files[name];if(typeof value!=='string'||createHash('sha256').update(value).digest('hex')!==fixture.provenance.fileSha256[name])throw Error('Invalid initial resource '+name);return[name,value];}));
const output=gzipSync(JSON.stringify({version:1,mapId:'quarries-dunes',source:'Atomic original two-bike checkpoint; no subsequent simulation observations.',files}),{level:9});
fs.writeFileSync(new URL('../../src/assets/mcm-world-scene.bin',import.meta.url),output);
console.log(JSON.stringify({files:names.length,bytes:output.length}));
