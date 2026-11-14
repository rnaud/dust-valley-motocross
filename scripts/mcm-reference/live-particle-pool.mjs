// Full captures retain allocations in their initial address order while the
// native slot table can reorder them. Legacy 68-byte records are partial and
// can still replay emitter-only histories; they cannot drive shared-pool ticks.
export function loadLiveParticlePool(child,expectedAddress){
 const stride=child.particleStride??0x44,stable=child.particleOrder==='initial-allocation-order';
 if(![0x44,0x48].includes(stride)||(stride===0x48&&!stable))throw Error('Unsupported particle capture layout');
 const poolBytes=Buffer.from(child.poolHex,'hex'),particleBytes=Buffer.from(child.particlesHex,'hex');
 if(child.poolAddress!==expectedAddress||poolBytes.length!==0x2004||particleBytes.length!==1000*stride||poolBytes.readUInt32LE(0x30)>1000)throw Error('Invalid rider particle pool capture');
 const addresses=Array.from({length:1000},(_,i)=>poolBytes.readUInt32LE(0x44+i*4));
 if(addresses.some(a=>!a)||new Set(addresses).size!==1000)throw Error('Invalid rider particle allocation ownership');
 const index=new Map(addresses.map((address,i)=>[address,i]));
 const pool={get count(){return poolBytes.readUInt32LE(0x30);},set count(v){poolBytes.writeUInt32LE(v,0x30);},
  get acceleration(){return [0x1ff8,0x1ffc,0x2000].map(o=>poolBytes.readFloatLE(o));},
  particle(n){const i=stable?index.get(poolBytes.readUInt32LE(0x44+n*4)):n;if(i===undefined)throw Error('Unknown particle allocation');return new DataView(particleBytes.buffer,particleBytes.byteOffset+i*stride,stride);},
  swap(a,b){if(!stable||stride!==0x48)throw Error('Shared particle updates require full stable allocation capture');const x=poolBytes.readUInt32LE(0x44+a*4),y=poolBytes.readUInt32LE(0x44+b*4);poolBytes.writeUInt32LE(y,0x44+a*4);poolBytes.writeUInt32LE(x,0x44+b*4);}
 };
 return {pool,poolBytes,particleBytes,particleStride:stride,stableParticleOrder:stable};
}
