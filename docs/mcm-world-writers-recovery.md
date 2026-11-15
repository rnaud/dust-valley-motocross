# Ordered world writes into bike caller scratch

The combined native capture now connects recovered HUD, SSE matrix, shader-binding and heap-free writers to all 41 following bike entries. Write values are computed from the stage inputs; observed store words and next-bike scratch values are comparisons only. An explicit replay option applies the computed stores after each world interval, before the next retained bike update.

This remains a **boundary-driven reconstruction**, not fully recovered world execution. The ordered draw/state-application invocations, their stack positions, prepared graphics state, camera matrices, font measurements and allocator results remain external inputs. The older negative-steering frame-38 failure does not contain these world observations and remains unresolved.

## Combined native evidence

The original ran 42 bike frames with throttle on frames 0–39, released on frames 40–41, and negative 0.25 steering from frame 20. The checkpoint restores local player state, not the whole world. All 174 guarded observation sites were independently verified restored, and the debugger was absent afterward.

- 8,386 applications, with all 310 shader-binding commands and their CALL stores matching.
- 1,876 resource uploads, 199,732 allocated bytes, with staging, free decisions, heap writes and post-upload commands matching the existing recovered models.
- 41 retained HUD-clock updates predict 41 refreshes and 82 measured-line calls/clears. Instrumentation makes every interval refresh in this capture; previous clock fixtures cover skips.
- 24 overlapping SSE writes are predicted from prepared dirty flags and application-relative product addresses. Values come from the camera view matrix and explicit identity world matrix.
- 28 overlapping binding CALL writes follow computed null-shader gates and stack layout.
- Four overlapping heap writes come from one particle application. Its four uploads are predicted from transform/auxiliary upload gates; successful allocation pointers remain boundary inputs.

The computed final writer matches all 41 next-bike scratch words: one heap interval, 23 SSE intervals, four binding intervals and 13 HUD intervals. These counts are test results, never frame-number rules used by the model.

For each application, the SSE, binding and heap stack offsets are distinct, so at most one family overlaps the target slot. The analyzer rejects conflicting families. It validates all observed writes against the computed list before carrying the computed result forward. It schedules HUD lines using the retained clock and requires both lines within the matching refresh interval.

## Physics connection

`compareLiveRetainedRiderFrames` accepts an explicit `worldCallerWrites` callback after the rider/pool world events. The callback returns ordered `{address, value}` stores; only the recovered caller slot is supported. Mixing this option with observed-scratch diagnostics is rejected. The report identifies `callerScratchMode: modeled-world`, counts computed stores separately and retains the boundary-input limitation.

The combined regression computes the writer results, then applies 41 computed final stores to the retained replay. It checks computed bike/rider geometry against native wrapper geometry, derives 82 culling decisions and checks all 24 SSE values. Rider culling begins at frame 24 and bike culling at frame 28, as derived from geometry rather than forced by frame index.

Results: 42 bike frames, 41 rider ticks, zero modeled physics differences, **881,090 visual differences**. No observed caller scratch words are supplied. The different initial checkpoint and only two throttle-release frames prevent claiming broad trajectory or release parity.

Negative regressions alter paired SSE outputs, HUD/heap stores, both next-entry observations, or remove an invocation. All are rejected. Unsupported world addresses and mixing observed/model modes are rejected as well.

## Reproduction

Compile `capture-world-writers.c` with 32-bit MinGW. It combines the existing 174 observation sites with metadata reads at the existing HUD-clock boundaries and requires exactly 84 records. It uses the same scripted capture environment as `capture-binding-gates.c`, with checkpoint, environment, animation, collision, retained-rider and render-trace output paths. Use a checkpoint belonging to the current original process; this is not a process-independent world save.

Compile `verify-render-heap.c` with `MCM_CAPTURE_HUD_LINE_STORES`, `MCM_CAPTURE_RENDER_BINDING` and `MCM_CAPTURE_BINDING_GATES`, and run the independent verification after capture. Never run a second debugger concurrently. The fixture preserves the raw trace hashes, initialization, physics/rider/pool records, selected render records, capture result and cleanup evidence.

## Remaining work

Recover invocation scheduling and stack placement from the scene/node/HUD call graph, retain graphics dirty state instead of taking each prepared state as input, and derive camera evolution from recovered world state. Then validate longer acceleration/release and opposite-steering runs, including the known frame-38 failure, without these stage inputs. Preview handling is unchanged by this diagnostic milestone.
