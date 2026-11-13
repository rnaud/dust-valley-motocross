// Addressed reads from an explicitly partial original-memory capture. Missing
// dependencies fail rather than becoming zero-filled or synthetic state.
export function checkpointMemory(checkpoint){
 if(checkpoint?.schemaVersion!==1||checkpoint.kind!=='mcm-partial-local-checkpoint'||checkpoint.blockCount!==checkpoint.blocks?.length)throw Error('Invalid partial checkpoint');
 const blocks=checkpoint.blocks.map(b=>{
  if(!Number.isInteger(b.address)||b.address<=0||!Number.isInteger(b.size)||b.size<=0||b.address+b.size>0x100000000||typeof b.hex!=='string'||b.hex.length!==b.size*2||!/^[0-9a-f]+$/i.test(b.hex))throw Error('Invalid checkpoint block');
  return {...b,bytes:Buffer.from(b.hex,'hex')};
 }).sort((a,b)=>a.address-b.address);
 for(let i=1;i<blocks.length;i++)if(blocks[i].address<blocks[i-1].address+blocks[i-1].size)throw Error('Overlapping checkpoint blocks');
 const read=(address,size)=>{
  if(!Number.isInteger(address)||!Number.isInteger(size)||size<1)throw Error('Invalid memory read');
  const block=blocks.find(b=>address>=b.address&&address+size<=b.address+b.size);
  if(!block)throw Error(`Missing checkpoint memory at 0x${address.toString(16)} (${size} bytes)`);
  return Buffer.from(block.bytes.subarray(address-block.address,address-block.address+size));
 };
 return {read,u32:a=>read(a,4).readUInt32LE(),f32:a=>read(a,4).readFloatLE()};
}

// Original engine allocation and analog filter; no profile constants are
// substituted. The CRT stream is supplied separately by the capture protocol.
export function loadLiveEngine(checkpoint){
 const m=checkpointMemory(checkpoint),bike=checkpoint.bikeAddress;
 if(m.u32(bike)!==0x4d9a94)throw Error('Unsupported bike vtable');
 const address=m.u32(bike+0x8f0);m.read(address,0x1f0);
 if(m.u32(address)!==bike)throw Error('Engine owner differs from checkpoint bike');
 const f=o=>m.f32(address+o),u=o=>m.u32(address+o),gearCount=u(0x84);
 if(gearCount<1||gearCount>5)throw Error('Unsupported captured gear count');
 const array=(offset,stride=4)=>Array.from({length:gearCount},(_,i)=>f(offset+i*stride));
 const filterAddress=u(4);
 return {address,engine:{gearCount,ratios:array(8),thresholdBases:array(0x20,8),thresholdRanges:array(0x50),speedThresholds:array(0x64),
  downshiftRpm:f(0x78),previousRpmDemand:f(0x7c),shiftDuration:f(0x80),maxRpm:u(0x148),topGearLimitDisabled:!!u(0x14c),
  released:u(0x150),shiftThreshold:f(0x154),gear:u(0x158),rpmDemand:f(0x15c),state:f(0x160),shiftTimer:f(0x168),
  analogFilter:{value:m.f32(filterAddress),duration:m.f32(filterAddress+4)},randomScale:1/32768},memory:m};
}
