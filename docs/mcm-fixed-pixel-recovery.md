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

Both fixed-function cache analyzers now retain the initial tree and node contents.
Later snapshots are comparisons, not new inputs. In the five-frame fixture this
retains six vertex nodes and 4,726 pixel nodes across all lookups. Unexplained
changes, including changes to nodes outside the current comparison path, fail
validation. Cache insertion remains unmodeled and is rejected if it changes a
later snapshot.

## Native cache insertion recovery

`shader-cache-insert.js` implements the pinned `12fe0` insertion routine: duplicate
rejection, parent/child links, rotations, recoloring and root blackening. An
isolated oracle executes the intact native routine with its caller-supplied
unsigned-key comparator and logging disabled. Across 2,048 sequences of sixteen
attempts, all 32,768 attempts / 2,129,920 output words match. The cases include
3,087 duplicate keys. Repeat native output is byte-identical. Each step compares
the root and every node's parent, left, right and flags, including untouched nodes.

This recovers insertion mechanics, not allocation or shader compilation. The
existing live descriptor fixtures omit parent/color metadata, so insertion is
not yet joined to their replay. A subsequent capture must supply that initial
metadata, then validate later topology against computed insertions. The strict
cache-snapshot rejection remains in place until that integration is proven.

## Remaining scope

The five-frame sample contains no cache-creation misses. Initial cache contents/topology, graphics-state fields and the remaining temporary-buffer seed bytes are still boundary inputs. Cache allocation/creation, full caller scheduling and the older frame-38 steering divergence remain unresolved. This is a joined shader-key recovery milestone, not a new whole-ride physics equivalence result. Preview handling is unchanged.

## Reproduction

- Build `fixed-pixel-descriptor-oracle.c` with 32-bit MinGW and run against the pinned Wine DLL. Its fixture preserves inputs, outputs, source/DLL hashes and repeated-output hashes.
- Build `capture-fixed-pixel.c` / `verify-fixed-pixel.c` with the same toolchain. Use the established ten-record scripted runner and preflight/cleanup sequence. Never attach concurrently with another debugger.
- Run `node --test tests/mcm-fixed-pixel-descriptor.test.js tests/mcm-fixed-pixel-live.test.js`.

- Run `node --test tests/mcm-fixed-program-chain.test.js` for the joined selection chain.

## Capture throughput and longer runs

The capture's default remains ten records (five bike updates). Compile with
`-DMCM_RENDER_RECORD_COUNT=84` to request 42 updates using the same hooks;
the runtime record-count argument must match. Render diagnostics use a 64 KiB
buffer, flushed before each debugger continuation. A failed flush enters the
existing cleanup path. This changes diagnostic I/O, not native hook locations.

An isolated Wine stdio comparison produced identical 489,685-byte streams with
unbuffered and buffered output (SHA-256
`e0c4232f7aadb4903940390e48508991da6d0163dcfa5d1505c23ffd0572918a`).
The sample took 1,059 ms and 13 ms respectively. These are formatting/I/O timings,
not whole-capture performance or simulation-equivalence measurements. The capture
and independent verifier both compile with the updated configuration. Live
buffered-capture verification remains pending while the prior unbuffered capture
is running; do not attach a second debugger to test it.
