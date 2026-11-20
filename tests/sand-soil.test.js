import test from 'node:test';
import assert from 'node:assert/strict';
import {SandSurface,DEFAULT_SOIL} from '../src/sand-physics.js';

const soft={maxDepth:.32,maxLift:.2,settle:.07,dig:.14,lip:.02,plough:.11,packRelief:.05,repose:31,roost:0};
const deltas=s=>{const out=new Map();for(const [id,tile] of s.soil){const [tx,tz]=id.split(',').map(Number);tile.delta.forEach((d,i)=>{if(d)out.set(`${tx*64+i%64},${tz*64+Math.floor(i/64)}`,d);});}return out;};

test('default soil profile is unchanged and needs no options',()=>{
 const s=new SandSurface(()=>0);assert.deepEqual(s.profile,{...DEFAULT_SOIL});
 const before=s.changed.size;s.slump();assert.equal(s.changed.size,before);
});

test('rut walls slump to the angle of repose and conserve slumped volume',()=>{
 const s=new SandSurface(()=>0,{soil:soft}),limit=Math.tan(31*Math.PI/180)*.25;
 for(let i=0;i<240;i++)s.deform([{x:0,z:0,load:1800,demand:1},null],1/120);
 // Hand-carve an overly steep pit wall, then let it relax.
 const {tile,index}=s.cell(0,0);tile.delta[index]=-.3;s.mark(0,0);
 const total=()=>[...deltas(s).values()].reduce((a,b)=>a+b,0),volume=total();
 for(let i=0;i<40;i++)s.slump();
 assert.ok(Math.abs(total()-volume)<1e-5,'slumping moves sand without creating it');
 let worst=0;for(const [k,d] of deltas(s)){const [x,z]=k.split(',').map(Number);for(const [nx,nz] of [[x+1,z],[x,z+1]]){const n=deltas(s).get(`${nx},${nz}`)??0;worst=Math.max(worst,Math.abs(d-n));}}
 assert.ok(worst<=limit*1.6,`steepest step ${worst} vs repose ${limit}`);
});

test('authored steep terrain does not flow; only rider displacement slumps',()=>{
 const cliff=(x,z)=>x>0?5:0,s=new SandSurface(cliff,{soil:soft});
 s.mark(0,0);s.mark(1,0);s.slump(4);assert.equal(s.soil.size?[...deltas(s).values()].length:0,0);
});

test('a driven rear tire throws roost behind itself',()=>{
 const ride=(roost,demand=1)=>{const s=new SandSurface(()=>0,{soil:{...soft,repose:0,roost}});for(let i=0;i<=60;i++)s.deform([{x:0,z:i*.05,load:1500,demand},null],1/120);return s;};
 const volume=s=>[...deltas(s).values()].reduce((a,b)=>a+b,0);
 const thrown=ride(.6),none=ride(0),coasting=ride(.6,0);
 assert.ok(thrown.displacementAt(0,-1.1)>.001,'mound lands behind the start');
 assert.equal(none.displacementAt(0,-1.1),0);assert.equal(thrown.displacementAt(0,4.5),0,'nothing thrown ahead');
 assert.ok(volume(thrown)>volume(none),'roost keeps dug sand on the surface');
 assert.equal(coasting.displacementAt(0,-1.1),0,'no roost without drive');
});

test('a swept wheel leaves one continuous trench, not a chain of pits',()=>{
 const s=new SandSurface(()=>0,{soil:{...soft,repose:0,roost:0}});
 for(let i=0;i<=24;i++)s.deform([{x:0,z:i*.25,load:1200,demand:1},null],1/60);
 const line=[];for(let z=0;z<=5;z+=.05)line.push(s.displacementAt(0,z));
 assert.ok(line.every(d=>d<-.02),`gaps in swept trench: ${Math.max(...line).toFixed(4)}`);
 assert.ok(Math.min(...line)<-.08,'the trench should reach the sinkage target');
 assert.equal(s.displacementAt(4,5),0,'the sweep must not extend past its capsule');
});
