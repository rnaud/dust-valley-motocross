# Chase FOV and camera refresh counters

`stepMcmChaseFov` recovers `0x47db8f..0x47dbd1`, including the intact immediate-mode `0x47a110` setter. The seventh filter uses the same x87 evaluation order as position smoothing. Its upper/lower bounds are not applied here. The setter preserves existing FOV for either signed-zero input, but always sets the refresh counter to owner counter plus one, with unsigned wraparound. Retained-mode forwarding remains unsupported.

`beginMcmCameraUpdate` implements only the prefix `0x479e40..0x479e76`: camera `+0x28` skips the update; otherwise nonzero `+0x1bc` and byte `+0x1b0` decrement independently. This is not the full camera update. Keyboard FOV/viewport controls and `0x47a670` remain outside this helper.

## Native evidence

The oracle executes original smoothing and the unmodified FOV setter, then the original update prefix. It exits at `0x479e76` before the remaining update. All **4,096 cases / 32,768 words match**, covering four positive filter times, eight timestep choices including zero/negative/equal-time, varied finite targets, zero-result FOV preservation, owner-counter wraparound, both skip states and all byte values. It preserves unused filter bounds. Arbitrary NaN payloads, zero filter time and complete update behavior are not claimed.

A fresh fourteen-boundary live capture matches **60 mode-0 camera-left-held frames**. The analyzer retains the seventh filter, actual FOV, refresh byte and refresh counter between frames. Finalization consumes the recovered eye/target; FOV smoothing consumes the retained camera target FOV. The later mode/FOV-control block must leave modeled controls unchanged or the analyzer rejects the capture. Therefore this capture covers the observed fixed mode/context path, not those unported transitions.

The previous finalization-only analyzer supplied the refresh counter from each source entry. With `--fov`, that input is removed: **refreshCounterBoundaryInputs=0**. Source-entry continuity and native FOV/update outputs match, in addition to prior spatial/controller/clearance/finalization checks. The counter-prefix result also matches after the full native update in these camera-left-held frames, but this does not prove that the remaining update is inert for other inputs or that its other output fields match. All fourteen instructions were independently verified restored, debugger detached.

## Reproduction

Generate cases with `node scripts/mcm-reference/generate-chase-fov.mjs NEW_INPUT.bin`. Compile `chase-fov-oracle.c` with 32-bit MinGW, optimization off, `-Wall -Wextra -Werror -Wl,--image-base,0x10000000 -Wl,--disable-dynamicbase`. Run with `mcm.exe INPUT.bin OUTPUT.bin` in the reference Wine prefix; use exported `compareChaseFov` on the raw buffers. Each input is 11 words, output 8 words. The fixture retains both buffers, raw live rows, executable/capture hashes, and cleanup evidence.

The guarded live tool is `capture-chase-fov.c PID NEW_CAPTURE.jsonl 60`. Independently verify cleanup. Analyze using `node scripts/mcm-reference/analyze-live-chase-controller.mjs CAPTURE.jsonl --terrain COURSE.trn --fov`.

Next recover the action-11 mode transitions, FOV/viewport input paths, full `0x47a670` camera/view refresh and renderer ordering. The frame-38 negative-steering discrepancy and full physics parity remain open. Preview handling is unchanged by this milestone.
