import fs from 'node:fs';
import {brotliDecompressSync,gzipSync} from 'node:zlib';
import {readMcmTerrain} from './terrain-data.mjs';
const course=process.argv[2];if(!course)throw Error('Usage: node build-preview-scene.mjs /path/to/dunes.trn');
const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('../../tests/fixtures/mcm/live-retained-steering-wine11.json.br',import.meta.url))));
const terrain=readMcmTerrain(fs.readFileSync(course)),banks={},nodes={};
for(const [id,n] of terrain.nodes){
 const {children,heights,normals,...fields}=n;
 banks[n.bankIndex]??={heights,normals};
 nodes[id]={...fields,...(children?{children:children.map(c=>c?.offset??null)}:{})};
}
const scene={version:1,source:'Pinned MCM initial steering capture and dunes physical terrain; no rendering assets.',input:f.input,row:f.rows[0],child:f.events[0],terrain:{heightScale:terrain.heightScale,worldToGrid:terrain.worldToGrid,root:terrain.root.offset,nodes,banks}};
fs.mkdirSync(new URL('../../src/assets/',import.meta.url),{recursive:true});
const output=gzipSync(JSON.stringify(scene),{level:9});fs.writeFileSync(new URL('../../src/assets/mcm-core-scene.bin',import.meta.url),output);console.log(JSON.stringify({nodes:terrain.nodes.size,banks:Object.keys(banks).length,bytes:output.length}));
