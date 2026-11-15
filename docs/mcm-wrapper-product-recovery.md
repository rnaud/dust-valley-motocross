# Wrapper matrix product

The inline original block `0x44fb53..0x44feb6` is recovered as `composeMcmWrapperProduct`. Its x87 addition order differs from the other recovered matrix helpers. The output combines the camera combined matrix with the cached node-world matrix before projected bounds testing.

## Evidence

The isolated oracle executes the original instruction block with x87 control word 0x027f, supplying camera and world matrices in the original stack slots. It redirects control after the block to copy the 16 output words; arithmetic is not replaced. All **8,192 cases / 131,072 words match**, including varied exponents, identity matrices, signed zeros, infinities, canonical NaNs and subnormals. Arbitrary NaN payloads are not claimed covered.

A fresh 60-update neutral-camera capture observes wrapper inputs at the existing wrapper-entry hook. After the first computed camera update, the analyzer uses recovered camera state retained through fog and default-clip transitions. It computes **236 wrapper products / 3,776 words**, then verifies the bounds helper receives those products. Four startup products use observed camera state and are counted separately as warmup.

The joined analysis checks all 240 bounds decisions (120 accepted, 120 rejected), 7,680 corner words and 960 rectangle words, then retains the existing 59 rider stack writes and 58 following bike-entry checks. The actor center/extents and viewport are copied from their original source fields; viewport width also matches recovered camera state. All 44 hooks were independently verified restored and the debugger absent after capture.

Mutation tests reject changed world sources, camera matrices, actor bounds, viewport width, projected matrices and missing wrapper observations. The compressed fixture preserves native inputs/outputs, raw live rows, capture hash and cleanup evidence.

## Remaining scope

Cached node-world matrices and animated actor bounds remain observed boundary inputs. Their producers must be connected to retained player/animation state. The remaining render traversal and graphics call stack also require recovery. These captures are debugger-paced and do not establish normal-speed ride parity. The known negative-steering divergence at frame 38 remains unresolved; this milestone does not change preview handling.

## Reproduction

Use the pinned executable and Wine hashes recorded in the preceding render milestones. Compile `scripts/mcm-reference/wrapper-product-oracle.c` with the established 32-bit MinGW setup. Generate input with `generate-wrapper-product.mjs NEW_INPUT.bin`, run the oracle with executable/input/output paths, and compare using `compareWrapperProduct`. Each input contains 32 float words; each output contains 16.

`capture-wrapper-product.c` retains the preceding 44 guarded non-CALL hooks and adds source observations at wrapper entry. Invoke with `PID OUTPUT.jsonl 60` only after guard and debugger checks, then independently verify instruction restoration and detachment. `analyzeWrapperProduct(rows, terrain)` performs the joined validation. See `mcm-wrapper-product-validation.json` for the recorded report.
