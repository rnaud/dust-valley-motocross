// Wine 11 command handler RVA 1b5d50. Invalidation effects are a separate stage;
// calls include the return-address writes made by CALL, excluding the tail JMP.
export function mcmRenderBinding({slot, previous, value, handlerEntryEsp, moduleBase}) {
  if (!Number.isInteger(slot) || slot < 0 || slot > 5) throw new RangeError('Unsupported binding slot');
  const calls = [];
  const call = (state, returnRva) => calls.push({state, store: {
    address: (handlerEntryEsp - 24) >>> 0, value: (moduleBase + returnRva) >>> 0
  }});
  if (!(previous >>> 0) && (value >>> 0)) call(slot === 5 ? 0x17e : slot + 0x167, 0x1b5dfc);
  call(slot === 5 ? 0x17d : slot + 0x162, 0x1b5d98);
  calls.push({state: slot === 5 ? 0x17f : 0x16c, store: null});
  return {binding: value >>> 0, calls};
}
