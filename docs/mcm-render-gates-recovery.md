# Fog restoration and model world submissions

This milestone connects the previously separate camera-submission proof to the next camera update. It does not yet recover the complete draw scheduler or fix the negative-steering frame-38 divergence.

## Recovered behavior

Original fog entry `0x43e660` and render prefix `0x43e6c0` test object `+0x20`. When enabled they call the camera clip setter `0x47a190` with near 1 and object `+0x38` as far, rebuild matrices at `0x47a670`, and submit projection. The immediate setter clamps far downward to 100000; unordered comparisons preserve the supplied NaN. `applyMcmFogPlanes` reproduces this prefix. Retained-mode forwarding remains unsupported.

A third operation, `0x43ec50`, calls the already recovered default clip restoration `0x479fc0` and submits projection again. In the captured history, camera submission restores far 100000, fog rendering restores 768, this third operation restores 100000 again, and another fog render restores 768 before the next update. The earlier assumption of one restoration per cycle was incomplete.

Original `0x445870` checks global `0x4e4afc`, optionally prepares a node, constructs an identity matrix on its own stack, and submits it as game world type 1. Wine receives type 256. The analyzer checks the entry gate, matrix, pointer and original return address before allowing that identity to justify the renderer product. Other world setters invalidate this justification until a newly verified model submission occurs.

## Evidence

Pinned executable SHA-256: `e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b`.
Pinned Wine wined3d SHA-256: `25feee6100619bd123fc00568d4e5107a3a20d60f62d160e12c368731fa32f1c`.

- 4,096 isolated cases, 274,432 words, zero differences. The oracle calls the intact native clip setter and matrix builder on 2,730 enabled cases; disabled cases skip them in the harness and preserve sentinels. This is not an execution oracle for the whole fog render function. Distances include 768, the clamp boundary, above-boundary, zero, negative, infinities and NaN.
- Fresh 60-update live capture: 177 computed fog projections, 59 default resets, 59 exact matrix/plane restorations into the following camera update.
- 177 original model identity submissions matched to 177 Wine setters; all 59 overlapping renderer products have a verified identity source.
- The existing computed-camera proof independently matches 59 products and exact scratch stores, then 58 following player-bike entries. No observed scratch output is supplied to the simulation.
- 31 non-CALL instruction hooks independently verified restored; debugger absent after capture. Only EIP/trap flags change during observation.
- 28 startup events precede the first computed camera and are explicitly excluded. 105 other world setters are observed but not modeled; they invalidate known world state. This trace includes a terrain scale matrix before model draws, so global identity cannot be assumed.

The fixture stores native input/output, all live rows, capture hash and independent cleanup log. Mutation tests reject changed projections, identities, draw gates and missing original-to-Wine world submissions.

## Remaining dependency

The analyzer observes when draw operations execute. It does not yet predict their scheduling from retained world state. Recover the model visibility/bucket gates and Wine apply-state conditions, terrain/HUD setters and last-writer ordering, then connect camera inputs to the recovered player trajectory. Ddraw also adjusts the submitted projection before Wine receives it; those observed Wine projection words are not claimed as validated here. Neither normal preview handling nor the failing steering fixture is changed by this milestone.

## Reproduction

Compile `fog-planes-oracle.c` with the same pinned 32-bit MinGW/image-base setup as `camera-submission-oracle.c`. Generate its 68-byte records with `generate-fog-planes.mjs SUBMISSION_INPUT.bin NEW_INPUT.bin`, run the oracle against the pinned executable, and compare with `compareFogPlanes`. Record layout is the prior 64-byte submission input plus a DWORD enable flag. The far input at byte 48 supplies the fog distance; output retains the prior 67-word layout.

Build `capture-render-gates.c` with `-O0 -Wall -Wextra -Werror`. Verify hashes, live instruction guards and debugger absence first. Invoke with `PID OUTPUT.jsonl 60`; independently verify all 31 instruction sequences and debugger detachment afterward. Do not run a second debugger or single-step a CALL instruction. `analyzeRenderGates(rows, terrain)` consumes the capture and the decoded original Dunes terrain.
