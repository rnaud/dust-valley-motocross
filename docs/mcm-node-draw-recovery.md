# Player-rider draw dispatch and recursive stack depth

A fresh trace identifies the original player rider as the model whose draw overwrites the physics scratch word. This extends the retained renderer proof into the original scene hierarchy. The screen-bounds result is still observed, not recovered, and controlled steering remains unresolved.

## Original routines

`0x4465b0` tests node `+0x12c`. A hidden node skips drawing. Otherwise `+0x18c` selects ordinary rendering versus virtual fallback; `+0x190` controls whether preparation at `0x444ab0` precedes drawing at `0x445870`. Every path sets `+0x180` to 1 and returns 1, ignoring callee return values. `dispatchMcmNodeDraw` recovers this control flow; it delegates the three callees rather than pretending their internals are implemented.

The caller is `0x44faf0`, acting on actor `+0x404`. It calculates projected bounds through `0x47e8a0`; acceptance leads to the node call returning at `0x44ff64`. Rejection skips that call. Both paths then traverse children through `0x4206c0`. Thus rejecting a parent does not suppress the child traversal.

The wrapper reserves `0xd8` bytes and pushes four registers (`0xe8` total). Its child traversal adds a return address, two saved registers, and a virtual-call return address: the nested child wrapper enters exactly `0xf8` (248) bytes below its parent. The node enters `0xec` bytes below wrapper entry, and world draw enters another 8 bytes below node entry. These offsets follow the disassembly and are checked against fresh native execution.

## Identity and computed visibility

Each node-entry observation reads the player bike node at player `+0x434`, and rendered rider node through player `+0xc8c` then rider `+0x434`. The physics rider at `+0x874` is a different object. Every overlapping renderer store lies inside the identified player-rider node call.

The retained camera analyzer now exposes a copy of its computed node state alongside computed matrices. The new analyzer compares node visibility against that computed state, without supplying observed node visibility as the prediction. The first two node entries precede the first computed camera and are excluded from this comparison.

## Validation

- 625 native dispatcher cases / 1,875 output words / zero differences: 500 hidden, 80 prepared draws, 20 preparation-plus-draw, 25 virtual fallback.
- The isolated oracle executes the intact dispatcher but replaces preparation/draw entry points with recording stubs and supplies a recording virtual fallback. It proves dispatch order, pending flag and return value, **not** callee rendering behavior.
- Fresh 60-update trace: 240 complete wrapper calls, 120 bounds rejections, 120 node calls, 120 checked recursive child depths, 118 computed visibility comparisons.
- All 59 exact scratch stores occur inside the player-rider draw. The joined proof still checks 58 following bike-entry values.
- This history has 4,765 Wine apply calls, 287 products and 4,478 skips; counts vary with live timing and are not fixed scheduler constants.
- All 43 non-CALL hooks independently verified restored; debugger absent after capture.

Mutation tests reject changed visibility, recursive depth, bounds decisions, node identity and event ordering. Live coverage here is visible, prepared player nodes. Hidden/preparation/fallback dispatch branches are covered by the isolated native oracle, not by this live ride.

## Remaining dependencies

Recover `0x47e8a0` projected-bounds arithmetic and the original wrapper's matrix/bounds inputs, the linked child traversal, model bucket/draw internals and graphics call stack below `0x445870`. The current proof observes bounds acceptance and renderer apply entries. The rider's recursive depth is now derived, but the complete physics scratch address is not yet predicted from the game's top-level render entry. Then join retained player/world state to camera inputs and replay negative steering without observed scratch. Default preview handling is unchanged.

## Reproduction

Compile `node-draw-oracle.c` with the same pinned 32-bit MinGW/image-base setup as the earlier oracles. `generate-node-draw.mjs NEW_INPUT.bin` produces four DWORD fields per case: hidden, pending, renderable, prepared. Oracle output is return value, pending flag, and ordered call code (base-4 digits: prepare=1, draw=2, fallback=3). Compare with `compareNodeDraw`.

Compile `capture-node-draw.c` with `-O0 -Wall -Wextra -Werror`, verify pinned executable/Wine hashes, all instruction guards and debugger absence, then invoke `PID OUTPUT.jsonl 60`. Independently verify all 43 instructions and detachment afterward. No CALL or REP instruction is single-stepped. The compressed fixture contains raw oracle input/output, capture rows, SHA-256 and cleanup evidence. `analyzeNodeDraw(rows, originalDunesTerrain)` reproduces the joined result.
