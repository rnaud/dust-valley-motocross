// Original 423a10. Device and drawing work remain explicit services; each
// pointer is loaded at the same point as the original, after callbacks.
export function refreshMcmSceneDisplay(address, memory, services) {
  const invoke = (name, ...args) => {
    if (typeof services[name] !== 'function') throw Error('Unconnected scene display refresh service: ' + name);
    return services[name](...args);
  };
  const surface = () => memory.u32(memory.u32(address + 0x30) + 0x18);
  const error = (result, line) => { invoke('error', result, 0x4e2f74, line); return 0; };
  invoke('rectangle', address, address + 0xd0);
  const acquired = invoke('acquire', surface());
  if (!acquired || !Number.isInteger(acquired.result)) throw Error('Missing display acquire result');
  if (acquired.result) return error(acquired.result, 0x270);
  if (!Number.isInteger(acquired.dc)) throw Error('Missing display device context');
  const dc = acquired.dc;
  invoke('backgroundColor', dc, 1);
  invoke('backgroundMode', dc, 1);
  invoke('textColor', dc, 0xffffff);
  const mode = memory.i16(memory.u32(0x4e4fb4) + 0x1072);
  const methods = [0x423d20, 0x4243e0, 0x423f80, 0x423ce0, 0x424900];
  if (mode >= 0 && mode <= 4) invoke('draw', address, methods[mode], dc);
  const released = invoke('release', surface(), dc);
  if (!Number.isInteger(released)) throw Error('Missing display release result');
  if (released) return error(released, 0x287);
  invoke('blit', address, 0, 0x5b, 0xffff);
  invoke('present', memory.u32(address + 0x30));
  return 1;
}
