import assert from '../../src/physics/mcm/captured-invariants.js';
// Camera finalization (47d945 / 47dbde) and mesh drawing address the same
// mesh +12c word. Keep that alias live rather than copying at frame boundaries.
export function connectWorldCameraVisibility(meshes, roots, initialFlags, state) {
  assert.equal(roots.length, 2);
  assert.equal(initialFlags.length, 2);
  assert.equal(new Set(roots).size, 2, 'Camera visibility roots overlap');
  const bindings = roots.map((address, index) => {
    const matches = [...meshes.actors.values()].filter(actor => actor.node.address === address);
    assert.equal(matches.length, 1, 'Missing or ambiguous camera visibility mesh');
    const mesh = matches[0].mesh;
    assert.equal(mesh.hidden, initialFlags[index], 'Camera/mesh initial visibility differs');
    return {address, mesh, index};
  });
  for (const {mesh, index} of bindings) Object.defineProperty(mesh, 'hidden', {
    enumerable: true,
    get: () => state()?.nodes[index].flag12c ?? initialFlags[index],
  });
  return new Map(bindings.map(({address, mesh}) => [address, () => mesh.hidden]));
}
