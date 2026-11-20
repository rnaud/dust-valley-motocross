import test from 'node:test';import assert from 'node:assert/strict';
import {createMcmHeightField,createCustomMcmTerrain} from '../src/mcm-custom-terrain.js';
import {queryMcmTerrainHeight} from '../src/physics/mcm/terrain-height.js';
import {sampleMcmTerrain} from '../src/physics/mcm/terrain-sample.js';

const FEET=.3048,CELL_FEET=3;
// queryMcmTerrainHeight takes native feet and returns feet, so convert back to
// the metres the height function speaks.
const metresAt=(field,cellX,cellZ)=>queryMcmTerrainHeight({...field,point:[cellX*CELL_FEET,0,cellZ*CELL_FEET]})[1]*FEET-field.offset;

test('a generated field samples back the height function it was built from',()=>{
 const heightAt=(x,z)=>2+.01*x+.02*z,field=createMcmHeightField({heightAt,cells:64,worldToGrid:1/CELL_FEET,originCellX:112,originCellZ:208});
 // Cell interiors, exact cell centres, an interior leaf border and the far corner.
 for(const [cx,cz] of [[124.5,215.5],[124,215],[128,224],[175.5,271.5],[143.25,248.75]]){
  const expected=heightAt(cx*CELL_FEET,cz*CELL_FEET),actual=metresAt(field,cx,cz);
  assert.ok(Math.abs(actual-expected)<.02,`cell ${cx},${cz}: ${actual} vs ${expected}`);
 }
});

test('generated normals follow the slope of the height function',()=>{
 // heightAt is in metres per native foot, so the unitless slope is divided by
 // 0.3048 before forming (-dh/dx, 1, -dh/dz).
 const field=createMcmHeightField({heightAt:(x,z)=>2+.01*x+.02*z,cells:32,worldToGrid:1/CELL_FEET,originCellX:0,originCellZ:0});
 const {normal}=sampleMcmTerrain(field.root,8,8),dx=.01/FEET,dz=.02/FEET,inverse=1/Math.sqrt(dx*dx+1+dz*dz);
 assert.ok(Math.abs(normal[0]+dx*inverse)<.01,'normal x');
 assert.ok(Math.abs(normal[1]-inverse)<.01,'normal y');
 assert.ok(Math.abs(normal[2]+dz*inverse)<.01,'normal z');
});

test('a custom terrain maps native cells onto the world-space height function',()=>{
 const nativeToWorld=(x,z)=>({x:x*FEET+100,z:z*FEET+50}),field=createCustomMcmTerrain({heightAtWorld:(x,z)=>.5*x-.25*z,nativeToWorld,initial:[300,0,300],cells:64,worldToGrid:1/CELL_FEET});
 assert.equal(field.cells,64);
 assert.ok(field.originCellX>=0&&field.originCellZ>=0);
 // The height stored at a native cell must equal the world function there.
 const cx=field.originCellX+20,cz=field.originCellZ+20,world=nativeToWorld(cx*CELL_FEET,cz*CELL_FEET);
 const sampled=metresAt(field,cx,cz),expected=.5*world.x-.25*world.z;
 assert.ok(Math.abs(sampled-expected)<.02,`${sampled} vs ${expected}`);
});

test('outside the generated field the sampler falls back instead of throwing',()=>{
 const field=createMcmHeightField({heightAt:()=>0,cells:32,worldToGrid:1/CELL_FEET,originCellX:0,originCellZ:0});
 const {height}=sampleMcmTerrain(field.root,5000,5000);
 assert.equal(height,0);
});
