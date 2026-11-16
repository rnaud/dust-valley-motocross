import assert from 'node:assert/strict';
import {tickMcmApplication} from '../../src/physics/mcm/application-frame.js';
const bits=v=>new Uint32Array(Float32Array.of(v).buffer)[0];
export function connectWorldApplicationFrame(runtime,files,frameCount){
 const initial=JSON.parse(files['world-application-initial.json']);
 assert.equal(initial.phase,'world-entry');assert.equal(initial.frame,0);assert.equal(initial.app,runtime.world.entry.world);
 assert.equal(initial.deltaBits,runtime.world.entry.dtBits);
 const appBytes=Buffer.from(runtime.world.entry.worldHex,'hex'),app=initial.app,mem=new Map();
 const fields={table:0,owner:8,input:0x10,optional:0x318,root:0x430,paused:0x444,current:0x464,previous:0x468};
 for(const[key,offset]of Object.entries(fields)){assert.equal(initial[key],appBytes.readUInt32LE(offset));mem.set(app+offset,initial[key]);}
 mem.set(initial.root,initial.rootTable);mem.set(initial.rootTable+0x2c,initial.update);mem.set(initial.table+0x24,initial.draw);mem.set(initial.table+0x2c,initial.present);
 const u32=a=>{assert.ok(mem.has(a),'Uncaptured application address '+a.toString(16));return mem.get(a);},put32=(a,v)=>{assert.ok(mem.has(a));mem.set(a,v>>>0);};
 const rows=files['world-application-observations.jsonl'].trim().split('\n').filter(Boolean).map(JSON.parse);
 let consumed=0,frames=0,clocks=0,comparedWords=0,updates=0,draws=0,presentations=0,ownerFrames=0;
 const reports=[];
 return {run(frame,observedDelta,{update,draw,owner}){
  assert.equal(frame,frames++);const selected=rows.filter(r=>r.frame===frame);let cursor=0;
  const take=phase=>{const r=selected[cursor++];assert.equal(r?.phase,phase,'Missing/reordered application boundary');assert.equal(r.frame,frame);consumed++;return r;};
  const compare=r=>{
   assert.equal(r.app,app);
   for(const [key,offset]of Object.entries(fields)){assert.equal(u32(app+offset),r[key],`Retained application ${key} differs at ${frame}:${r.phase}`);comparedWords++;}
   for(const [key,address]of [['rootTable',u32(app+0x430)],['update',u32(u32(app+0x430))+0x2c],['draw',u32(app)+0x24],['present',u32(app)+0x2c]]){assert.equal(u32(address),r[key],`Retained application ${key} differs`);comparedWords++;}
  };
  const observe=phase=>compare(take(phase));
  const partial=Symbol('final checkpoint inside update');
  const runUpdate=delta=>{assert.equal(bits(delta),bits(observedDelta),'Application-derived bike delta differs');updates++;update(delta);if(frame===frameCount-1){assert.equal(cursor,selected.length,'Unexpected final application tail');throw partial;}observe('update-after');};
  const runDraw=()=>{draw();draws++;observe('draw-after');};
  const present=()=>{presentations++;observe('present-after');}; // Device/presentation internals remain external.
  const advanceOwner=()=>{owner();ownerFrames++;};
  let clockRow,deltaUsed=observedDelta;
  try{
   if(frame===0){
    // Atomic initialization is inside root update; don't repeat its clock/input prefix.
    runUpdate(observedDelta);runDraw();present();advanceOwner();put32(app+0x468,u32(app+0x464));observe('exit');
   }else{
    observe('entry');
    const result=tickMcmApplication(app,{u32,put32},{
     clock:()=>{clockRow=take('clock-after');clocks++;return clockRow.current;},
     input:(address,delta)=>{assert.equal(address,initial.input);compare(clockRow);observe('input-after');deltaUsed=delta;},
     optional:()=>{throw Error('Application optional service is not connected');},
     virtual:(target,address,delta)=>{
      if(address===initial.root&&target===initial.update){assert.ok(initial.input,'Unconnected no-input clock boundary');observe('optional-after');runUpdate(delta);}
      else if(address===app&&target===initial.draw)runDraw();
      else if(address===app&&target===initial.present)present();
      else throw Error('Unconnected application virtual service');
     },
     owner:address=>{assert.equal(address,initial.owner);advanceOwner();},
    });
    assert.equal(result,1);observe('exit');
   }
  }catch(error){if(error!==partial)throw error;}
  assert.equal(cursor,selected.length,'Unconsumed application boundaries');
  reports.push({frame,deltaBits:bits(deltaUsed),current:u32(app+0x464),previous:u32(app+0x468)});
 },report(){assert.equal(consumed,rows.length);assert.equal(frames,frameCount);return{frames,clocks,updates,draws,presentations,ownerFrames,comparedWords,reports,scope:'467f40 derives elapsed time and calls retained root update, drawing and 494820 owner in order. Platform clock returns and input/presentation service boundaries remain external. First checkpoint starts inside update; final checkpoint ends inside update. Optional services or changed application context fail explicitly.'};}};
}
