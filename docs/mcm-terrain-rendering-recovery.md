# Original terrain rendering recovery

This work supports the original map port. It does not establish whole-world physics or rendering parity, and the preview still uses Dust Valley ground shading.

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

## Next integration

Package indexed textures and palettes alongside the lazy-loaded course resources. Render each physical leaf using its original texture index, tile index and orientation, preserving the existing physical height queries. Verify texture seams, axis orientation and original screenshots before calling the map appearance matched. Handle the texture-index `-1` fallback separately; its runtime placeholder and non-leaf rendering behavior are not represented by the UV fixture. Skies, scenery, exact starts and full-world simulation remain separate open items in the asset ledger.
