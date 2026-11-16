import {encodeWorldAnimation} from './world-observation-codec.mjs';
// Stream the original observations; retain exactly the boundary records consumed
// by the combined-world comparator. Hash every original input before filtering.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {brotliCompressSync,constants} from 'node:zlib';
import {validateWorldInputProtocol} from './world-input-protocol.mjs';
const [directory,executable,output]=process.argv.slice(2);
if(!output)throw Error('Usage: archive-world-bikes.mjs CAPTURE_DIRECTORY ORIGINAL_EXE OUTPUT');
const hash=value=>createHash('sha256').update(value).digest('hex');
const executableSha256=hash(fs.readFileSync(executable));assert.equal(executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
const files={},sourceSha256={},retainedRows={},animationBlocks=[],animationIndex=new Map();
const worldBikes=new Set(JSON.parse(fs.readFileSync(path.join(directory,'world-entry.json'),'utf8')).bikes);
const bikeContacts=row=>{
 const objects=new Map(row.objects.map(o=>[o.address,Buffer.from(o.hex,'hex')]));
 return [...objects].flatMap(([address,bytes])=>{
  const owner=bytes.readUInt32LE(0x94),other=objects.get(bytes.readUInt32LE(0x88));
  if(!worldBikes.has(owner)||!other)return [];
  const otherOwner=other.readUInt32LE(0x94);
  return worldBikes.has(otherOwner)&&owner!==otherOwner?[`${address}:${owner}:${otherOwner}`]:[];
 });
};
for(const name of fs.readdirSync(directory).sort()){
 if(!/\.(json|jsonl|log)$/.test(name))continue;
 const h=createHash('sha256');for await(const chunk of fs.createReadStream(path.join(directory,name)))h.update(chunk);sourceSha256[name]=h.digest('hex');
 if(name==='grid.jsonl'){
  // Keep consecutive native observations when the grid first records another bike.
  // Persistent pointers are not counted as additional contact events.
  const rows=[];let previous,total=0;
  for await(const line of readline.createInterface({input:fs.createReadStream(path.join(directory,name)),crlfDelay:Infinity})){
   if(!line.trim())continue;total++;const row=JSON.parse(line);
   if(previous){
    const before=new Set(bikeContacts(previous.row));
    if(bikeContacts(row).some(contact=>!before.has(contact)))rows.push(previous.line,line);
   }
   previous={row,line};
  }
  files['world-contact-grid.jsonl']=rows.length?rows.join('\n')+'\n':'';
  retainedRows[name]={total,selected:rows.length};
 }else if(name==='frames.jsonl'||name==='rider.jsonl'){
  const rows=[],particleRows=[];let total=0,selected=0,physicsRows=0;
  for await(const line of readline.createInterface({input:fs.createReadStream(path.join(directory,name)),crlfDelay:Infinity})){
   if(!line.trim())continue;total++;const row=JSON.parse(line);
   if(name==='frames.jsonl'&&row.phase!=='random'){assert.equal(row.scripted,false,'Forced physics-state capture is not a world observation');physicsRows++;}
   const keep=name==='frames.jsonl'?row.phase==='after-update':['after-rider','scene-position'].includes(row.phase);
   // Preserve the original emitter/pool boundaries as assertion targets. These
   // are deliberately outside world-* initialization files: later native
   // particle state must never become recovered simulation input.
   if(name==='rider.jsonl'&&/^(before|after)-(dust|spray|pool|particle-draw|particle-cull|particle-quads)$/.test(row.phase))particleRows.push(line);
   if(keep){rows.push(name==='frames.jsonl'?JSON.stringify(encodeWorldAnimation(row,animationBlocks,animationIndex)):line);selected++;}
  }
  files[name]=rows.join('\n')+'\n';retainedRows[name]={total,selected,...(name==='frames.jsonl'?{physicsRows}:{})};
  if(name==='rider.jsonl'&&particleRows.length){
   files['particle-observations.jsonl']=particleRows.join('\n')+'\n';
   retainedRows[name].particleAssertions=particleRows.length;
  }
 }else if(name.startsWith('world-')||['capture.log','cleanup.log','restart.log','camera-selection.log','camera-restoration.log'].includes(name))files[name]=fs.readFileSync(path.join(directory,name),'utf8');
}
if(animationBlocks.length)files['world-animation-observations.json']=JSON.stringify(animationBlocks);
const cleanup=files['cleanup.log'];assert.match(cleanup,/debugger=0 clean=1/);assert.ok(!cleanup.includes('restored=0'));
const restored=[...cleanup.matchAll(/([0-9a-f]{8}) restored=1/g)].map(m=>m[1]);assert.equal(new Set(restored).size,files['world-renderer-initial.json']?52:files['world-camera-initial.json']?49:46);
if(files['world-camera-initial.json']){
 assert.ok(files['world-camera-observations.jsonl'],'Missing joint camera observations');
 for(const address of ['0047b107','0047db8f','0047dbdc'])assert.ok(restored.includes(address));
}
if(files['world-renderer-initial.json']){
 assert.ok(files['world-renderer-observations.jsonl'],'Missing renderer observations');
 for(const address of ['0043e660','0043e69c','0043e69f'])assert.ok(restored.includes(address));
}
for(const address of ['004590b0','004a52c0','004a54b6','004ad0e1','004ad5a2','004bf195'])assert.ok(restored.includes(address));
const count=Number(files['capture.log'].match(/captured=(\d+) status=1/)?.[1]);assert.ok(count>=4);assert.equal(retainedRows['frames.jsonl'].physicsRows,count);const completeFrames=retainedRows['frames.jsonl'].selected;
assert.equal(files['world-bikes.jsonl'].trim().split('\n').length,completeFrames*4,'Capture ended inside a world bike pair');
const selected=files['camera-selection.log'].match(/target_changed=([0-9a-f]+)->([0-9a-f]+) verified=1/);assert.ok(selected);assert.ok(files['camera-restoration.log'].includes(`target_changed=${selected[2]}->${selected[1]} verified=1`));
validateWorldInputProtocol(files);
const provenance={executableSha256,sourceSha256,fileSha256:Object.fromEntries(Object.entries(files).map(([name,value])=>[name,hash(value)])),retainedRows,note:'Combined-world boundary subset. Full original files are hashed before filtering. Frame output retains after-update only with losslessly deduplicated animation allocation assertions; rider output retains after-rider and scene-position only. Native grid pointer-transition evidence is retained separately; it is not fed into physics. Emitter, pool and particle presentation boundaries are retained separately in particle-observations.jsonl as assertion targets for shared-world integration. Optional world-camera-initial.json is atomic initialization; world-camera-observations.jsonl retains later camera assertions and external world/device context separately. Other stage observations are not used by this comparator. Inputs are captured separately from state assertion targets; no later physics state is imported.'};
fs.writeFileSync(output,brotliCompressSync(Buffer.from(JSON.stringify({provenance,files})),{params:{[constants.BROTLI_PARAM_QUALITY]:6}}));
console.log({frames:completeFrames,bytes:fs.statSync(output).size,retainedRows});
