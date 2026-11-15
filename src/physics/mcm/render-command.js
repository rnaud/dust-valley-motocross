// Pinned Wine wined3d RVA 0x1ca1d8..0x1ca228. This serializes the
// command after allocation; allocation and submission policy are separate.
export function mcmRenderUpdateCommand({resource,subresource,box,upload,rowPitch,slicePitch}){
 if(box.length!==6||upload.length!==3)throw new RangeError('Invalid update command fields');
 return Uint32Array.from([43,resource,subresource,...box,...upload,rowPitch,slicePitch]);
}

// RVA 0x1b63d9..0x1b6463. Preserve free(NULL) as distinct from no free.
// A nonzero buffer can take a logging path, but does not free this pointer.
export function mcmRenderCommandFree(command){
 if(command.length!==14)throw new RangeError('Invalid update command size');
 return (command[11]&4)&&command[9]===0 ? {pointer:command[10]>>>0} : null;
}
