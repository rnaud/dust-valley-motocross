import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {brotliCompressSync,constants} from 'node:zlib';
import {validateWorldInputProtocol} from './world-input-protocol.mjs';
const [directory,executable,output]=process.argv.slice(2);
if(!output)throw Error('Usage: archive-compact-world.mjs CAPTURE_DIRECTORY ORIGINAL_EXE OUTPUT');
const hash=value=>createHash('sha256').update(value).digest('hex');
const executableSha256=hash(fs.readFileSync(executable));assert.equal(executableSha256,'e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b');
const files={},sourceSha256={};
for(const name of fs.readdirSync(directory).sort())if(/\.(json|jsonl|log)$/.test(name)){
 const bytes=fs.readFileSync(path.join(directory,name));sourceSha256[name]=hash(bytes);
 if(name.startsWith('world-')||['capture.log','cleanup.log','camera-selection.log','camera-restoration.log','restart.log'].includes(name))files[name]=bytes.toString('utf8');
}
assert.match(files['cleanup.log'],/debugger=0 clean=1/);assert.ok(!files['cleanup.log'].includes('restored=0'));
for(const address of ['004a54b6','004ad0e1','004ad5a2','004bf195','004590b0'])assert.ok(files['cleanup.log'].includes(address+' restored=1'));
const hits=[...files['capture.log'].matchAll(/capture-profile-hook address=([0-9a-f]+) hits=(\d+)/g)];
assert.deepEqual(hits.map(m=>m[1]).sort(),['004a54b6','004ad0e1','004ad5a2','004bf195','004590b0'].sort());
const rows=files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse),count=Number(files['capture.log'].match(/captured=(\d+) status=1/)?.[1]);
assert.equal(rows.length,count);assert.equal(count%4,0);assert.equal(Number(hits.find(m=>m[1]==='004a54b6')[2]),count/2);assert.equal(Number(hits.find(m=>m[1]==='004ad0e1')[2]),count/2);
const entry=JSON.parse(files['world-entry.json']);assert.equal(entry.bikes.length,2);
rows.forEach((row,i)=>{assert.equal(row.sequence,i);assert.equal(row.bike,entry.bikes[Math.floor(i%4/2)]);assert.equal(row.phase,i%2?'after-bike':'before-bike');assert.equal(row.bodyHex.length,0xcc8*2);});
const selected=files['camera-selection.log'].match(/target_changed=([0-9a-f]+)->([0-9a-f]+) verified=1/);assert.ok(selected);assert.ok(files['camera-restoration.log'].includes(`target_changed=${selected[2]}->${selected[1]} verified=1`));
validateWorldInputProtocol(files);
const provenance={executableSha256,sourceSha256,fileSha256:Object.fromEntries(Object.entries(files).map(([name,value])=>[name,hash(value)])),frames:count/4,note:'Compact native capture: atomic initial state, subsequent full bike bodies and external control/timing observations. No forced simulation timing or state restoration. Initial snapshot pauses the process; debugger overhead remains measurable.'};
fs.writeFileSync(output,brotliCompressSync(Buffer.from(JSON.stringify({provenance,files})),{params:{[constants.BROTLI_PARAM_QUALITY]:6}}));
console.log(JSON.stringify({frames:count/4,bytes:fs.statSync(output).size}));
