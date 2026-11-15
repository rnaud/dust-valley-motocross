import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readMcmTerrainBanks,readMcmTerrainResources,decompressMcmBlock} from '../scripts/mcm-reference/terrain-data.mjs';

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

test('terrain hierarchy connects file offsets, sample banks and world-coordinate queries',async()=>{
  const {readMcmTerrain}=await import('../scripts/mcm-reference/terrain-data.mjs');
  const {queryMcmTerrainHeight}=await import('../src/physics/mcm/terrain-height.js');
  const word=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n);return b;};
  const scale=Buffer.alloc(4);scale.writeFloatLE(.125);
  const samples=Buffer.alloc(4624);
  for(let i=0;i<289;i++){samples.writeUInt16LE(i,i*16+2);samples.writeFloatLE(1,i*16+8);}
  const prefix=Buffer.concat([Buffer.from('TRN\0'),word(2),word(0),word(3),scale,word(1),word(0),
    ...[Buffer.alloc(512),Buffer.alloc(580),samples].flatMap(b=>[word(b.length),word(b.length),b]),word(0),word(0)]);
  const rootAt=prefix.length,tableAt=rootAt+60,leafAt=tableAt+1024;
  const root=Buffer.alloc(60),leaf=Buffer.alloc(60),table=Buffer.alloc(1024);
  root.writeFloatLE(1,4);root.writeUInt32LE(1,20);root.writeUInt32LE(12,24);root.writeUInt32LE(tableAt,56);
  leaf.writeFloatLE(1,4);leaf.writeUInt32LE(8,24);table.writeUInt32LE(leafAt);
  const data=Buffer.concat([prefix,root,table,leaf]),r=readMcmTerrain(data);
  assert.equal(r.nodes.size,2);assert.equal(r.root.children[0].offset,leafAt);assert.equal(r.root.children[1],null);
  assert.equal(r.worldToGrid,.03125);
  assert.deepEqual(queryMcmTerrainHeight({...r,point:[16,0,16]}),[16,1.125,16]);
  data.writeUInt32LE(rootAt,tableAt);
  assert.throws(()=>readMcmTerrain(data),/cycle/);
});


test('terrain rendering resources preserve shared texture, palette, base pixels and mip boundaries',()=>{
  const word=n=>{const b=Buffer.alloc(4);b.writeUInt32LE(n);return b;};
  const group=(count,width,height)=>Buffer.concat([word(width),word(height),word(4),
    ...Array.from({length:count},(_,i)=>Buffer.alloc(width*height,10+i)),
    ...Array.from({length:count},(_,i)=>Buffer.alloc(width*height/4,90+i))]);
  const palette=Buffer.from(Array.from({length:768},(_,i)=>i%256));
  const bytes=Buffer.concat([word(2),word(1),group(1,2,2),group(2,4,4),Buffer.from('hierarchy')]);
  const prefix={nextOffset:0,blocks:[{kind:'palette',size:768,compressed:false,data:palette}]};
  const r=readMcmTerrainResources(bytes,prefix);
  assert.deepEqual(r.palette,palette);
  assert.deepEqual([...r.sharedTexture.pixels],[10,10,10,10]);
  assert.deepEqual([...r.sharedTexture.mip],[90]);
  assert.equal(r.textures.length,2);
  assert.deepEqual([...r.textures[1].pixels],Array(16).fill(11));
  assert.deepEqual([...r.textures[1].mip],Array(4).fill(91));
  assert.equal(bytes.subarray(r.nextOffset).toString(),'hierarchy');
  assert.throws(()=>readMcmTerrainResources(bytes.subarray(0,r.nextOffset-1),prefix),/Truncated/);
  const invalid=Buffer.from(bytes);invalid.writeUInt32LE(0,8);
  assert.throws(()=>readMcmTerrainResources(invalid,prefix),/Unsupported/);
});
