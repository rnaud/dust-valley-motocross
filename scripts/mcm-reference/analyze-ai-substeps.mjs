import assert from 'node:assert/strict';
import {analyzeAiFrameSequence} from './analyze-ai-frame-sequence.mjs';
import {floatBits} from '../../src/physics/mcm/math.js';

// One retained simulation. Native substep outputs only assert computed state.
// The 0x4ac5c5 observation exists only on the normal grounded control branch.
export function analyzeAiSubsteps(inputs,frames,riderEvents,rows){
 const boundaries=frames.filter(r=>r.phase!=='random'),count=boundaries.length/4;
 const phases=new Set(['contact','tires','motion','controls','rider','finish']);
 assert.ok(rows.length>0,'Missing AI substep observations');
 for(const row of rows){
  assert.equal(row.captureId,inputs.checkpoint.captureId);assert.equal(row.bike,inputs.checkpoint.bikeAddress);
  assert.ok(Number.isInteger(row.frame)&&row.frame>=0&&row.frame<count,'Invalid substep frame');
  assert.ok(Number.isInteger(row.substep)&&row.substep>=0,'Invalid substep index');
  assert.ok(phases.has(row.phase)||row.phase==='entry'||row.phase==='tail','Unknown substep phase');
 }
 const body=row=>{
  assert.equal(new Set(row.blocks.map(b=>b.address)).size,row.blocks.length,'Duplicate substep allocation');
  const block=row.blocks.find(b=>b.address===row.bike);assert.ok(block,'Missing substep bike');
  assert.equal(block.size,0xcc8);const bytes=Buffer.from(block.hex,'hex');assert.equal(bytes.length,block.size);return bytes;
 };
 let cursor=0,step=0,observed=0,componentWords=0,controlSkipped=0;
 const consume=(frame,phase)=>{const row=rows[cursor++];assert.ok(row,`Missing ${phase}`);assert.equal(row.frame,frame);assert.equal(row.phase,phase);assert.equal(row.substep,step);return row;};
 const result=analyzeAiFrameSequence(inputs,frames,riderEvents,{observe({frame,stage,context:c}){
  if(stage==='entry'){
   step=0;const row=consume(frame,'entry');assert.equal(body(row).toString('hex'),boundaries[frame*4].stateHex);return;
  }
  if(stage==='frame-tail'){
   const row=consume(frame,'tail');assert.equal(body(row).toString('hex'),boundaries[frame*4+3].stateHex);return;
  }
  if(!phases.has(stage))return;
  const p=c.contactPhase;
  if(stage==='controls'&&(p.state844||p.frontSuspension.contactLimited||p.rearSuspension.contactLimited||p.field4bc)){
   assert.notEqual(rows[cursor]?.phase,'controls','Unexpected grounded control observation');controlSkipped++;return;
  }
  const row=consume(frame,stage),expected=body(row),actual=c.aiController.projectBody();
  assert.equal(actual.byteLength,expected.length);
  for(let o=0;o<expected.length;o+=4)assert.equal(actual.getUint32(o,true),expected.readUInt32LE(o),`frame ${frame} step ${step} ${stage} body ${o.toString(16)}`);
  const check=(pointer,offset,value,integer=false)=>{
   const address=expected.readUInt32LE(pointer),block=row.blocks.find(b=>b.address===address);assert.ok(block,'Missing substep component');
   const bytes=Buffer.from(block.hex,'hex');assert.equal(bytes.length,block.size);
   assert.equal(integer?value>>>0:floatBits(value),bytes.readUInt32LE(offset),`frame ${frame} step ${step} ${stage} component ${pointer.toString(16)}+${offset.toString(16)}`);componentWords++;
  };
  check(0x8dc,0x4c,c.front.limited);check(0x8e0,0x4c,c.rear.limited);
  check(0x8e4,0x44,c.suspension.front.limited,true);check(0x8e4,0x58,c.component8e4.field58);check(0x8e4,0x5c,c.component8e4.field5c);
  for(let i=0;i<3;i++)check(0x8e4,0x4c+i*4,c.component8e4.value[i]);
  check(0x8e8,0x44,c.suspension.rear.limited,true);check(0x8e8,0x58,c.component8e8.field58);check(0x8e8,0x5c,c.component8e8.field5c);check(0x8ec,0x44,c.componentAngle);
  observed++;if(stage==='finish')step++;
 }});
 assert.equal(cursor,rows.length,'Unconsumed substep observations');
 return {...result,substepBoundaries:observed,substepBodyBytes:observed*0xcc8,componentWords,controlSkipped};
}
