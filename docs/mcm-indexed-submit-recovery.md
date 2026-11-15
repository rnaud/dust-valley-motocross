# Indexed draw submission gate

Recovered pinned Wine wined3d `1c3ed0`, the indexed-draw submission reached from ddraw `ec33`. This is the route into the backend window containing the unresolved zero overwrite, not a recovery of the backend itself.

The function retains the context's state pointer, conditionally locks when the context is the device's immediate context, and emits only when state `+190` (index buffer) is nonzero. Emission receives state `+1a4`, state `+1a8`, the five incoming draw arguments and an indexed flag of one. It re-reads the immediate-context identity after emission (or skipping emission), then conditionally unlocks. An indexed count of zero does not itself suppress this gate's emission.

`submitMcmIndexedDraw` preserves those reads and call order. Lock, emit and unlock remain explicit callbacks, so their side effects and backend execution are not silently assumed. Debug logging is outside the model and disabled in the isolated oracle.

## Native validation

The isolated oracle executes intact `1c3ed0`, replacing only lock `1e16f0`, command emission `1c44e0` and unlock `1e1710` with recording callbacks. All 4,096 cases / 57,344 output words match. Cases cover both immediate/deferred contexts and both index-buffer predicates, signed/unsigned argument boundaries and pseudorandom words. Callback cases toggle the index buffer during locking, remove the immediate-context identity during locking, and change that identity during emission. These mutations validate read timing and do not represent a claim that real mutex calls make those mutations.

Compile `scripts/mcm-reference/indexed-submit-oracle.c` with 32-bit MinGW. Run with the pinned wined3d DLL, input and output paths. Input is eight DWORDs: flags, state +1a4, state +1a8 and five draw arguments. Flags: bit 0 immediate, bit 1 index buffer present, bit 2 toggle buffer during lock, bit 3 clear immediate identity during lock, bit 4 toggle identity during emit. Output is 14 DWORDs: event count, three event slots (1 lock, 2 emit, 3 unlock), eight emitted arguments, final immediate predicate and final index-buffer predicate.

## Remaining connection

Live indexed-backend traces confirm dispatch to backend `62400`, but their entry metadata does not yet supply this gate's complete input state. The gate is not yet part of continuous world scheduling. Command allocation/serialization, dirty graphics state, backend effects, and the intermittent post-stateblock zero write remain unresolved. No observed scratch input has been added, and preview handling is unchanged.

## Two reproduced zero overwrites

A deeper 42-frame native trace completes 8,256 indexed draw windows. It reproduces the zero overwrite at intervals 22 and 23, both on the rider draw (ddraw ESP `0022f808`). Within each window, the word changes between wined3d `62a32` and `62a52` (backend body ESP `0022f680`), across the indirect call at `62a4f`. Before values are `1064500121` and `1064518239`; both become zero. The strict ordered-writer comparison rejects interval 22 instead of inserting zero.

Read-only inspection of the live device `0142a728` finds its callback table at `7a9babc0` and private state at `013d7fb8`. Table slot +8 resolves to `7a84c4c0` (wined3d RVA `dc4c0`), the shader-state application routine. The next trace must identify the exact store and its eligibility inside that routine, including its tail call to constant upload `e9d00`. Resolving a callback address is not equivalent to recovering its side effects.

`indexed-world-negative-wine11.json.br` retains the native inputs and selected observations, including all indexed boundaries. The census checks intermediate observations as well as final draw returns. Tests require both observed changes and the unresolved carry rejection. All 213 native hooks were restored and independent verification found no attached debugger.

The earlier 20-record focused run observed 1,955 backend calls without a surviving overwrite, including the same interval-8 stack and matrix word as the previous failing run. That non-reproduction did not close the failure: these partial checkpoints do not reset all retained graphics state or timing.

`capture-indexed-submit.c` reproduces the 84-record / 213-site configuration. Its extra sites are non-CALL/non-REP instructions; relocated absolute operands are guarded at the pinned live module base. Compile the independent verifier with the HUD, binding, binding-gate, upload-copy and indexed-submit capture macros. This diagnostic must not run alongside another debugger.

## Program-selection boundary

A completed 232-site native capture (84 bike records, 8,338 complete indexed
windows) narrows the zero write to interval 23 between wined3d RVAs `dc5d7`
and `dc601`, at body ESP `22f640`: `1064518239 → 0`. The intervening
program-selection call is at `dc5fc`, targeting `d3120`. The preceding two
selector callbacks resolve to literal RET routines in this pinned configuration.
The constant-upload tail is outside this observed write window.

`shader-draw-windows-wine11.json.br` retains the draw observations, raw trace
hash and independent verification that all 232 hooks were restored and the
debugger detached. This sample's next-bike world-writer comparisons pass:
later world writers can replace the shader-written zero. It identifies another
writer, not a newly demonstrated next-bike mismatch or a resolution of the
older negative fixtures.

The capture watchdog now treats guarded renderer boundaries as progress. An
initial dense probe run stopped after six bike records despite productive
renderer events; the revised run completed all 84. Menu RNG events still do
not refresh the watchdog. Deeper program-selection tracing remains pending;
preview handling is unchanged.

`capture-shader-apply.c` reproduces the 84-record / 232-site configuration.
It includes the indexed-submit hooks and adds shader call-return boundaries,
the shader entry and constant-upload entry. Compile the independent verifier
with the indexed-submit prerequisites plus `MCM_CAPTURE_SHADER_APPLY`.
The promoted configuration's addresses, guarded bytes, lengths and phase names
were compared with the completed capture and are identical. The base,
indexed-submit and shader variants all compile independently with 32-bit MinGW.
