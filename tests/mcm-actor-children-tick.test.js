import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {brotliDecompressSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {compareActorChildrenTick} from '../scripts/mcm-reference/compare-actor-children-tick.mjs';
test('actor traversal matches original linked list mutations, callback order and timing gates',()=>{
 const f=JSON.parse(brotliDecompressSync(fs.readFileSync(new URL('./fixtures/mcm/actor-children-tick-wine11.json.br',import.meta.url)))),input=Buffer.from(f.input,'base64'),output=Buffer.from(f.output,'base64');
 for(const [key,b] of [['input',input],['output',output]])assert.equal(createHash('sha256').update(b).digest('hex'),f.provenance[key+'Sha256']);
 const r=compareActorChildrenTick(input,output);assert.deepEqual(r,f.report);assert.equal(r.cases,2048);assert.equal(r.words,622592);assert.equal(r.commands,5623);assert.deepEqual(r.differences,[]);
 const corrupt=Buffer.from(output);corrupt[4]^=1;corrupt[48*4]^=1;assert.equal(compareActorChildrenTick(input,corrupt).differences.length,2);
});
