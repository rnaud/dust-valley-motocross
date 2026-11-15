# Projected screen bounds

Original `0x47e8a0..0x47ef06` is recovered as `projectMcmBounds`. The live rider-draw analysis now computes bounds acceptance and supplies that computed decision to node dispatch. Its input matrix, center/extents and viewport are still captured boundary inputs; connecting their producers to retained world state remains necessary for full physics parity.

## Arithmetic and branches

The routine receives a camera, 4×4 matrix, center, half-extents, optional rectangle and optional in-bounds-corner count. It forms eight center±extent corners through float-stored per-axis products, preserving the distinct addition order for Y. Outcodes test X/Y/Z against zero and W; their common bits determine rejection. Negative-zero and NaN comparisons follow the original raw-bit and x87 comparisons rather than ordinary geometric assumptions.

Without either output pointer, the routine can accept from a center-point shortcut or the first inside corner. With a rectangle, it projects all corners, rounds to integer pixels using x87 nearest-even conversion, clamps to viewport dimensions and adds viewport offsets with 32-bit wrapping. The first reciprocal is float-rounded; later reciprocals remain at the configured x87 arithmetic precision. Width and height convert as unsigned values, while final rectangle comparisons use signed integers. Rejection zeroes a requested rectangle but leaves the optional count unchanged. Accepted calls write the inside-corner count when requested.

Typed arrays preserve negative canonical NaNs through input decoding, intermediates and corner output. Ordinary JavaScript `Array.from` canonicalized some negative NaNs to positive during initial testing; the native oracle caught this. Arbitrary NaN payloads are not claimed covered.

## Native and live evidence

The oracle executes the intact leaf function with no patched instructions or callee stubs. It initializes its private global corner scratch before each call and compares that scratch as well as the return value and optional outputs.

- 8,192 cases / 311,296 words / zero differences; 2,076 accepted cases.
- Both optional outputs, rectangle-only, count-only and neither-output paths.
- Identity and randomized matrices; finite center/extents; zero/tiny/positive/negative/infinite/NaN W terms; canonical positive/negative NaNs; viewport dimensions zero, one, ordinary and unsigned/signed limits.
- Fresh 60-camera-update capture: all 240 live bounds decisions match (120 accepted, 120 rejected), plus 7,680 corner words and 960 rectangle words.
- The joined rider proof retains 59 exact physics-stack writes and 58 following bike-entry comparisons.
- All 44 non-CALL hooks independently verified restored; debugger absent after capture.

Mutation tests reject changed acceptance, corners, rectangles and missing entry observations. The first camera prefix remains explicitly excluded from computed-camera coverage, as in preceding milestones.

## Remaining dependencies

Bounds decisions are now computed, but the wrapper's input matrix and local bounds are observed. Recover its inline matrix product, node-local matrix retrieval (`0x4b7a00`) and animated bounds retrieval (`0x44f870`), then connect those to retained scene/player state. Linked render traversal and the graphics call stack below model drawing also remain incomplete. The known negative-steering frame-38 divergence is not fixed; normal preview handling is unchanged.

## Reproduction

Use the pinned executable SHA-256 `e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b` and Wine module hash recorded in preceding render milestones. Compile `projected-bounds-oracle.c` using the established 32-bit MinGW image-base setup. `generate-projected-bounds.mjs NEW_INPUT.bin` creates 8,192 records. Run the oracle with executable, input and output paths; compare using `compareProjectedBounds`.

Each 132-byte input has matrix (16 floats), center (3), extents (3), viewport X/Y/width/height (4 DWORDs), want-rectangle/count flags (2), initial rectangle (4 DWORDs) and initial count (1). Each 152-byte output has return, rectangle (4), count, then eight XYZW corner records. Corner scratch reflects projection only when a rectangle was requested and accepted; early returns leave unprocessed scratch zero in this isolated harness.

`capture-projected-bounds.c` extends the prior node capture with a guarded entry at `0x47e8a0`, filtered to the wrapper return `0x44feec`, and captures corners immediately at that return. Verify hashes, guards and debugger absence before invocation `PID OUTPUT.jsonl 60`, and all 44 restored instructions afterward. No CALL or REP instruction is single-stepped. The fixture retains raw native inputs/outputs, live rows, capture hash and cleanup evidence.
