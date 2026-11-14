import fs from 'node:fs';
import {brotliCompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {readMcmTerrain} from './terrain-data.mjs';
import {compareLiveFrameEffects} from './compare-live-frame-tires.mjs';
const [prefix,coursePath,fixturePath,reportPath]=process.argv.slice(2);
if(!reportPath)throw new Error('Usage: node build-live-frame-effects-fixture.mjs capture-prefix course.trn fixture.json.br report.json');
const read=s=>JSON.parse(fs.readFileSync(`${prefix}-${s}.json`)),rows=fs.readFileSync(prefix+'-boundaries.jsonl','utf8').trim().split('\n').map(JSON.parse);
if(rows.length!==3)throw new Error('Expected three frame-effects boundaries');
const bytes=fs.readFileSync(coursePath),terrain=readMcmTerrain(bytes),recorded=new Map();
function observe(node){
 if(!node)return null;if(recorded.has(node.offset))return recorded.get(node.offset).proxy;
 const data={offset:node.offset,minimumHeight:node.minimumHeight,maximumHeight:node.maximumHeight,originX:node.originX,originY:node.originY,
  level:node.level,shift:node.shift,bias:node.bias,scale:node.scale,heights:node.heights,normals:node.normals},proxy={...data};recorded.set(node.offset,{data,proxy});
 if(node.children){data.children={};proxy.children=new Proxy(node.children,{get(target,key){if(/^\d+$/.test(String(key))){const n=target[key];data.children[key]=n?.offset??null;return observe(n);}return Reflect.get(target,key);}});}
 return proxy;
}
const input={checkpoint:read('checkpoint'),animations:read('animations'),environment:read('observation'),collision:read('world'),row:rows[0],throttle:0,brake:0};
const report=compareLiveFrameEffects({...input,terrain:{...terrain,root:observe(terrain.root)}},rows[2]);
if(report.differences)throw new Error(JSON.stringify(report));
const fixture={input,after:rows[2],terrain:{scope:'Only visited terrain nodes and edges; unrecorded accesses must throw.',sha256:createHash('sha256').update(bytes).digest('hex'),
 heightScale:terrain.heightScale,worldToGrid:terrain.worldToGrid,root:terrain.root.offset,nodes:Object.fromEntries([...recorded].map(([k,v])=>[k,v.data]))}};
fs.writeFileSync(fixturePath,brotliCompressSync(Buffer.from(JSON.stringify(fixture))));
fs.writeFileSync(reportPath,JSON.stringify({...report,terrainNodes:recorded.size},null,2)+'\n');
console.log(JSON.stringify(report,null,2));
