import fs from 'node:fs';
import {brotliCompressSync} from 'node:zlib';
import {compareLiveRiderTick} from './compare-live-rider-tick.mjs';
import {readMcmTerrain} from './terrain-data.mjs';
const [prefix,course,fixturePath,reportPath,frames="104,105"]=process.argv.slice(2);
if(!reportPath)throw Error('Usage: build-live-rider-tick-fixture.mjs capture-prefix course.trn fixture.br report.json');
const terrain=readMcmTerrain(fs.readFileSync(course)),recorded=new Map();
function observe(node){if(!node)return null;if(recorded.has(node.offset))return recorded.get(node.offset).proxy;
 const data={offset:node.offset,minimumHeight:node.minimumHeight,maximumHeight:node.maximumHeight,originX:node.originX,originY:node.originY,level:node.level,shift:node.shift,bias:node.bias,scale:node.scale,heights:node.heights,normals:node.normals},proxy={...data};recorded.set(node.offset,{data,proxy});
 if(node.children){data.children={};proxy.children=new Proxy(node.children,{get(target,key){if(/^\d+$/.test(String(key))){const n=target[key];data.children[key]=n?.offset??null;return observe(n);}return Reflect.get(target,key);}});}return proxy;}
const cases=frames.split(',').map(Number).map(frame=>Object.fromEntries(['before','after'].map(side=>[side,Object.fromEntries(['world','animations','child'].map(k=>[k,JSON.parse(fs.readFileSync(`${prefix}-${frame}-${side}-rider-tick-${k}.json`))]))])));
const reports=cases.map(c=>compareLiveRiderTick(c.before,c.after,{...terrain,root:observe(terrain.root)}));
if(reports.some(r=>r.differences.length))throw Error(JSON.stringify(reports.map(r=>({...r,differences:r.differences.slice(0,10)}))));
fs.writeFileSync(fixturePath,brotliCompressSync(Buffer.from(JSON.stringify({cases,terrain:{heightScale:terrain.heightScale,worldToGrid:terrain.worldToGrid,root:terrain.root.offset,nodes:Object.fromEntries([...recorded].map(([k,v])=>[k,v.data]))}}))));
fs.writeFileSync(reportPath,JSON.stringify({scope:reports[0].scope,comparedWords:reports.reduce((n,r)=>n+r.comparedWords,0),changedWords:reports.reduce((n,r)=>n+r.changedWords,0),reports},null,2)+'\n');
console.log(reports);
