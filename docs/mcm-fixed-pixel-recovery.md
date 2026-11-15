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
validation. Insertions require the explicit creation inputs and initial metadata
described below; unexplained later changes remain rejected.

## Native cache insertion recovery

`shader-cache-insert.js` implements the pinned `12fe0` insertion routine: duplicate
rejection, parent/child links, rotations, recoloring and root blackening. An
isolated oracle executes the intact native routine with its caller-supplied
unsigned-key comparator and logging disabled. Across 2,048 sequences of sixteen
attempts, all 32,768 attempts / 2,129,920 output words match. The cases include
3,087 duplicate keys. Repeat native output is byte-identical. Each step compares
the root and every node's parent, left, right and flags, including untouched nodes.

This recovers insertion mechanics, not allocation or shader compilation. The
42-frame capture below supplies initial parent/color metadata and validates the
subsequent topology against computed insertions. Older fixtures without that
metadata still cannot establish insertion coverage; unexplained changes remain
strict failures.

## Creation joined to the retained world replay

A completed 42-frame, 278-hook capture now validates 109 vertex descriptors,
235 pixel descriptors and 235 complete program selections. Two pixel-cache
misses consume separately captured allocation and GL shader-ID returns. The
model copies its computed descriptor and applies the recovered insertion routine;
subsequent root, parent, child, key, ID and color snapshots are comparisons only.
All 2,341 pixel-cache and 3,210 final program-cache comparisons match.

Both final program misses lead to the expected sampler setup: 16 formats,
48 callbacks and 32 overlapping register saves. The shader and world fixtures
share capture hashes and compare their formatter event sequences directly. Their
computed writes feed 42 retained bike frames and 41 rider ticks with zero physics
differences, 41 modeled caller words and zero observed scratch substitutions.
The sequence accelerates through frame 39, steers negatively from frame 20, and
releases throttle for frames 40–41. Removing the formatter writes fails at
interval 22 (`1064500121` versus native zero).

Negative tests reject missing allocation/compilation inputs, changed descriptor
bytes, absent initial color data, and modified post-insertion colors. They also
verify that insertion never mutates captured snapshots. Both the executed
configuration and repository verifier confirm all 278 hooks restored and no
attached debugger.

Allocation/GL IDs, initial graphics/cache state, inherited seed bytes and outer
invocation scheduling remain boundaries. The older 400-frame steering failure
is not closed. A separate completed combined capture exposed a frame-0 write
inside scene child `422f50`; that callback exits before its drawing path in this
successful sample. Its active writing path remains unresolved. These are
controlled trace results, not full-world or preview parity.

## Remaining scope

The five-frame sample contains no cache-creation misses; the longer sample covers two insertions. Initial cache contents/topology, graphics-state fields and remaining temporary-buffer seed bytes are still boundary inputs. Allocation and GL compilation, full caller scheduling, the active scene-child writer and the older frame-38 steering divergence remain unresolved. This is a joined shader-key recovery milestone, not a new whole-ride physics equivalence result. Preview handling is unchanged.

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
and independent verifier both compile with the updated configuration. The
completed 278-hook capture verifies buffered diagnostics live. Never attach a
second debugger while a capture is active.

For the joined trace, build `capture-fixed-pixel-tree.c` and
`verify-fixed-pixel-tree.c`; the wrapper selects 84 records and the 278-hook
configuration. It includes initial parent/color fields, creation boundaries,
formatter callbacks and scene-child call boundaries. Run
`node --test tests/mcm-fixed-pixel-insertion-live.test.js` for the retained chain.
