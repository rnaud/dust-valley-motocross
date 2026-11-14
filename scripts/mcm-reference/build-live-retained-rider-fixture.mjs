import fs from 'node:fs';import {brotliCompressSync,constants} from 'node:zlib';
import {compareLiveRetainedRiderFrames} from './compare-live-retained-rider-frames.mjs';
import {readMcmTerrain} from './terrain-data.mjs';
const [prefix,course,fixturePath,reportPath,frames='120']=process.argv.slice(2);
if(!reportPath||!Number.isInteger(+frames)||+frames<1)throw Error('Usage: build-live-retained-rider-fixture.mjs capture-prefix course.trn fixture.json.br report.json [frames]');
const read=s=>JSON.parse(fs.readFileSync(prefix+'-'+s+'.json'));
const rows=fs.readFileSync(prefix+'-boundaries.jsonl','utf8').trim().split('\n').map(JSON.parse).slice(0,2*Number(frames));
if(rows.length!==2*Number(frames))throw Error('Capture has fewer complete frames than requested');
const terrain=readMcmTerrain(fs.readFileSync(course)),recorded=new Map();
function observe(node){if(!node)return null;if(recorded.has(node.offset))return recorded.get(node.offset).proxy;
 const data={offset:node.offset,minimumHeight:node.minimumHeight,maximumHeight:node.maximumHeight,originX:node.originX,originY:node.originY,level:node.level,shift:node.shift,bias:node.bias,scale:node.scale,heights:node.heights,normals:node.normals},proxy={...data};recorded.set(node.offset,{data,proxy});
 if(node.children){data.children={};proxy.children=new Proxy(node.children,{get(target,key){if(/^\d+$/.test(String(key))){const n=target[key];data.children[key]=n?.offset??null;return observe(n);}return Reflect.get(target,key);}});}return proxy;}
const input={checkpoint:read('checkpoint'),animations:read('animations'),environment:read('observation'),collision:read('world'),throttle:0,brake:0};
const events=fs.readFileSync(prefix+'-trace.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(e=>e.phase==='initial-rider'||e.frame<Number(frames)).map(e=>{if(!['before-rider','before-pool'].includes(e.phase))return e;const {poolHex,particlesHex,...inputs}=e;return inputs;});
const report=compareLiveRetainedRiderFrames({...input,terrain:{...terrain,root:observe(terrain.root)}},rows,events);
const fixture={input,rows,events,terrain:{heightScale:terrain.heightScale,worldToGrid:terrain.worldToGrid,root:terrain.root.offset,nodes:Object.fromEntries([...recorded].map(([k,v])=>[k,v.data]))}};
fs.writeFileSync(fixturePath,brotliCompressSync(Buffer.from(JSON.stringify(fixture)),{params:{[constants.BROTLI_PARAM_QUALITY]:6}}));
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log({...report,reports:report.reports.at(-1),riderReports:report.riderReports.at(-1)});
