import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareWorldActorsTick} from '../scripts/mcm-reference/compare-world-actors-tick.mjs';
const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/world-actors-tick-wine11.json.br',import.meta.url)))),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64');
test('world dispatch matches original mode gates, countdown and ordered callees',()=>{
 for(const [key,b] of [['input',input],['output',output]])assert.equal(createHash('sha256').update(b).digest('hex'),f.provenance[key+'Sha256']);
 const r=compareWorldActorsTick(input,output);assert.deepEqual(r,f.report);assert.equal(r.cases,2048);assert.equal(r.words,534528);assert.equal(r.commands,11350);assert.deepEqual(r.differences,[]);
 const corrupt=Buffer.from(output);corrupt[8]^=1;corrupt[20]^=1;assert.equal(compareWorldActorsTick(input,corrupt).differences.length,2);
});
test('original single-remote race branch depends on incoming local-identity scratch',()=>{
 const changed=Buffer.from(input);for(let offset=0;offset<changed.length;offset+=116)changed.writeUInt32LE(changed.readUInt32LE(offset+76)^1,offset+76);
 const r=compareWorldActorsTick(changed,output);assert.ok(r.differences.length>0);
 assert.ok(r.differences.every(d=>input.readUInt32LE(d.case*116+36)===1));
});
