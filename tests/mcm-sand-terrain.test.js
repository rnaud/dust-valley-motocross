import test from 'node:test';
import assert from 'node:assert/strict';
import {deformableMcmTerrain} from '../src/mcm-sand-terrain.js';

test('the recovered terrain samples any surface through displacementAt',()=>{
 const heights=Array(17*17).fill(100),normals=Array.from({length:17*17},()=>[0,1,0]);
 const leaf={level:0,originX:0,originY:0,scale:1,heights,normals};
 const original={root:leaf,heightScale:3/256,worldToGrid:1/3};
 const toDisplay=([x,,z])=>({x,z});
 const sand={version:1,displacementAt:()=>-.1};
 const wrapped=deformableMcmTerrain(original,sand,toDisplay);
 assert.ok(wrapped.root.heights[0]<100,'a negative displacement lowers the stored height');
 const first=wrapped.root.heights[0];
 sand.version=2;sand.displacementAt=()=>-.2;
 assert.ok(wrapped.root.heights[0]<first,'a later version refreshes the leaf');
});
