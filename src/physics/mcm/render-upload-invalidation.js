// Wine 11 wined3d RVA 1b4d60: command 33 callback dispatch and context flags.
// Backend callbacks execute before the context flag writes. Their side effects
// are deliberately outside this model, not assumed to be no-ops.
export function mcmRenderUploadInvalidation(command, contextFlags) {
  if (command.length !== 5 || command[0] !== 33) throw new RangeError('Expected upload command 33');
  const [, kind, offset, count, flags] = Uint32Array.from(command);
  let callback = null;
  if (kind === 0 || kind === 1) callback = {slot: kind === 0 ? 0x14 : 0x18, start: offset, count};
  if (kind === 6 || kind === 7) {
    const start = offset >>> 4;
    // Native adds 16 even at aligned endpoints; all additions wrap at 32 bits.
    const end = ((offset + count + 16) >>> 0) >>> 4;
    callback = {slot: kind === 6 ? 0x14 : 0x18, start, count: (end - start) >>> 0};
  }
  return {callback, contextFlags: Uint32Array.from(contextFlags, value => value | flags)};
}
