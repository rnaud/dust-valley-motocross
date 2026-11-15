# Camera world bounds and terrain clearance

`applyMcmChaseClearance` recovers `0x47d71f..0x47d945`. It clamps eye X/Z when the original world-mode/enabled gate is active, calls the recovered `0x411340` terrain-height query, raises the eye to terrain plus 3.5 original units when needed, adjusts negative camera pitch, and applies the original scene-specific maximum heights when the terrain raise did not run.

The world gate is `(manager+0x1072 uint16)==3 && manager+0x724!=0`. Bounds use camera `+0x250` multiplied by 3 and 253. The lower Z comparison uses the previously rounded lower bound; the X lower comparison precedes that rounding. The height-raise comparison likewise precedes storage rounding. Pitch correction uses the stored raised height. Scene names use the original ASCII case-insensitive comparison: Pyrmid01 caps at 200; Stddom01 and excav01 at 120; other scenes use 60 in the four corner regions outside 50/206 scale thresholds and 90 elsewhere. Height caps compare signed float bit patterns.

## Evidence

The oracle runs the original camera block with its **intact original terrain query**, loading original Canyon and Dunes sample banks and hierarchy through the existing native course loader. Host allocation/stdio and renderer-only initialization follow that loader's established substitutions; camera decisions and terrain query return values are not stubbed. Original name comparisons execute in the ASCII locale path.

Each course matches 4,096 cases / 24,576 words, for 8,192 cases / 49,152 words total. Inputs cover ordinary/special world modes, enabled/disabled gates, mixed-case scene names, boundary coordinates, terrain-clearance thresholds, positive/negative/signed-zero pitch, and three positive radii. Coverage includes 370 bound changes, 2,458 eye raises, 934 eye caps and 820 pitch changes. These are finite-input cases, not exhaustive exceptional-value coverage.

A fresh ten-boundary capture matches 60 retained frames through the clearance exit. It verifies the native ground-query result from original Dunes data, eye, pitch and world gate, in addition to prior camera state. Live coverage is world mode 0, with no eye or pitch correction; special-world and correction branches are isolated-oracle coverage. The unused scene-name field contains `stddom01`; it is not used as proof of the active terrain identity. All ten original instructions were independently verified restored, with no debugger attached.

## Reproduction and remaining work

Generate new cases with `node scripts/mcm-reference/generate-chase-clearance.mjs COURSE.trn NEW_INPUT.bin`. Compile `chase-clearance-oracle.c` for 32-bit Windows with optimization off, image base `0x10000000`, dynamic base disabled. Verify the executable/course hashes, then run under the reference Wine prefix with `mcm.exe COURSE.trn INPUT.bin OUTPUT.bin`. The input starts with the existing 16-byte course header and decoded banks, then 48-byte cases. `compareChaseClearance` takes the case portion and the raw 24-byte-per-case output. The retained fixture is `chase-clearance-wine11.json.br`.

Analyze a ten-boundary capture with `node scripts/mcm-reference/analyze-live-chase-controller.mjs CAPTURE.jsonl --terrain COURSE.trn`. `capture-chase-clearance.c` uses guarded non-CALL boundaries and restores its hooks; independently verify restoration and debugger detachment afterward.

Next recover active-camera pose/roll and bike/rider visibility decisions after `0x47d945`, then final setters, view construction and renderer scratch-writer order. The known frame-38 steering divergence and whole-world parity remain unresolved. Preview handling is unchanged by this milestone.
