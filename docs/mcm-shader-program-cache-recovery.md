# Shader program cache recovery

## Native evidence — November 15, 2026

The pinned Wine 11 `wined3d` comparator at RVA `86760` matches all 4,096 isolated native cases. Repeated native execution produces identical output. Six unsigned DWORDs are compared in logical order **0, 3, 4, 1, 2, 5**; the corresponding node offsets are `18, 69c, 6a8, 6b8, 6c8, b74`. Cases cover each first differing field, equality and unsigned boundaries.

A completed 42-frame live trace records 363 lookups, 5,432 comparisons, 362 hits and one miss. The recovered traversal predicts every comparison, hit/miss and selected hit node. Negative comparison follows node `+4`, positive comparison follows `+8`. All 242 guarded sites were independently verified restored, with no debugger attached after capture.

The initial cache contains 4,032 entries. The miss returns a newly allocated program. Adding that key/address to retained membership exactly explains the next 4,033-entry snapshot. Subsequent snapshots are checked against retained membership rather than accepted as replacement membership. Tree topology remains observed. Tests reject missing comparisons, altered creation addresses, changed snapshot keys and observations without a lookup entry.

The only sampler setup occurs during that predicted miss at frame 23. Its eight sampler-name formats are distinguished from the 212 total formatter calls during program creation. Cache hits invoke no sampler setup in this capture. This recovers a cache eligibility condition upstream of the sampler stack writes established in `mcm-shader-sampler-format-recovery.md`.

## Scope and remaining work

This models the lookup branch `d3526..d355f`, not the whole shader-selection routine. The input key, initial tree, backend state and tree topology are captured boundaries. The zero-shader skip, key production, native allocation, shader creation and tree balancing/insertion instructions are not recovered by this change. Returned allocation addresses remain external inputs; retained membership only checks their subsequent use. Cache deletion or replacement is explicitly unsupported by the live analyzer rather than silently reseeded.

This capture does not include the complete C-runtime formatter stack instrumentation from the earlier 270-site capture. It validates eligibility and format counts, not a new end-to-end scratch-write or physics trajectory comparison. The older frame-38 steering divergence remains open. Preview handling is unchanged.

## Reproduction

- `shader-program-key-oracle.c` executes the intact pinned comparator. Its compressed fixture preserves inputs, native outputs, repeated-output hashes and DLL/source hashes.
- Build `capture-shader-cache.c` and `verify-shader-cache.c` with the existing 32-bit MinGW capture toolchain. They extend the shader-apply configuration to 242 guarded non-CALL/non-REP sites. Use the established scripted 84-record runner, live-process preflight and post-capture verifier; never attach a second debugger concurrently.
- `shader-program-cache-wine11.json.br` preserves the relevant ordered native records, capture hashes, terminal status and independent cleanup report. `analyze-shader-program-cache.mjs` checks them against the recovered model.
- Run `node --test tests/mcm-shader-program-cache.test.js`.
