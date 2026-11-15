// Pinned Wine state-application subgraph 1c0398..1c03e3. Generated shader
// branches are explicit boundaries, not silently treated as no binding.
export function mcmRenderBindingGates({dirty108, adapterFlags, pixelShader, vertexShader, declaration, transformed}) {
  const commands = [];
  if ((dirty108 & 8) && (!(pixelShader >>> 0) || !(declaration >>> 0) || (transformed & 255))) {
    if (adapterFlags & 0x40) return {commands, boundary: 'generated-pixel'};
    commands.push({slot: 1, value: 0, callerRva: 0x1c1238});
  }
  if ((dirty108 & 16) && !(vertexShader >>> 0)) {
    if (adapterFlags & 0x40) return {commands, boundary: 'generated-vertex'};
    commands.push({slot: 0, value: 0, callerRva: 0x1c1674});
  }
  return {commands, boundary: 'continue'};
}

// Synchronous command submission on the pinned, 16-byte-aligned apply stack.
// This does not describe asynchronous command-stream execution.
export function mcmApplyBindingStack(applyEntryEsp) {
  const aligned = ((applyEntryEsp - 16) & ~15) >>> 0;
  return {producerEntryEsp: (aligned - 0x864) >>> 0,
    handlerEntryEsp: (aligned - 0x890) >>> 0,
    storeAddress: (aligned - 0x8a8) >>> 0};
}
