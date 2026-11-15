import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mcmTerrainUv} from '../src/mcm-terrain-uv.js';
test('terrain texture layout and all eight UV orientations match pinned original execution',()=>{
  const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/mcm/terrain-uv-wine11.json',import.meta.url)));
  for(const {args,expected} of fixture.cases){
    const r=mcmTerrainUv(args),actual=Buffer.alloc(20);
    [r.vOffset,r.uOffset,r.scale,r.u,r.v].forEach((v,j)=>actual.writeFloatLE(v,j*4));
    assert.equal(actual.toString('hex'),expected,JSON.stringify(args));
  }
});
