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

// Physical terrain hierarchy from 0x48a2f0. Texture payloads are skipped using
// their serialized dimensions; only the physics-relevant node fields are kept.
export function readMcmTerrain(bytes) {
  const prefix=readMcmTerrainBanks(bytes);
  let offset=prefix.nextOffset;
  const u32=()=>{if(offset+4>bytes.length)throw new Error('Truncated terrain resources');const n=bytes.readUInt32LE(offset);offset+=4;return n;};
  const textureCount=u32(),hasSharedTexture=u32();
  const skipTextures=count=>{
    const width=u32(),height=u32(),format=u32();
    const pixelBytes=[0,3,2,2,1,3,1,2,2,3,2,2,4,2,2,4][format];
    if(!pixelBytes||width%2||height%2)throw new Error('Unsupported terrain texture format/dimensions');
    offset+=count*width*height*pixelBytes*5/4;
    if(!Number.isSafeInteger(offset)||offset>bytes.length)throw new Error('Truncated terrain textures');
  };
  if(hasSharedTexture)skipTextures(1);
  if(textureCount)skipTextures(textureCount);
  const rootOffset=offset,nodes=new Map(),pending=new Set(),bankCache=new Map();
  const bank=index=>{
    if(bankCache.has(index))return bankCache.get(index);
    const block=prefix.banks[index]?.[2];if(!block)throw new Error('Invalid terrain bank reference');
    const raw=block.compressed?decompressMcmBlock(block.data,block.size):block.data;
    const samples={heights:[],normals:[]};
    for(let i=0;i<289;i++){
      samples.heights.push(raw.readUInt16LE(i*16+2));
      samples.normals.push([4,8,12].map(j=>raw.readFloatLE(i*16+j)));
    }
    bankCache.set(index,samples);return samples;
  };
  const readNode=(at,depth=0)=>{
    if(pending.has(at)||depth>3)throw new Error('Invalid terrain hierarchy cycle/depth');
    if(nodes.has(at))return nodes.get(at);
    if(at<rootOffset||at+60>bytes.length)throw new Error('Invalid terrain node offset');
    const level=bytes.readUInt32LE(at+20),shift=bytes.readUInt32LE(at+24),bankIndex=bytes.readUInt32LE(at+40),table=bytes.readUInt32LE(at+56);
    if(level>2||shift>30)throw new Error('Unsupported terrain node level/shift');
    const node={offset:at,level,shift,bankIndex,bias:bytes.readFloatLE(at),scale:bytes.readFloatLE(at+4),...bank(bankIndex)};
    nodes.set(at,node);pending.add(at);
    if(table){
      if(table<rootOffset||table+1024>bytes.length)throw new Error('Invalid terrain child table');
      node.children=Array.from({length:256},(_,i)=>{const child=bytes.readUInt32LE(table+i*4);return child?readNode(child,depth+1):null;});
    }
    pending.delete(at);return node;
  };
  const root=readNode(rootOffset),exponent=root.shift-4*root.level;
  if(exponent<0||exponent>30)throw new Error('Invalid terrain grid scale');
  const worldToGrid=Math.fround(1/((2**exponent)*prefix.heightScale));
  return {...prefix,rootOffset,root,nodes,worldToGrid,textureCount,hasSharedTexture};
}
