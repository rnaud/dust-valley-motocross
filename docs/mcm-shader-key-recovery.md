# Shader-key producer recovery

## Fixed-function vertex descriptor

The intact pinned Wine `wined3d` routine `1d8600` matches all 8,192 isolated cases: 360,448 output bytes, with byte-identical repeated native output. It clears and produces the complete 44-byte descriptor. No function bodies or dependencies are replaced; diagnostic logging is disabled.

The model preserves both transformed and untransformed geometry paths, material-source bitfields, eight light slots, fog branches, texture-coordinate index/mask rules, capability flags and stream flags. Inputs are explicitly mapped to their original offsets in `fixed-vertex-descriptor.js`; they are still boundary inputs, not a recovered graphics-state producer.

This descriptor feeds the fixed-function vertex cache used to select one of the six program-key words. The completed live shader-key trace uses this fixed-function path with null programmable shaders. Its vertex descriptor/cache connection is validated below; the pixel descriptor and state producers remain outstanding.

## Programmable shader variant lookup

The vertex/pixel variant lookup models match 4,096 native cases: 2,428 hits and 1,668 creation boundaries. Repeated native output is byte-identical. The vertex path masks the cached first DWORD (not the query), ignores the top two bits of byte 21 and bytes 22–23, and compares the other relevant fields. The pixel path compares all 52 query bytes. Both return the first matching entry; duplicate-match cases validate ordering.

The oracle preserves lookup and hit-return instructions at `725a0` and `71020`, binds the actual UCRT `memcmp`, and patches six creation entry boundaries to return an explicit sentinel. Consequently these tests validate lookup selection only, not shader allocation/compilation or miss handling. Early live frames do not invoke these programmable helpers; their isolated coverage is not evidence for the fixed-function path.

## Remaining integration

Recover and join the fixed-function descriptor inputs, both shader caches, creation paths and six-word assembly to program selection, then to ordered world writes and sustained physics. The known older frame-38 steering divergence remains unresolved. This milestone does not change preview handling.

Run `node --test tests/mcm-fixed-vertex-descriptor.test.js tests/mcm-shader-variant-cache.test.js`. Compressed fixtures include native inputs/outputs, source/DLL hashes and repeat hashes. The C oracle sources document the exact scope and bounded creation branches.

## Live descriptor-to-cache connection

A completed five-frame capture validates 12 computed vertex descriptors, 24 native cache comparisons, 12 hits and all 12 resulting vertex program-key words. The analyzer uses descriptor input fields to compute the query, rather than using the observed descriptor as its query. The native comparator compares 44 unsigned bytes lexicographically; comparison signs drive left/right traversal. The cache's program ID becomes the predicted first program-key word.

Initial cache contents/topology and graphics-state fields remain captured inputs. This sample contains no creation miss and does not validate that path. Negative tests reject changed descriptor inputs, observed descriptor bytes and selected program IDs. All 253 observation hooks were independently verified restored with no debugger attached; the repository capture configuration also passes that verification. Build `capture-fixed-vertex.c` / `verify-fixed-vertex.c` with the 32-bit MinGW toolchain and use the established ten-record scripted capture settings.

The preceding 42-frame key trace also checks 235 assemblies, 126 reused vertex IDs and 705 unchanged middle-stage fields. All programmable shader pointers are null and neither programmable variant helper is called in that run. These are key-selection observations, not a new sustained physics parity result.
