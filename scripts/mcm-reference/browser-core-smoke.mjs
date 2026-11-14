import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from '@playwright/test';

// Execute the same captured first frame in Node and a real browser with no
// Buffer/process polyfill. Native equivalence remains covered by replay tests.
async function run(f, base) {
 const {loadLiveFrameBootstrap}=await import(base+'scripts/mcm-reference/live-frame-bootstrap.mjs');
 const {advanceMcmRetainedFrame}=await import(base+'src/physics/mcm/retained-frame.js');
 const {bitsFloat,floatBits}=await import(base+'src/physics/mcm/math.js');
 const cache=new Map();
 const node=id=>{
  if(id===null)return null;if(cache.has(id))return cache.get(id);
  const raw=f.terrain.nodes[id];if(!raw)throw Error('Unobserved terrain node');
  const n={...raw};cache.set(id,n);
  if(raw.children)n.children=new Proxy(raw.children,{get(target,key){if(!Object.hasOwn(target,key))throw Error('Unobserved terrain edge');return node(target[key]);}});
  return n;
 };
 const terrain={root:node(f.terrain.root),heightScale:f.terrain.heightScale,worldToGrid:f.terrain.worldToGrid};
 const loaded=loadLiveFrameBootstrap({...f.input,terrain,row:f.rows[0]}),stages=[];
 loaded.context.engineEntry.input.throttleResponses[0]=f.rows[0].requestedThrottle;
 const result=advanceMcmRetainedFrame(loaded.context,{delta:bitsFloat(f.rows[0].frameBits),mode:loaded.mode,input:loaded.input},stage=>stages.push(stage));
 const words={};
 for(const [key,value] of Object.entries(loaded.context.bike)){
  if(typeof value==='number')words[key]=floatBits(value);
  else if((Array.isArray(value)||ArrayBuffer.isView(value))&&value.every(v=>typeof v==='number'))words[key]=Array.from(value,floatBits);
 }
 return {result,stages,words};
}
const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('../../tests/fixtures/mcm/live-retained-short-pulse-wine11.json.br',import.meta.url))));
const expected=await run(f,new URL('../../',import.meta.url).href);
const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();
let browser;
try {
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const page=await browser.newPage();
 await page.goto(server.resolvedUrls.local[0]);
 const actual=await page.evaluate(async({source,fixture})=>{
  if(typeof Buffer!=='undefined'||typeof process!=='undefined')throw Error('Unexpected Node polyfill');
  return await (0,eval)('('+source+')')(fixture,'/');
 },{source:run.toString(),fixture:f});
 assert.deepEqual(actual,expected);
 assert.ok(actual.stages.includes('return'));
 console.log(JSON.stringify({browser:'Chrome',bikeFields:Object.keys(actual.words).length,stages:actual.stages,result:actual.result}));
} finally {await browser?.close();await server.close();}
