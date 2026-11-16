import assert from 'node:assert/strict';
export function worldThrottleAtFrame(protocol,frame){
 if(!Number.isInteger(frame)||frame<0)throw Error('Invalid world input frame');
 if(protocol==='player-throttle-frames-1-through-2')return frame>=1&&frame<3?1:0;
 if(protocol==='player-throttle-frames-0-through-95')return frame<96?1:0;
 if(protocol==='player-throttle-frames-0-through-47')return frame<48?1:0;
 if(protocol==='player-throttle-frames-0-through-11')return frame<12?1:0;
 throw Error('Unknown world control protocol');
}
// Validate the input experiment separately from physics outputs. Control values
// come from the declared protocol; query logs only prove it was applied.
export function validateWorldInputProtocol(files){
 const entry=JSON.parse(files['world-entry.json']),protocol=entry.inputProtocol;
 if(!protocol){assert.ok(!files['world-inputs.jsonl'],'Input log without declared protocol');return null;}
 worldThrottleAtFrame(protocol,0);
 assert.ok(files['world-inputs.jsonl'],'Missing applied world-input evidence');
 const rows=files['world-bikes.jsonl'].trim().split('\n').map(JSON.parse),inputs=files['world-inputs.jsonl'].trim().split('\n').map(JSON.parse),count=rows.length/(entry.bikes.length*2);
 assert.ok(Number.isInteger(count)&&count>=(protocol==='player-throttle-frames-0-through-95'?97:protocol==='player-throttle-frames-0-through-47'?49:protocol==='player-throttle-frames-0-through-11'?13:4),'Pulse must include throttle release');
 const throttle=frame=>worldThrottleAtFrame(protocol,frame),frames=Array.from({length:count},(_,frame)=>({frame,throttle:throttle(frame),queries:0}));
 for(const [index,row] of rows.entries())assert.equal(row.playerThrottle,throttle(Math.floor(index/(entry.bikes.length*2))),'Captured throttle protocol differs');
 for(const input of inputs){
  assert.ok(Number.isInteger(input.originalThrottle));assert.equal(typeof input.applied,'boolean');
  if(!input.applied)continue;
  assert.equal(input.bike,entry.bikes[0],'Pulse applied to non-player bike');assert.equal(input.activeBike,input.bike);
  assert.ok(Number.isInteger(input.frame)&&input.frame>=0&&input.frame<count);assert.equal(input.throttle,throttle(input.frame),'Applied throttle differs');frames[input.frame].queries++;
 }
 for(const frame of frames)if(!frame.queries){
  const [before,after]=rows.slice(frame.frame*entry.bikes.length*2,frame.frame*entry.bikes.length*2+2);
  assert.ok(Buffer.from(before.bodyHex,'hex').readUInt32LE(0x844)&&Buffer.from(after.bodyHex,'hex').readUInt32LE(0x844),`No applied input queries in frame ${frame.frame}`);
  frame.skipped='crash-state';
 }
 if(entry.steeringProtocol){
  assert.ok(['player-pursuit-ai-v1','player-pursuit-ai-v2'].includes(entry.steeringProtocol),'Unknown steering protocol');
  const steeringLimit=entry.steeringProtocol==='player-pursuit-ai-v2'?.75:.25;
  assert.ok(['player-throttle-frames-0-through-47','player-throttle-frames-0-through-95'].includes(protocol),'Unsupported pursuit throttle protocol');
  const restored=[...files['capture.log'].matchAll(/steering-restored address=([0-9a-f]+) original=([0-9a-f]+) verified=1/g)];assert.equal(restored.length,count,'Missing steering restoration evidence');
  for(let frame=0;frame<count;frame++){
   const [before,after,aiBefore,aiAfter]=rows.slice(frame*4,frame*4+4),input=before.steeringOverride;
   assert.ok(input,'Missing applied steering');assert.equal(before.bike,entry.bikes[0]);assert.deepEqual(after.steeringOverride,input);
   for(const key of ['originalBits','appliedBits'])assert.ok(Number.isInteger(input[key])&&input[key]>=0&&input[key]<=0xffffffff);
   const value=new Float32Array(Uint32Array.of(input.appliedBits).buffer)[0];assert.ok(Number.isFinite(value)&&Math.abs(value)<=steeringLimit,'Invalid pursuit steering');
   assert.equal(before.frameInput.steerBits,input.appliedBits);assert.equal(aiBefore.frameInput.steerBits,input.originalBits,'Steering not restored before AI');
   assert.equal(Number.parseInt(restored[frame][2],16),input.originalBits);assert.ok(!aiBefore.steeringOverride&&!aiAfter.steeringOverride,'Pursuit applied to AI');
  }
 }else assert.ok(rows.every(r=>!r.steeringOverride),'Steering override without declared protocol');

 return {protocol,frames};
}
