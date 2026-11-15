# Post-smoothing camera reset and override

`finishMcmChaseSmoothing` recovers `0x47d606..0x47d71f`, immediately after the six smoothing updates. It returns the eye and target that enter world-bounds and terrain-clearance processing, and retains the resulting target for the next frame's base calculation.

When the previous camera mode is 6, the original copies the current mode, sets the eye-reset/override flag, and resets all six filter values and times. The time is float32 0.25 for actor type 1 and 0.3 otherwise. Filter upper/lower fields survive. Both eye and target become their unsmoothed values, regardless of the previous-target flag. For other previous modes, a nonzero override flag replaces the eye and replaces the target only when the previous-target flag is clear.

The isolated oracle matches 864 cases / 27,648 words, including the live previous-mode sentinel 999. A fresh nine-boundary capture matches 60 retained frames: 720 spatial words, 3,120 downstream words and 1,920 post-block words. This capture follows the pass-through branch (mode 0, previous mode 999, override flag 0). It does not demonstrate live reset/override transitions. Independent cleanup verified all nine instruction sequences and no debugger attachment.

The analyzer accepts `--post` for nine-boundary captures. It checks post-block output, all filters, mode/flag state, unchanged input fields and stack identity; the corrected target and mode carry to the next source/base entry. Regression tests reject output corruption, dropped stages and altered retained mode.

## Reproduction

Generate new cases with `node scripts/mcm-reference/generate-chase-post-smoothing.mjs NEW_INPUT.bin`. Compile `chase-post-smoothing-oracle.c` as 32-bit Windows, optimization off, image base `0x10000000`, dynamic base disabled. Verify the pinned executable hash, then run the oracle under the reference Wine prefix with `mcm.exe INPUT.bin OUTPUT.bin`. `compareChasePostSmoothing` compares the binary result; the retained raw data is in `tests/fixtures/mcm/chase-post-smoothing-wine11.json.br`.

`capture-chase-post-smoothing.c` adds the guarded non-CALL `0x47d71f` boundary to the existing controller capture. Only one debugger may run at a time. Check original instruction bytes and detachment independently after every capture.

Next is `0x47d71f` onward: special-world bounds, terrain clearance and pitch correction, then camera setters and view/render scheduling. This block alone does not resolve the negative-steering scratch dependency or establish full physics parity. It does not change preview handling.
