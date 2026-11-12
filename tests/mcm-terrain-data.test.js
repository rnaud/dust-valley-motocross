import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readMcmTerrainBanks,decompressMcmBlock} from '../scripts/mcm-reference/terrain-data.mjs';

test('terrain LZW matches original literals, dictionary expansion, width and reset codes',()=>{
  const {fixtures}=JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/terrain-compression-wine11.json',import.meta.url)));
  for(const c of fixtures)assert.equal(decompressMcmBlock(Buffer.from(c.inputHex,'hex'),c.size).toString('hex'),c.outputHex);
});

test('terrain bank reader respects serialized lengths and retains the hierarchy offset',()=>{
  const word=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n);return b;};
  const scale=Buffer.alloc(4);scale.writeFloatLE(.125);
  const data=Buffer.concat([Buffer.from('TRN\0'),word(2),word(0),word(3),scale,word(1),word(0x12345678),
    ...[512,580,4624].flatMap((size,i)=>[word(size),word(size),Buffer.alloc(size,i+1)]),Buffer.from('remaining hierarchy')]);
  const r=readMcmTerrainBanks(data);
  assert.equal(r.heightScale,.125);assert.equal(r.field954,3);assert.equal(r.banks.length,1);
  assert.deepEqual(r.banks[0].map(b=>[b.size,b.compressed,b.data[0]]),[[512,false,1],[580,false,2],[4624,false,3]]);
  assert.equal(data.subarray(r.nextOffset).toString(),'remaining hierarchy');
  assert.throws(()=>readMcmTerrainBanks(data.subarray(0,r.nextOffset-1)),/Truncated/);
});

test('terrain decoder rejects truncated streams and output overflow',()=>{
  assert.throws(()=>decompressMcmBlock(Buffer.alloc(4),4),/Truncated/);
  const {fixtures}=JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/terrain-compression-wine11.json',import.meta.url)));
  assert.throws(()=>decompressMcmBlock(Buffer.from(fixtures[0].inputHex,'hex'),1),/Invalid LZW/);
});
