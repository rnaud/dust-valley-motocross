import { mcmAdd, mcmSubtract, mcmMultiply } from './x87-arithmetic.js';

// Original 48cf50. Projection and detail selection are explicit services;
// observations must never replace the retained node allocations supplied here.
export function traverseMcmTerrain(address, resource, transform, center, extent, x, y, size, depth, index, env) {
  const node = env.node(address);
  const get = offset => node.getUint32(offset, true);
  const put = (offset, value) => node.setUint32(offset, value >>> 0, true);
  const requireService = name => {
    if (typeof env[name] !== 'function') throw new Error('Unconnected terrain traversal service: ' + name);
    return env[name];
  };
  const childAt = (parent, column, row) => {
    const table = env.node(parent).getUint32(0x54, true);
    if (!table) throw new Error('Missing terrain child table');
    return env.u32(table + 4 * (env.rowOffsets[row] + column));
  };
  const select = (child, recurse) => requireService('select')(child, resource, transform, recurse);
  const project = (c, e, inside = true) => {
    env.boundsTests = (env.boundsTests + 1) >>> 0;
    return requireService('projectBounds')(address, transform, c, e, inside);
  };
  let count = 0, changed = false, visible = true, complete = false;
  if (size > 1) {
    const result = project(center, extent);
    visible = !!result.visible;
    complete = result.inside === 8;
    if (size === 16) {
      if (visible) {
        select(address, 0);
        if (node.getUint8(0x181)) {
          count = 1;
          if (!get(0x184)) { put(0x184, 1); changed = true; }
          return finish();
        }
      }
      put(0x184, 0);
    }
  }
  if (visible) {
    if (complete) {
      for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
        const child = childAt(address, x + column, y + row);
        if (!child) continue;
        const state = env.node(child);
        if (!state.getUint32(0x184, true)) {
          state.setUint32(0x184, 0x1fffff, true);
          changed = true;
          const table = state.getUint32(0x54, true);
          if (table) for (let i = 0; i < env.childCount; i++) {
            const descendant = env.u32(table + i * 4);
            if (descendant) env.node(descendant).setUint32(0x184, 0x1fffff, true);
          }
        }
        select(child, 1);
        count++;
      }
      if (depth === 0) put(0x184, 0x1e);
      else if (depth === 1) put(0x184, get(0x184) | (0x1e0 << ((index << 2) & 31)));
    } else {
      size >>= 1;
      if (size) {
        const half = [Math.fround(mcmMultiply(extent[0], 0.5)), extent[1], Math.fround(mcmMultiply(extent[2], 0.5))];
        for (let quadrant = 0; quadrant < 4; quadrant++) {
          const east = quadrant & 1, south = quadrant & 2;
          const nextCenter = [
            Math.fround((east ? mcmAdd : mcmSubtract)(center[0], half[0])),
            center[1],
            Math.fround((south ? mcmAdd : mcmSubtract)(center[2], half[2])),
          ];
          count = (count + traverseMcmTerrain(address, resource, transform, nextCenter, half,
            x + (east ? size : 0), y + (south ? size : 0), size, depth + 1, (index << 2) + quadrant, env)) | 0;
        }
      } else {
        const child = childAt(address, x, y);
        if (child) {
          const state = env.node(child);
          if (state.getUint32(0x54, true)) {
            const vec = offset => [0, 4, 8].map(i => state.getFloat32(offset + i, true));
            count = traverseMcmTerrain(child, resource, transform, vec(0x1ec), vec(0x1f8), 0, 0, 16, 0, 0, env);
          } else {
            const vec = offset => [0, 4, 8].map(i => state.getFloat32(offset + i, true));
            let accepted;
            if (env.sphereEnabled && !state.getUint32(0x20, true)) {
              env.sphereTests = (env.sphereTests + 1) >>> 0;
              accepted = requireService('projectSphere')(address, transform, vec(0x1ec), get(0x20c));
            } else accepted = project(vec(0x1ec), vec(0x1f8), false).visible;
            if (accepted) {
              if (!state.getUint32(0x184, true)) { state.setUint32(0x184, 0x1fffff, true); changed = true; }
              select(child, 0);
              count = 1;
            } else if (state.getUint32(0x184, true)) { state.setUint32(0x184, 0, true); changed = true; }
          }
        }
      }
      if (size === 8) size = 16;
    }
    if (size === 16) {
      if (!count) put(0x184, 0);
      else if (!get(0x184)) changed = true;
    }
  } else {
    for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
      const child = childAt(address, x + column, y + row);
      if (child && env.node(child).getUint32(0x184, true)) {
        env.node(child).setUint32(0x184, 0, true);
        changed = true;
      }
    }
  }
  if (visible) {
    if (depth === 0) put(0x184, get(0x184) | 1);
    else if (depth === 1 || depth === 2) put(0x184, get(0x184) | ((depth === 1 ? 2 : 32) << (index & 31)));
  }
  return finish();

  function finish() {
    if (changed) {
      let current = address;
      while (current) {
        const state = env.node(current);
        state.setUint8(0x182, 1);
        current = state.getUint32(0x58, true);
      }
    }
    return count;
  }
}
