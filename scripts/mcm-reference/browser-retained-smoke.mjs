import fs from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from '@playwright/test';
import {runCapturedHistory} from './run-captured-history.mjs';
const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const page=await browser.newPage();await page.goto(server.resolvedUrls.local[0]);
 for(const scenario of ['short-pulse','brake-pulse','steering','recovery','negative-steering']){
  const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL(`../../tests/fixtures/mcm/live-retained-${scenario}-wine11.json.br`,import.meta.url))));
  const history={input:f.input,row:f.rows[0],child:f.events[0],terrain:f.terrain,frames:f.rows.filter((_,i)=>i%2===0).map((r,i)=>({
   dtBits:r.frameBits,throttle:r.requestedThrottle,brake:r.requestedBrake,steerBits:r.requestedSteerBits,
   events:f.events.filter(e=>e.frame===i&&['before-rider','before-pool'].includes(e.phase)).map(e=>({kind:e.phase.slice(7),dtBits:e.dtBits,paused:e.paused}))
  }))};
  if(scenario==='negative-steering')history.frames=history.frames.slice(0,39);
  const expected=runCapturedHistory(history);
  const actual=await page.evaluate(async history=>{
   if(typeof Buffer!=='undefined'||typeof process!=='undefined')throw Error('Unexpected Node polyfill');
   const {runCapturedHistory}=await import('/scripts/mcm-reference/run-captured-history.mjs');return runCapturedHistory(history);
  },history);
  assert.deepEqual(actual,expected);
  // Independently compare core pose/motion words against original execution,
  // rather than using Node equivalence as a substitute for native evidence.
  let nativeWords=0;const mismatches=[];
  for(let i=0;i<actual.length;i++){
   const bytes=Buffer.from(f.rows[i*2+1].stateHex,'hex');
   for(const [key,offset] of Object.entries({position:0x4f8,velocity:0x510,forward:0x4c0,up:0x4cc,angularVelocity:0x534,worldAngularVelocity:0x528,acceleration:0x51c})){
    actual[i].bike[key].forEach((word,j)=>{if(word!==bytes.readUInt32LE(offset+j*4))mismatches.push({frame:i,key,component:j,original:bytes.readUInt32LE(offset+j*4),recovered:word});nativeWords++;});
   }
  }
  if(scenario==='negative-steering'){assert.ok(mismatches.length>0);assert.equal(mismatches[0].frame,38);}
  else assert.deepEqual(mismatches,[]);
  console.log(JSON.stringify({scenario,frames:actual.length,nativeMotionWords:nativeWords,browserNodeDifferences:0,nativeMotionDifferences:mismatches.length,firstNativeDifference:mismatches[0]??null}));
 }
}finally{await browser?.close();await server.close();}
