// TRN v2 prefix recovery: 0x410260, palette 0x404230, sample banks 0x44ea00.
// Rendering resources and the following tile hierarchy are not parsed here.
export function readMcmTerrainBanks(bytes) {
  let offset=0;
  const take=n=>{if(!Number.isSafeInteger(n)||n<0||offset+n>bytes.length)throw new Error('Truncated TRN');const b=bytes.subarray(offset,offset+n);offset+=n;return b;};
  const u32=()=>take(4).readUInt32LE();
  if(take(4).toString('hex')!=='54524e00'||u32()!==2)throw new Error('Expected TRN version 2');
  const blocks=[];
  if(u32()) {
    take(8);const compressed=u32();
    for(const size of [768,32768,65536]) {
      const length=compressed?u32():size,at=offset,data=take(length);
      blocks.push({kind:'palette',offset:at,size,compressed:!!compressed&&length!==size,data});
    }
  }
  const field954=u32(),heightScale=take(4).readFloatLE(),bankCount=u32();
  if(bankCount>100000)throw new Error('Excessive terrain bank count');
  take(bankCount*4); // Serialized pointers are skipped by the original loader.
  const banks=[];
  for(let bank=0;bank<bankCount;bank++) {
    const entries=[];
    for(const size of [512,580,4624]) {
      const length=u32(),declaredSize=u32(),at=offset,data=take(length);
      if(declaredSize!==size||length>size)throw new Error('Unsupported terrain bank block size');
      const entry={kind:'bank',bank,offset:at,size,compressed:declaredSize>length,data};
      blocks.push(entry);entries.push(entry);
    }
    banks.push(entries);
  }
  return {field954,heightScale,banks,blocks,nextOffset:offset};
}

// Original 0x427a90: MSB-first LZW with explicit end, width and reset codes.
// Original course streams emit one extra byte beyond their nominal size. Return
// it for exact validation; callers consume only the nominal-size prefix. Reject
// larger overruns and malformed input instead of reproducing unchecked writes.
export function decompressMcmBlock(bytes,size) {
  let bit=32,width=9,next=259,previous=null,used=0;
  const output=Buffer.alloc(size+1),dictionary=[];
  const read=()=>{if(bit+width>bytes.length*8)throw new Error('Truncated LZW');let n=0;for(let j=0;j<width;j++,bit++)n=n*2+((bytes[bit>>>3]>>>(7-(bit&7)))&1);return n;};
  while(true) {
    const code=read();
    if(code===256)break;
    if(code===257){if(++width>16)throw new Error('Invalid LZW width');continue;}
    if(code===258){width=9;next=259;previous=null;dictionary.length=0;continue;}
    let entry;
    if(code<256)entry=Buffer.from([code]);
    else if(code<next)entry=dictionary[code];
    else if(code===next&&previous)entry=Buffer.concat([previous,previous.subarray(0,1)]);
    if(!entry||used+entry.length>size+1)throw new Error(`Invalid LZW code ${code}, next ${next}, width ${width}, output ${used}+${entry?.length}, bit ${bit}`);
    entry.copy(output,used);used+=entry.length;
    if(previous)dictionary[next++]=Buffer.concat([previous,entry.subarray(0,1)]);
    previous=entry;
  }
  if(used!==size&&used!==size+1)throw new Error(`LZW output size ${used}, expected ${size}`);
  return output.subarray(0,used);
}
