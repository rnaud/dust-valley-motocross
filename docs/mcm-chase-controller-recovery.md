# Joined normal chase controller

`stepMcmChaseController` now joins source construction, backup restoration, the pre-input yaw gate, base construction, raw camera controls, heading selection, eye rotation and smoothing. Camera angles, flags, target, shared axis and filters carry between frames. The live analyzer checks both the staged calculations and this joined production path against the same original boundaries.

The eye gate belongs before controls. The saved key-pulse capture contains a frame where the updated yaw crosses 2 radians while the gate still reflects the entry yaw. Moving the gate after controls changes the original behavior. A dedicated regression retains this frame.

The entry oracle was rerun against the pinned executable: 2,560 cases / 15,360 words match. Saved captures (legacy fixture labels `idle` and `pulse`, both with keypad-left held) match 190 frames, 9,880 downstream words and 2,280 source/base words. Capture cleanup records in the fixture prove restoration of all eight hooks and debugger detachment. The pulse capture contains angle changes throughout; it does not contain a verified key-up frame. The earlier release check was OS-level only, not proof of neutral game input. A later matrix-chain capture verifies key mask 0 after releasing keypad-left; see `mcm-camera-matrices-recovery.md`.

## Reproduction

Generate a new binary input with `node scripts/mcm-reference/generate-chase-entry.mjs NEW_INPUT.bin`. Compile `scripts/mcm-reference/chase-entry-oracle.c` as 32-bit Windows with image base `0x10000000`, dynamic base disabled and optimization off. Run it under the reference Wine prefix with arguments `mcm.exe INPUT.bin OUTPUT.bin`. Verify the executable SHA-256 against the report before running. `compareChaseEntry` compares the raw binary input/output through the recovered helpers. The retained raw fixture and tests are `chase-controller-wine11.json.br` and `mcm-chase-controller.test.js`.

`capture-chase-controller.c` is the eight-boundary capture helper. It uses guarded non-CALL INT3 boundaries, only changes instruction-pointer/trap flags for stepping, and restores all hooks before detaching. Run only one debugger at a time and verify cleanup independently before continuing original play.

## Limits and next work

This is an initialized mode-0 live comparison. First initialization, alternate modes, post-smoothing overrides and terrain clearance, view construction and renderer scheduling remain incomplete. Source actor state, timing and other world-owned inputs still come from observed frame boundaries. This is not a self-contained whole-world simulation and does not close the frame-38 negative-steering scratch mismatch.

Next recover `0x47d606` onward: special-mode filter reset, eye/target overrides, world boundary and terrain clearance decisions, then feed the retained outputs into the existing target/view routines and renderer scratch writers in original order. Do not inject the observed scratch value as a replacement for that work. Preview handling is unchanged by this milestone.
