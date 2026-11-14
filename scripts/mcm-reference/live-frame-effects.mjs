// Captured visual-effect allocations remain byte-backed, preserving untouched
// fields while exposing the original helper stores to the recovered frame tail.
export function loadFrameEmitter(record,exhaust=false){
 const bytes=Buffer.from(record.hex,'hex'),expected=exhaust?0x480:0x84;
 if(record.size!==expected||bytes.length!==expected)throw new Error('Wrong emitter observation size');
 const emitter={bytes,address:record.address},position=exhaust?0x4c:0x48;
 for(const [name,offset] of Object.entries({position,previousPosition:position+12,...(!exhaust?{velocity:0x78}:{})}))
  Object.defineProperty(emitter,name,{get:()=>[0,4,8].map(i=>bytes.readFloatLE(offset+i)),set:value=>value.forEach((x,i)=>bytes.writeFloatLE(x,offset+i*4))});
 for(const [name,offset] of Object.entries({active:0x64,color:exhaust?0x47c:0x80,...(exhaust?{started:0x70,stopping:0x74}:{})}))
  Object.defineProperty(emitter,name,{get:()=>bytes.readUInt32LE(offset),set:value=>bytes.writeUInt32LE(value>>>0,offset)});
 for(const [name,offset] of Object.entries(exhaust?{period:0x44,duration:0x48}:{intensity:0x7c}))
  Object.defineProperty(emitter,name,{get:()=>bytes.readFloatLE(offset),set:value=>bytes.writeFloatLE(value,offset)});
 return emitter;
}

export function connectLiveFrameEffects(c,{memory:m,checkpoint,row}){
 if(!row.visualEffects)return;
 const a=checkpoint.bikeAddress,environment=row.effectsEnvironment,p=c.contactPhase;
 if(!environment||row.visualEffects.length!==3||!environment.shape)throw new Error('Missing frame-effects environment');
 const emitters=row.visualEffects.map((record,i)=>{
  if(record.address!==m.u32(a+[0xc94,0xc98,0xca0][i]))throw new Error('Emitter address differs from checkpoint');
  return loadFrameEmitter(record,i===2);
 });
 for(const offset of [0x8c0,0xc90,0xca4,0xca8,0xcac,0xcb0,0xcb4,0xcbc,0xcc0])c.bike[`field${offset.toString(16)}`]=m.u32(a+offset);
 for(const offset of [0x850,0x854,0xcb8])c.bike[`field${offset.toString(16)}`]=m.f32(a+offset);
 if(c.bike.fieldca8!==environment.shape)throw new Error('Frame-effects target differs from checkpoint');
 const target=Buffer.from(environment.targetHex,'hex');if(target.length!==12)throw new Error('Wrong frame-effects target size');
 const inputs={};
 const getters={rearPoint:()=>p.points[3],frontPoint:()=>p.points[2],chassisFront:()=>p.chassisSurface[0],chassisRear:()=>p.chassisSurface[1],
  rearContact:()=>p.rearContact,frontContact:()=>p.frontContact,control1c:()=>p.control1c,control30:()=>p.control30,
  traction:()=>p.traction.scratch[0],tractionLoss:()=>p.traction.scratch[1],inverseDt:()=>p.turnScale,rearDelta:()=>p.motionTransform.rearDelta,
  turnAngle:()=>p.frontLoad.turnAngle,rearPerpendicular:()=>p.traction.tire.perpendicular,rearAlignment:()=>p.traction.tire.alignment,frontPerpendicular:()=>p.frontTire.perpendicular};
 for(const [name,get] of Object.entries(getters))Object.defineProperty(inputs,name,{get});
 c.frameEffects={enabled:environment.enabled,occlusion:environment.occlusion,selectedPlayer:environment.selectedBike===a,
  settingsDisabled:environment.disabled,eventState:environment.eventState,emitters,inputs,queryTrace:[],
  resolveTarget:address=>{if(address!==environment.shape)throw new Error('Uncaptured frame-effects target');return [0,4,8].map(o=>target.readFloatLE(o));}};
 const filter=m.u32(a+0x900);
 if(row.accelerationFilterAddress!==undefined&&row.accelerationFilterAddress!==filter)throw new Error('Acceleration filter address differs from checkpoint');
 c.bike.savedPosition=[0,4,8].map(o=>m.f32(a+0x56c+o));
 c.frameReturn={disabled:environment.disabled,state:environment.eventState,playerIsBike:environment.selectedBike===a};
 c.frameTail={frameDelta:0,filter:{value:m.f32(filter),duration:m.f32(filter+4)}};
}
