# Shader-key producer recovery

## Fixed-function vertex descriptor

The intact pinned Wine `wined3d` routine `1d8600` matches all 8,192 isolated cases: 360,448 output bytes, with byte-identical repeated native output. It clears and produces the complete 44-byte descriptor. No function bodies or dependencies are replaced; diagnostic logging is disabled.

The model preserves both transformed and untransformed geometry paths, material-source bitfields, eight light slots, fog branches, texture-coordinate index/mask rules, capability flags and stream flags. Inputs are explicitly mapped to their original offsets in `fixed-vertex-descriptor.js`; they are still boundary inputs, not a recovered graphics-state producer.

This descriptor feeds the fixed-function vertex cache used to select one of the six program-key words. The pending live shader-key trace's early frames use this fixed-function path with null programmable shaders. Live descriptor/cache integration and the pixel descriptor remain outstanding.

## Programmable shader variant lookup

The vertex/pixel variant lookup models match 4,096 native cases: 2,428 hits and 1,668 creation boundaries. Repeated native output is byte-identical. The vertex path masks the cached first DWORD (not the query), ignores the top two bits of byte 21 and bytes 22–23, and compares the other relevant fields. The pixel path compares all 52 query bytes. Both return the first matching entry; duplicate-match cases validate ordering.

The oracle preserves lookup and hit-return instructions at `725a0` and `71020`, binds the actual UCRT `memcmp`, and patches six creation entry boundaries to return an explicit sentinel. Consequently these tests validate lookup selection only, not shader allocation/compilation or miss handling. Early live frames do not invoke these programmable helpers; their isolated coverage is not evidence for the fixed-function path.

## Remaining integration

Recover and join the fixed-function descriptor inputs, both shader caches, creation paths and six-word assembly to program selection, then to ordered world writes and sustained physics. The known older frame-38 steering divergence remains unresolved. This milestone does not change preview handling.

Run `node --test tests/mcm-fixed-vertex-descriptor.test.js tests/mcm-shader-variant-cache.test.js`. Compressed fixtures include native inputs/outputs, source/DLL hashes and repeat hashes. The C oracle sources document the exact scope and bounded creation branches.
