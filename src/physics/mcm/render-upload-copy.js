// Wine 11 wined3d 1990d9 -> 6b30 -> 1a2480, host-memory branch 1a2820.
// Buffer-backed paths remain explicit boundaries; they have different calls.
export function mcmHostUploadCopyStores({callerEsp,destination,sourceBuffer,destinationBuffer,count}){
 if(sourceBuffer||destinationBuffer)return {boundary:'buffer-backed',stores:[]};
 if(!Number.isInteger(count)||count<0||count>0xffffffff)throw Error('Invalid upload range count');
 // Callback saves 4 registers and reserves 0x30 bytes: body = caller-0x44.
 // memcpy CALL, push EBP, push EDI write caller-0x50. EDI holds the
 // destination descriptor throughout the host-copy loop, not pixel data.
 return {boundary:'host-copy',stores:Array.from({length:count},()=>({address:(callerEsp-0x50)>>>0,value:destination>>>0}))};
}
