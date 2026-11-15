# Fixed-function pixel descriptor recovery

## Intact native comparison

The recovered `1d7ec0` builder matches 8,192 native cases / 1,081,344 output bytes. Repeat execution is byte-identical. The oracle executes the intact builder and its `b04c0` texture-argument predicate; neither is stubbed.

Inputs cover all texture operations 0–26, zero through eight stages, absent views/resources, format/type flags, missing-texture argument fallbacks, fog selection, texture-coordinate masks, alpha-function bits and capability gates. Every output buffer is seeded with varied bytes. Unlike the vertex builder, this routine does not clear the complete buffer: active-stage bytes and certain unsupported fog-mode outputs retain prior content. Those semantics are included in the native comparison.

`fixed-pixel-input.mjs` decodes the compact 231-DWORD capture/oracle record. Pointer targets are represented by their relevant values; this does not recover their allocation or graphics-state producers.

## Joined live validation

A completed five-frame trace checks 28 computed pixel descriptors, 291 native cache comparisons, 28 hits and 28 selected pixel IDs in program-key word 4. The same trace validates 12 vertex descriptors and their selected IDs. For those 12 invocations, the model's preceding vertex descriptor supplies the first 44 bytes of the pixel temporary buffer: 528 bytes derived rather than sourced from observed seed bytes.

The pixel cache comparator `1d7e60` compares 132 bytes at node `+10`; the tree uses left/right pointers at `+4/+8`, and the program ID is at `+94`. Comparison signs and selected nodes are checked against the original. Tests reject changed upstream vertex inputs, missing vertex inputs, changed observed pixel descriptors and altered selected program IDs.

All 257 non-CALL/non-REP hook locations were independently verified restored and the debugger detached. The repository capture configuration also passed guard verification against the restored process.

## Joined final program selection

`analyze-fixed-program-chain.mjs` connects both descriptor/cache models to the final program-cache model. It derives all six key words: computed vertex/pixel IDs, retained middle-stage IDs and the native zero final word. On the same five-frame trace, all 28 final lookups, 407 comparisons and 28 returned programs match. Sixteen calls retain the previous vertex ID. Twenty-seven subsequent entries validate the selected program against the preceding return; they do not reseed that selection from each entry observation.

The initial 4,726-node program cache supplies the initial previous program key. Captured lookup keys and subsequent previous-program keys are assertions only. Tests reject even mutually consistent changes to captured assembly/lookup keys, changed retained selections, missing producers and unsupported paths. Current joined coverage requires null programmable shaders, unchanged middle stages, an existing previous program and pixel refresh. Other branches are rejected explicitly.

## Remaining scope

The five-frame sample contains no cache-creation misses. Initial cache contents/topology, graphics-state fields and the remaining temporary-buffer seed bytes are still boundary inputs. Cache allocation/creation, full caller scheduling and the older frame-38 steering divergence remain unresolved. This is a joined shader-key recovery milestone, not a new whole-ride physics equivalence result. Preview handling is unchanged.

## Reproduction

- Build `fixed-pixel-descriptor-oracle.c` with 32-bit MinGW and run against the pinned Wine DLL. Its fixture preserves inputs, outputs, source/DLL hashes and repeated-output hashes.
- Build `capture-fixed-pixel.c` / `verify-fixed-pixel.c` with the same toolchain. Use the established ten-record scripted runner and preflight/cleanup sequence. Never attach concurrently with another debugger.
- Run `node --test tests/mcm-fixed-pixel-descriptor.test.js tests/mcm-fixed-pixel-live.test.js`.

- Run `node --test tests/mcm-fixed-program-chain.test.js` for the joined selection chain.
