# Retained renderer dirty state and stack overlap

The renderer's world/view-product decision is now predicted from retained state across a fresh live history. This removes the need to assume that every draw writes the physics stack, or that identical matrix submissions avoid dirtying the renderer. It does not yet predict the original game's draw-call schedule.

## Recovered pinned-Wine behavior

In the pinned Wine 11 `wined3d.dll`, SetTransform at RVA `0x1f4500` unconditionally copies the matrix. View type 2 and world types above 255 execute RVA `0x1f4628`, setting bit 1 of stateblock byte `+0x108`. The value of the matrix does not gate this bit. Other transform types do not set this particular bit.

Apply entry RVA `0x1bd500` pushes four registers, aligns ESP to 16 bytes and reserves `0x860` bytes. The first temporary product is at aligned stack base `+0xa0`, hence `alignDown(entryESP - 16, 16) - 0x7c0`. The recovered address computation wraps as an unsigned 32-bit address.

RVA `0x1bffe3` tests the dirty bit and branches to the product call at `0x1c103d` only when set. The observed blend setting at stateblock `+0x2540` is zero; nonzero blending is rejected because it introduces additional products. At exit, `0x1c04db` clears 64 DWORDs starting at stateblock `+0xc`, including the dirty byte. The observer hooks the instruction after that repeated store; it does not single-step REP STOS or CALL.

`render-dirty.js` models the dirty-bit transition and stack address. `analyze-render-dirty.mjs` seeds the bit once per stateblock, processes subsequent setters and clears without reseeding, and checks every apply gate. It independently runs the prior computed-camera, fog-restoration, original identity-submission and exact-store analyses.

## Fresh execution evidence

- 60 neutral-camera updates; one stateblock seeded once.
- 760 SetTransform entry/exit pairs.
- 4,793 complete apply calls: 286 predicted products, 4,507 predicted skips.
- All 286 product destinations match the prologue-derived address.
- Exactly 59 destinations overlap the player scratch word. These correspond to all 59 observed exact stores and the existing 58 following bike-entry comparisons.
- 37 guarded non-CALL hooks restored; independent verifier reports debugger absent.

The capture includes warmup render work before the first computed camera. Dirty-state tracking covers that work, while the prior camera analysis explicitly excludes its uninitialized prefix. Counts of products therefore exceed the 59 products overlapping the physics scratch word.

Regression mutations reject changed flags at setter exit, gate, clear and apply exit; changed product addresses; missing products; and missing setter entries. This is live execution validation of the flag transitions, not an isolated native oracle for every possible stateblock configuration.

## Remaining work

The apply calls and their stack-entry addresses are observations. Recover which original scene/model/HUD calls produce them and how stack depth follows those calls. Then bind camera source inputs to retained recovered player/world state and rerun controlled steering without observed scratch injection. Other dirty bits, blend matrices, alternative graphics paths, HUD/AI ordering and the negative-steering frame-38 mismatch remain outside this proof. Default preview handling is unchanged.

## Reproduction and provenance

The pinned executable SHA-256 is `e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b`; wined3d SHA-256 is `25feee6100619bd123fc00568d4e5107a3a20d60f62d160e12c368731fa32f1c`. Verify these before capture.

Compile `capture-render-dirty.c` with 32-bit MinGW `-O0 -Wall -Wextra -Werror`. Verify instruction bytes and no attached debugger, then invoke `PID OUTPUT.jsonl 60`. Independently check all 37 instruction sequences and detachment after completion. Never run two debuggers or single-step a CALL. The fixture includes the raw rows, their SHA-256 and cleanup evidence. `analyzeRenderDirty(rows, terrain)` consumes it with original Dunes terrain.
