import {runWorldStability as run} from './run-world-stability.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {brotliDecompressSync,gunzipSync} from 'node:zlib';import {createServer} from 'vite';import {chromium} from '@playwright/test';
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('../../tests/fixtures/mcm/world-full-allocator-wine11.json.br',import.meta.url))));
for(const[name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
const files=Object.fromEntries(Object.entries(fixture.files).filter(([n])=>n.startsWith('world-')&&n!=='world-animation-observations.json'&&(n.endsWith('.json')||/^world-mesh-[0-9]+\.jsonl$/.test(n))));
const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url)))),payload={files,t,frames:1500};
const expected=await run(payload,new URL('../../',import.meta.url).href);assert.equal(expected.frames,1500);assert.ok(expected.callbacks>128);assert.ok(expected.crashFrames>0);
const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(server.resolvedUrls.local[0]+'src/physics/mcm/application-frame.js');
 const actual=await page.evaluate(async({source,payload})=>{if(typeof Buffer!=='undefined'||typeof process!=='undefined')throw Error('Unexpected Node polyfill');return await(0,eval)('('+source+')')(payload,'/');},{source:run.toString(),payload});
 assert.deepEqual(actual,expected);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({browser:'Chrome',frames:actual.frames,stepSeconds:Math.fround(.02),simulatedSeconds:30,crashFrames:actual.crashFrames,callbacks:actual.callbacks,heap:actual.heap,terrainTicks:actual.terrainTicks,comparedCheckpointWords:actual.checkpoints.reduce((n,c)=>n+c.bikes.reduce((m,b)=>m+b.body.length,0),0),differences:0,errors,scope:'Continuous two-bike runtime stability and exact Node/Chrome agreement at fixed 50 Hz. This does not prove native normal-speed parity or verify the playable site integration.'}));
}finally{await browser?.close();await server.close();}
