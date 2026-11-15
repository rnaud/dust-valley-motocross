// Pinned Wine wined3d 0x1c6e00. Table at RVA 0x2316e0 (12-byte rows).
const units=[16,16,16,16,4,4,1,1];
const capacities=[256,224,16,16,16,16,1984,416];
export function mcmRenderResourceUpload({kind,flags,offset,count,data,cachedResource,createdResource,createResult,adapterFlags}){
 if(!Number.isInteger(kind)||kind<0||kind>=8)throw new RangeError('Unsupported upload kind');
 let resource=cachedResource>>>0,creation=null;
 if(!resource){
  if(!Number.isInteger(createResult)||!Number.isInteger(createdResource))throw new TypeError('Resource creation boundary result required');
  creation=[units[kind]*capacities[kind],0,adapterFlags&0x20?4:0,adapterFlags&0x20?1:14,0,0];
  if((createResult|0)<0)return {resource,creation,update:null,command:null};
  resource=createdResource>>>0;
 }
 const start=Math.imul(offset,units[kind])>>>0,bytes=Math.imul(count,units[kind])>>>0;
 return {resource,creation,update:{resource,subresource:0,source:data>>>0,
  rowPitch:bytes,slicePitch:bytes,box:[start,0,(start+bytes)>>>0,1,0,1]},
  command:Uint32Array.from([33,kind,offset,count,flags])};
}
