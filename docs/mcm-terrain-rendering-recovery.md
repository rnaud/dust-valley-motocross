# Original terrain rendering recovery

This work supports the original map port. It does not establish whole-world physics or rendering parity, and does not yet reproduce the full original scene renderer.

## Recovered and checked

- The TRN resource reader now preserves the RGB palette, shared texture if present, each base texture and its serialized quarter-size mip level. It retains the hierarchy offset and original bytes. All 33 source-hash-verified course files parsed successfully: 1,068 textures, all indexed format 4. Per-course inventory is in `mcm-terrain-resources-validation.json`.
- Node deserialization at `0x48a3ce..0x48a403` maps serialized offsets 44, 48, 52 to runtime fields `+0x44`, `+0x48`, `+0x4c`. Texture index, orientation, the remaining raw field and tile index are retained without altering height samples.
- `0x4ba000` resolves `node+0x44` through the world's texture table. Mode 1 uses a full texture with a one-pixel inset. Other modes select one of sixteen subregions using the tile index. Texture dimensions determine the inset and local-coordinate scale.
- `0x48b4c7..0x48b6cb` computes UVs and applies one of eight flip/swap orientations. `src/mcm-terrain-uv.js` reproduces these operations with float32 storage boundaries.

The isolated Wine oracle executes the original texture setup routine and original UV instruction block, with the pinned executable and x87 control word `0x027f`. It changes only the private mapped copy's exit jump; the running game is not hooked. The retained fixture covers 1,024 cases / 5,120 output words with zero differences: modes 0 and 1, 128 and 256 square textures, eight tile indices, eight orientations, and four local sample positions. Other dimensions and exceptional inputs are not covered by this fixture.

Reproduce with the reference Wine prefix set:

```sh
WINEPREFIX="/path/to/reference/prefix" node scripts/mcm-reference/generate-terrain-uv-fixture.mjs "/path/to/game/mcm.exe"
node --test tests/mcm-terrain-data.test.js tests/mcm-terrain-uv.test.js
```

## Texture payload correction

Visual inspection exposed a grouping error in the first resource reader: texture groups store all base images followed by all half-size images, rather than alternating each base with its mip. The original low-detail skip at `0x4106e7..0x4106fb` advances over `count * width * height * pixelBytes`; the high-detail tail at `0x4108b1..0x4108e0` skips all half-size images together. The importer and boundary regression test now follow that layout. The earlier byte-preservation check did not prove image assignment and is superseded by this correction.

## Preview integration

Indexed textures, palettes and tile metadata are packaged in the lazy-loaded course resources. Both the coarse ground and dense patch use a shared atlas and leaf lookup in original terrain coordinates. The original base image and stored mip level are uploaded. This retains the existing physical height queries and sand deformation. Switching back to Classic restores its materials.

The material is a TSL `MeshStandardNodeMaterial` whose colour node resolves the leaf lookup and atlas sample in original terrain coordinates. The previous implementation patched `MeshStandardMaterial` through `onBeforeCompile`, which only the WebGL renderer invokes; after the move to `WebGPURenderer` that hook is never called, so the preview drew an untextured white surface. `tests/mcm-terrain-material.test.js` now asserts both preview materials are node materials with a colour node and leave `onBeforeCompile` untouched.

All 33 courses have valid populated leaf texture references; the native texture-index `-1` fallback is not needed for those leaves. The shader uses a neutral fallback for missing/outside data; this is not a recovery of the native placeholder. GPU arithmetic/filtering, coarse geometry resampling and lighting are not claimed bit-exact. Original screenshots, scene boundaries, skies, scenery, exact starts and full-world simulation remain open verification/integration work.
