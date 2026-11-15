// Wine 11 USER32 RVA 2240d through measured-line dispatch. Other text-layout
// branches are returned to the caller, never treated as completed drawing.
export function mcmHudMeasuredLineStores({frameBase, fit, count, format}) {
  const writes = [{address: (frameBase - 0x8ac) >>> 0, value: 0}];
  if ((fit >>> 0) < (count >>> 0)) return {branch: 'overflow', writes};
  if (format & 0x8000) return {branch: 'prefix', writes};
  for (const offset of [0x89c, 0x87c, 0x8b8]) writes.push({address: (frameBase - offset) >>> 0, value: 0});
  return {branch: 'draw', writes};
}
