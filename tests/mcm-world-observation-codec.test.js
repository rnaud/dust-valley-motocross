import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeWorldAnimation,decodeWorldFrames} from '../scripts/mcm-reference/world-observation-codec.mjs';
test('animation assertion deduplication preserves every allocation and changed byte',()=>{
 const block={address:4096,size:4,hex:'12345678'},changed={...block,hex:'12345679'};
 const source=[{phase:'after-update',animationState:[block,block]},{phase:'after-update',animationState:[block,changed]}];
 const blocks=[],index=new Map(),encoded=source.map(row=>encodeWorldAnimation(row,blocks,index));
 assert.equal(blocks.length,2);assert.deepEqual(encoded.map(r=>r.animationStateRefs),[[0,0],[0,1]]);
 const files={'frames.jsonl':encoded.map(JSON.stringify).join('\n'),'world-animation-observations.json':JSON.stringify(blocks)};
 assert.deepEqual(decodeWorldFrames(files),source);
 assert.deepEqual(decodeWorldFrames({'frames.jsonl':source.map(JSON.stringify).join('\n')}),source);
 encoded[1].animationStateRefs[1]=2;files['frames.jsonl']=encoded.map(JSON.stringify).join('\n');
 assert.throws(()=>decodeWorldFrames(files),/Missing animation observation block/);
});
