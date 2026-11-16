import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {loadLiveCollisionWorld} from './live-collision-world.mjs';
import {updateMcmCollisionGrid} from '../../src/physics/mcm/collision-grid.js';

// Stage replay: geometry and invocation order are explicit external inputs.
// Links are initialized once from the checkpoint, never from later observations.
export function analyzeGridTrace(checkpoint,collision,rows){
 const world=loadLiveCollisionWorld(checkpoint,collision),differences=[],calls=[];
 assert.ok(rows.length>0&&rows.length%2===0,'Incomplete grid call');
 let words=0;
 const compare=(row)=>{
  const blocks=[[row.cellsAddress,row.cellsHex],...row.objects.map(o=>[o.entriesAddress,o.entriesHex])];
  for(const [address,hex] of blocks){
   const bytes=Buffer.from(hex,'hex');assert.equal(bytes.length%24,0);
   for(let offset=0;offset<bytes.length;offset+=24){
    const node=world.nodes.get(address+offset);assert.ok(node,'Unknown grid node');
    const actual=[node.previous?.token??0,node.next?.token??0,node.owner,node.cell,node.other,node.active];
    for(let i=0;i<6;i++){const expected=bytes.readUInt32LE(offset+i*4);words++;
     if((actual[i]>>>0)!==expected)differences.push({sequence:row.sequence,phase:row.phase,address:address+offset+i*4,expected,actual:actual[i]>>>0});
    }
   }
  }
 };
 for(let i=0;i<rows.length;i+=2){
  const before=rows[i],after=rows[i+1];
  assert.equal(before.phase,'before-grid');assert.equal(after.phase,'after-grid');
  for(const [j,row] of [[i,before],[i+1,after]]){
   assert.equal(row.sequence,j);assert.equal(row.captureId,checkpoint.captureId);assert.equal(row.manager,world.manager);
   assert.equal(row.objects.length,world.objects.length);
   const g=Buffer.from(row.gridHex,'hex');assert.equal(g.length,20);
   assert.equal(g.readUInt32LE(8),world.grid.dimension);assert.equal(g.readUInt32LE(16),row.cellsAddress);
   assert.equal(row.cellsAddress,world.grid.cells[0].token);
   assert.equal(row.cellsHex.length,world.grid.cells.length*48);
   assert.equal(g.readFloatLE(0),world.grid.centerX);assert.equal(g.readFloatLE(4),world.grid.centerZ);assert.equal(g.readFloatLE(12),world.grid.cellSize);
   for(let k=0;k<world.objects.length;k++){
    const observed=row.objects[k],object=world.objects[k],b=Buffer.from(observed.hex,'hex');
    assert.equal(b.length,0x110);assert.equal(observed.address,object.address);assert.equal(observed.entriesAddress,object.entriesAddress);
    assert.equal(observed.entriesHex.length,object.entries.length*48);
    assert.equal(b.readUInt32LE(0),object.owner);assert.equal(b.readUInt32LE(0x98),world.manager);
    assert.equal(b.readUInt32LE(0x8c),object.entriesAddress);assert.equal(b.readUInt32LE(0x90),object.entries.length);assert.equal(b.readUInt32LE(0xf4),object.type);
   }
  }
  for(const key of ['collider','caller','thread','enabled'])assert.equal(after[key],before[key]);
  const object=world.objects.find(o=>o.address===before.collider);assert.ok(object);
  const bytes=Buffer.from(before.objects.find(o=>o.address===before.collider).hex,'hex');
  const vector=(offset,n)=>Array.from({length:n},(_,j)=>bytes.readFloatLE(offset+j*4));
  object.matrix=vector(0x1c,16);object.localCenter=vector(0x70,3);object.radius=bytes.readFloatLE(0x5c);
  compare(before);updateMcmCollisionGrid(object,world.grid,before.enabled);compare(after);
  calls.push({sequence:before.sequence,collider:before.collider,caller:before.caller,eventSequence:before.eventSequence,completedBikeFrames:before.completedBikeFrames});
 }
 return {scope:'Retained grid links with external per-call geometry and invocation order; not whole-world physics parity',calls,words,differences};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const dir=process.argv[2],read=name=>JSON.parse(fs.readFileSync(`${dir}/${name}`,'utf8'));
 const result=analyzeGridTrace(read('checkpoint.json'),read('collision.json'),fs.readFileSync(`${dir}/grid.jsonl`,'utf8').trim().split('\n').map(JSON.parse));
 console.log(JSON.stringify(result,null,2));
}
