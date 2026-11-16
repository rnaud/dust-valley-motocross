import { measureMcmTerrainNode } from './terrain-node-distance.js';

function service(env, name) {
  if (typeof env[name] !== 'function') throw new Error('Unconnected terrain node service: ' + name);
  return env[name];
}

// Original 48aa50. Allocation release remains a required service: clearing a
// pointer without performing its release/accounting is not equivalent.
export function clearMcmTerrainNode(address, env) {
  const node = env.node(address);
  const get = offset => node.getUint32(offset, true);
  const put = (offset, value) => node.setUint32(offset, value >>> 0, true);
  const parent = get(0x58);
  if (parent) {
    const state = env.node(parent);
    const remaining = (state.getUint32(0x1ac, true) - ((get(0x1a0) + get(0x1ac)) >>> 0)) | 0;
    state.setUint32(0x1ac, Math.max(remaining, 0), true);
  }
  for (const offset of [0x1a0, 0x1a4, 0x1a8]) put(offset, 0);
  node.setUint8(0x182, 0);
  node.setUint8(0x181, 0);
  if (get(0x54)) for (let i = 0; i < 256; i++) {
    const child = env.u32(get(0x54) + i * 4);
    if (child) clearMcmTerrainNode(child, env);
  }
  for (const offset of [0x1b8, 0x1bc]) {
    const pointer = get(offset);
    if (pointer) {
      service(env, 'free')(address, pointer);
      for (const delta of [0, 8, 16]) put(offset + delta, 0);
    }
  }
  put(0x1ac, 0);
  put(0x190, 0);
  put(0x188, 0);
  put(0x194, 65535);
  put(0x18c, 65535);
}

// Original 48d500, including lazy child loading. Virtual callbacks use the
// vtable captured after measuring distance, even if a callback changes it.
export function selectMcmTerrainNode(address, resource, transform, recurse, env) {
  const node = env.node(address);
  const get = offset => node.getUint32(offset, true);
  const put = (offset, value) => node.setUint32(offset, value >>> 0, true);
  const distance = measureMcmTerrainNode(node, env.owner(get(0x5c)));
  const vtable = get(0);
  service(env, 'callVirtual')(vtable + 0x14, address, Math.fround(distance));
  if (node.getInt32(0x1c, true) <= node.getInt32(0x188, true) && get(0x1b4)) {
    if (node.getUint8(0x181)) return;
    node.setUint8(0x181, 1);
    node.setUint8(0x182, 1);
    if (get(0x54) && recurse) for (let i = 0; i < 256; i++) {
      const child = env.u32(get(0x54) + i * 4);
      if (child) clearMcmTerrainNode(child, env);
    }
    return;
  }
  if (node.getUint8(0x181)) {
    node.setUint8(0x181, 0);
    node.setUint8(0x182, 1);
  }
  if (!get(0x34)) return;
  if (!get(0x54)) {
    put(0x54, service(env, 'allocate')(1024));
    put(0x38, service(env, 'allocate')(1024));
    service(env, 'seek')(resource, get(0x34), 0);
    service(env, 'read')(get(0x38), 1024, 1, resource);
    for (let i = 0; i < 256; i++) {
      const offset = env.u32(get(0x38) + i * 4);
      let child = 0;
      if (offset) {
        service(env, 'seek')(resource, offset, 0);
        child = service(env, 'callVirtual')(vtable + 0x10, address, resource, 0, address);
      }
      env.put32(get(0x54) + i * 4, child);
    }
  }
  if (recurse) for (let i = 0; i < 256; i++) {
    const child = env.u32(get(0x54) + i * 4);
    if (child) selectMcmTerrainNode(child, resource, transform, 1, env);
  }
}
