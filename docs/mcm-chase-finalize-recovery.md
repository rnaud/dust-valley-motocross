# Camera pose, roll and bike/rider node finalization

`finalizeMcmChaseCamera` recovers `0x47d945..0x47d9f4` and inactive node handling at `0x47dbde..0x47dc06`. Active cameras write the computed eye and roll through original `0x47a240`, then aim through `0x47a3d0`. Mode 3 with the local enabled flag uses the rounded product of bike `+0x4e8` and `+0x4d8` as roll. Both bike and render-rider nodes get `+0x12c=1` and eight zeroed words at `+0x240..0x25c`. Other paths clear `+0x12c` only; inactive cameras preserve their pose. The render rider comes from bike `+0xc8c`, distinct from the physics rider pointer at `+0x874`.

The isolated oracle executes those original instructions and intact setters/node helpers. **2,048 cases / 63,488 words match**, including all eight modes, active/enabled combinations, coincident target/eye, vertical aiming and nonzero initial node data. Only immediate-mode camera state is supported; retained-mode forwarding fails explicitly. Audio listener globals are excluded.

## Live chain and retention boundary

A fresh eleven-boundary capture matches 60 ordinary mode-0 frames through the native final pose: 1,860 additional words, alongside 720 spatial, 3,120 downstream, 1,920 post-smoothing and 480 clearance words. Finalization consumes the recovered clearance eye and retained target, not observed setter arguments. Camera pose/orientation flags and both node records are seeded once and checked at subsequent source entries. All eleven hooks were independently verified restored with the debugger detached.

**Refresh-counter continuity is not claimed.** `0x479e40` checks camera `+0x28`, then decrements nonzero `+0x1bc` at `0x479e53..0x479e5e`. The later FOV setter can also write that counter. The analyzer explicitly takes only this counter as a source-entry boundary input and reports 60 such inputs. It verifies that counter unchanged up to finalization and verifies the setter's resulting counter exactly. This is a bounded finalization check, not a completed retained renderer loop. Tests reject changed retained pose/node data, changed finalized outputs, and missing stages.

Live coverage is active mode 0, with zero roll; inactive/mode-3 coverage comes from the isolated oracle. Original FOV smoothing (the seventh filter), action-11 mode transitions, the full `0x479e40` update, view/render scheduling, and the negative-steering frame-38 discrepancy remain open. Preview handling is unchanged.

## Reproduce

Generate fresh input with `node scripts/mcm-reference/generate-chase-finalize.mjs NEW_INPUT.bin`. Compile `chase-finalize-oracle.c` using 32-bit MinGW, `-O0 -Wall -Wextra -Werror -Wl,--image-base,0x10000000 -Wl,--disable-dynamicbase`. Run under the reference Wine prefix with `mcm.exe INPUT.bin OUTPUT.bin`; compare with exported `compareChaseFinalize`. Inputs are 43 words, outputs 31 words per case. The compressed fixture retains both raw streams.

After executable-hash and instruction checks, `capture-chase-finalize.c PID NEW_CAPTURE.jsonl 60` observes the live active path. Inactive frames skip the final hook and are not supported by this capture sequence. Independently verify hook restoration and debugger detachment after capture. Analyze with `node scripts/mcm-reference/analyze-live-chase-controller.mjs CAPTURE.jsonl --terrain COURSE.trn --finalize`.
