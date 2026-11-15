// Pinned Wine 11 wined3d RVAs f2f20/f2f70 and 144e40.
export function createMcmRegisterHeap(capacity) {
  return {nodes: new Uint32Array((capacity + 1) * 2), present: new Uint32Array(capacity),
    positions: new Uint32Array(capacity), next: 1};
}

export function mcmUpdateRegisterHeap(heap, register, priority) {
  register >>>= 0; priority >>>= 0;
  if (register >= heap.present.length) throw new RangeError('Register outside backend heap');
  let index;
  if (heap.present[register]) index = heap.positions[register];
  else { index = heap.next++; heap.present[register] = 1; }
  // The native routine only moves upward, even when a priority decreases.
  while (index > 1) {
    const parent = index >>> 1;
    if (heap.nodes[parent * 2 + 1] >= priority) break;
    const key = heap.nodes[parent * 2];
    heap.nodes[index * 2] = key;
    heap.nodes[index * 2 + 1] = heap.nodes[parent * 2 + 1];
    heap.positions[key] = index;
    index = parent;
  }
  heap.nodes[index * 2] = register;
  heap.nodes[index * 2 + 1] = priority;
  heap.positions[register] = index;
}

export function mcmApplyUploadBackend(heaps, callback, priority) {
  if (!callback) return;
  const heap = callback.slot === 0x14 ? heaps.vertex : callback.slot === 0x18 ? heaps.pixel : null;
  if (!heap) throw new RangeError('Unknown upload backend slot');
  const start = callback.start >>> 0, end = (start + callback.count) >>> 0;
  if (start >= end) return;
  if (end > heap.present.length) throw new RangeError('Upload range outside backend heap');
  for (let register = start; register < end; register++) mcmUpdateRegisterHeap(heap, register, priority);
}
