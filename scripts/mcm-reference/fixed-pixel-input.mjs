// Compact native capture/oracle record. Pointer targets are serialized by value.
export function unpackFixedPixelInput(a){
 if(a.length!==231)throw Error('Invalid packed pixel input');
 const b=Buffer.alloc(924);a.forEach((v,i)=>b.writeUInt32LE(v>>>0,i*4));
 return {seed:b.subarray(0,132),stageCount:a[33],cap30:a[34],cap51:a[35]&255,cap54:a[35]>>>8&255,cap55:a[35]>>>16&255,stateBytes:[...b.subarray(144,148)],fogMode:a[37],fogFallback:a[38],rasterMode:a[39],colorKey:a[40],alphaFunction:a[41],vertexShader:a[42],vertexMask:a[43],transformed:a[44]&255,textureCoordinateMask:a[44]>>>8&255,declarationPresent:a[45],declarationFlags:a[46]&255,stages:Array.from({length:8},(_,j)=>a.slice(47+j*18,65+j*18)),textures:Array.from({length:8},(_,j)=>{const t=a.slice(191+j*5,196+j*5);return {view:t[0],resource:t[1],format:t[2]&65535,type:t[3],flags:t[4]&255};})};
}
