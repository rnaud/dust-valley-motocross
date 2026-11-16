import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from '@playwright/test';

// Use only the atomic initial world in Chrome. Native output is compared by
// the host after execution and is never available to the browser runtime.
async function run({files,t,worldServices},base){
 const {createWorldBikeRuntime}=await import(base+'scripts/mcm-reference/world-bike-runtime.mjs');
 const cache=new Map(),node=id=>{
  if(id===null)return null;if(cache.has(id))return cache.get(id);
  const raw=t.nodes[id],n={...raw,...t.banks[raw.bankIndex]};cache.set(id,n);
  if(raw.children)n.children=raw.children.map(node);return n;
 };
 const runtime=createWorldBikeRuntime(files,{root:node(t.root),heightScale:t.heightScale,worldToGrid:t.worldToGrid},{throttle:0,brake:0});
 const [player,ai]=runtime.world.entry.bikes.map(a=>runtime.bikes.get(a));
 if(player.loaded.random!==ai.loaded.random||player.loaded.ordered!==ai.loaded.ordered||player.external.pool!==ai.external.pool)throw Error('World identities are not shared');
 const outputs=[],riders=[],emitters=[];
 if(worldServices){
  const {connectMcmWorldUpdate}=await import(base+'src/physics/mcm/world-update.js');
  const {projectWorldRider}=await import(base+'scripts/mcm-reference/world-rider-comparison.mjs');
  runtime.setPlayerInput({throttle:worldServices.throttle});
  connectMcmWorldUpdate(runtime).step(runtime.world.delta,{
   beforeBike:address=>runtime.setFrameInput(address,worldServices.inputs[address]),
   observeBike(address,stage){if(stage==='frame-tail'){const view=runtime.bikes.get(address).projection.projectBody();outputs.push({address,body:Array.from({length:view.byteLength/4},(_,i)=>view.getUint32(i*4,true)),random:runtime.random.state});}},
   beforeRider:address=>{const words=worldServices.boundaryWords[address];if(words)runtime.setParticleBoundaryWords(address,words);},
   afterRider:address=>{const bike=runtime.world.bikes.find(b=>b.address===address);riders.push({address,hex:projectWorldRider(runtime,address,bike.artifacts.child).toString('hex'),childHex:runtime.bikes.get(address).external.childBytes.subarray(0,0x610).toString('hex')});},
   observeEmitter(phase,state){if(phase==='after')emitters.push({address:state.address,hex:state.bytes.toString('hex'),poolHex:runtime.particles.poolBytes.toString('hex'),particlesHex:runtime.particles.particleBytes.toString('hex')});},
  });
  return {outputs,riders,emitters,sharedIdentities:true};
 }
 for(const address of runtime.world.entry.bikes){
  let body;
  const result=runtime.stepBike(address,runtime.world.delta,stage=>{
   if(stage==='frame-tail'){
    const view=runtime.bikes.get(address).projection.projectBody();
    body=Array.from({length:view.byteLength/4},(_,i)=>view.getUint32(i*4,true));
   }
  });
  if(result.status!=='returned'||!body)throw Error('Bike did not complete its original frame');
  outputs.push({address,result,body,random:runtime.random.state});
 }
 return {outputs,sharedIdentities:true};
}
const fixture=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('../../tests/fixtures/mcm/world-bikes-wine11.json.br',import.meta.url))));
assert.equal(fixture.provenance.executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
for(const[name,value]of Object.entries(fixture.files))assert.equal(createHash('sha256').update(value).digest('hex'),fixture.provenance.fileSha256[name]);
const {terrain:t}=JSON.parse(gunzipSync(fs.readFileSync(new URL('../../src/assets/mcm-maps/quarries-dunes.bin',import.meta.url))));
const files=Object.fromEntries(Object.entries(fixture.files).filter(([name])=>name.startsWith('world-')&&name.endsWith('.json')));
const payload={files,t},expected=await run(payload,new URL('../../',import.meta.url).href);
const native=fixture.files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse);
for(const row of expected.outputs){
 const observed=native.find(r=>r.phase==='after-bike'&&r.bike===row.address),bytes=Buffer.from(observed.bodyHex,'hex');
 assert.deepEqual(row.body,Array.from({length:bytes.length/4},(_,i)=>bytes.readUInt32LE(i*4)));
 assert.equal(row.random,observed.randomState);
}
const joined=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('../../tests/fixtures/mcm/world-application-frame-wine11.json.br',import.meta.url))));
for(const[name,value]of Object.entries(joined.files))assert.equal(createHash('sha256').update(value).digest('hex'),joined.provenance.fileSha256[name]);
const joinedRows=joined.files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse),joinedRiders=joined.files['world-riders.jsonl'].trim().split('\n').map(JSON.parse);
const worldPayload={t,files:Object.fromEntries(Object.entries(joined.files).filter(([name])=>name.startsWith('world-')&&name!=='world-animation-observations.json'&&(name.endsWith('.json')||/^world-mesh-[0-9]+\.jsonl$/.test(name)))),worldServices:{throttle:1,inputs:Object.fromEntries(joinedRows.slice(0,4).filter(r=>r.phase==='before-bike').map(r=>[r.bike,r.frameInput])),boundaryWords:Object.fromEntries(joinedRiders.filter(r=>r.completedBikeFrames===1&&r.phase==='before-rider').map(r=>[r.bike,r.boundaryWords]))}};
const worldExpected=await run(worldPayload,new URL('../../',import.meta.url).href);
for(const row of worldExpected.outputs){const native=joinedRows.find(r=>r.phase==='after-bike'&&r.bike===row.address),bytes=Buffer.from(native.bodyHex,'hex');assert.deepEqual(row.body,Array.from({length:bytes.length/4},(_,i)=>bytes.readUInt32LE(i*4)));assert.equal(row.random,native.randomState);}
for(const row of worldExpected.riders){const native=joinedRiders.find(r=>r.phase==='after-rider'&&r.bike===row.address);assert.equal(row.hex,native.riderHex);assert.equal(row.childHex,native.hex.slice(0,0x610*2));}
const particleRows=joined.files['particle-observations.jsonl'].trim().split('\n').map(JSON.parse);
let comparedEmitters=0;
for(const row of worldExpected.emitters){const native=particleRows.find(r=>r.completedBikeFrames===1&&r.emitter===row.address&&r.phase.startsWith('after-'));if(!native)continue;assert.equal(row.hex,native.emitterHex);assert.equal(row.poolHex,native.poolHex);assert.equal(row.particlesHex,native.particlesHex);comparedEmitters++;}
assert.ok(comparedEmitters>0);
const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 // Avoid starting the game renderer: this checks the browser physics runtime.
 await page.goto(server.resolvedUrls.local[0]+'src/physics/mcm/application-frame.js');
 const actual=await page.evaluate(async({source,payload})=>{
  if(typeof Buffer!=='undefined'||typeof process!=='undefined')throw Error('Unexpected Node polyfill');
  return await (0,eval)('('+source+')')(payload,'/');
 },{source:run.toString(),payload});
 assert.deepEqual(actual,expected);
 const worldActual=await page.evaluate(async({source,payload})=>{if(typeof Buffer!=='undefined'||typeof process!=='undefined')throw Error('Unexpected Node polyfill');return await (0,eval)('('+source+')')(payload,'/');},{source:run.toString(),payload:worldPayload});
 assert.deepEqual(worldActual,worldExpected);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({browser:'Chrome',bikes:actual.outputs.length,comparedNativeBodyWords:actual.outputs.reduce((n,r)=>n+r.body.length,0),sharedIdentities:actual.sharedIdentities,errors,worldRiders:worldActual.riders.length,comparedEmitters,scope:'Atomic first bike pair plus complete first world update with both riders and shared emitters. Input-device and rider boundary words are explicit services. Continuous browser scene scheduling remains unproven.'}));
}finally{await browser?.close();await server.close();}
