// Pinned Wine 11 wined3d: stateblock +0x108 bit 1.
// SetTransform RVA 0x1f4628; apply gate 0x1bffe3; clear 0x1c04db.
export function setMcmRenderMatrixDirty(dirty,type){return !!dirty||(type>>>0)===2||(type>>>0)>255;}
// Apply prologue aligns after four register pushes, reserves 0x860 bytes,
// then builds the first world/view product at stack base +0xa0.
export function mcmRenderProductAddress(entryEsp){return (((entryEsp-16)&0xfffffff0)-0x7c0)>>>0;}
