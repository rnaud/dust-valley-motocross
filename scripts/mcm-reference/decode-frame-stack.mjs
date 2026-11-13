// Main-update stack at the existing scheduler-entry / update-exit breakpoints.
// Entry locals may be stale: decoding them does not make them initialized inputs.
export function decodeFrameStack(row){
 if(typeof row.stackHex!=='string'||!/^[0-9a-f]{6144}$/i.test(row.stackHex)||!/^[0-9a-f]{8}$/i.test(row.stackAddress??''))throw Error('Missing or invalid frame stack');
 const bytes=Buffer.from(row.stackHex,'hex'),address=parseInt(row.stackAddress,16);
 if(address+bytes.length>0x100000000)throw Error('Invalid stack address range');
 for(const [field,offset] of [['frameBits',0xbfc],['dtBits',0x10],['steps',0x20]])if(bytes.readUInt32LE(offset)!==row[field])throw Error(`Stack metadata differs: ${field}`);
 const u32=o=>bytes.readUInt32LE(o),f32=o=>bytes.readFloatLE(o);
 const vector=o=>{const v=new Float64Array(3);for(let i=0;i<3;i++)v[i]=f32(o+i*4);return v;};
 const pointOffsets=[0x504,0x510,0x324,0x348,0x300,0x2e8,0x2dc,0x30c,0x7ec,0x4f8];
 return {address,bytes,u32,f32,pointOffsets,points:pointOffsets.map(vector),phase:row.phase};
}
