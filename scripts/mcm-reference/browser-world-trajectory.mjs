import {runWorldTrajectory as run} from './run-world-trajectory.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {createServer} from 'vite';
import {chromium} from '@playwright/test';

// No later bike/rider/camera state or expected outputs enter the browser.

const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('../../tests/fixtures/mcm/world-application-frame-wine11.json.br',import.meta.url))));
assert.equal(fixture.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
for(const[name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
const rows=fixture.files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse);
const files=Object.fromEntries(Object.entries(fixture.files).filter(([name])=>name.startsWith('world-')&&name!=='world-animation-observations.json'&&(name.endsWith('.json')||/^world-mesh-[0-9]+\.jsonl$/.test(name))));
const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url))));
const deltas=rows.filter((_,i)=>i%4===0).map(row=>Buffer.from(row.stackHex,'hex').readFloatLE(0xbfc)),payload={files,t,deltas};
function compare(result){
 assert.equal(result.frames,64);assert.equal(result.outputs.length,rows.length);
 let words=0;result.outputs.forEach((actual,i)=>{
  const row=rows[i],expected=Buffer.from(row.bodyHex,'hex');assert.equal(actual.address,row.bike);assert.equal(actual.phase,row.phase);assert.equal(actual.random,row.randomState);
  actual.body.forEach((value,j)=>{assert.equal(value,expected.readUInt32LE(j*4),`frame ${actual.frame} bike ${actual.address.toString(16)} ${actual.phase} +${(j*4).toString(16)}`);words++;});
 });return words;
}
const expected=await run(payload,new URL('../../',import.meta.url).href),nodeWords=compare(expected);
const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.resolvedUrls.local[0]+'src/physics/mcm/application-frame.js');
 const actual=await page.evaluate(async({source,payload})=>{
  if(typeof Buffer!=='undefined'||typeof process!=='undefined')throw Error('Unexpected Node polyfill');
  return await (0,eval)('('+source+')')(payload,'/');
 },{source:run.toString(),payload});
 assert.deepEqual(actual,expected);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({browser:'Chrome',frames:actual.frames,bikeEntries:128,bikeTails:128,nodeWords,browserWords:compare(actual),differences:0,errors,scope:'Continuous retained bikes, riders, pool, camera and mesh-cache updates; clock deltas and scripted controls are external. Only atomic initial state enters browser; last frame stops inside world update. Particle drawing, full outer scene/terrain execution and normal-rate parity remain unproven.'}));
}finally{await browser?.close();await server.close();}
